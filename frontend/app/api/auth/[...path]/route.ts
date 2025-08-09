// app/api/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0'
import { isAuthEnabled } from '@/lib/auth0-config'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to create headers
async function createHeaders(request: NextRequest) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add authentication if enabled
  if (isAuthEnabled) {
    try {
      const { accessToken } = await getAccessToken(request, NextResponse.next())
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
    } catch (error) {
      console.warn('Failed to get access token for API request:', error)
    }
  }

  // Copy relevant headers from the original request
  const relevantHeaders = [
    'accept',
    'accept-language',
    'cache-control',
    'user-agent',
  ]

  relevantHeaders.forEach(headerName => {
    const value = request.headers.get(headerName)
    if (value) {
      headers[headerName] = value
    }
  })

  return headers
}

// Generic proxy handler
async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = new URL(request.url)

  // Build target URL
  const targetUrl = `${API_BASE_URL}/api/v1/${path}${url.search}`

  try {
    const headers = await createHeaders(request)

    // Prepare request options
    const requestOptions: RequestInit = {
      method: request.method,
      headers,
    }

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestOptions.body = await request.text()
    }

    // Make the request to the backend
    const response = await fetch(targetUrl, requestOptions)

    // Create response headers
    const responseHeaders = new Headers()

    // Copy relevant response headers
    const headersToInclude = [
      'content-type',
      'cache-control',
      'etag',
      'last-modified',
    ]

    headersToInclude.forEach(headerName => {
      const value = response.headers.get(headerName)
      if (value) {
        responseHeaders.set(headerName, value)
      }
    })

    // Add CORS headers for development
    if (process.env.NODE_ENV === 'development') {
      responseHeaders.set('Access-Control-Allow-Origin', '*')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }

    // Get response body
    const responseBody = await response.text()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('API proxy error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to proxy request to backend API',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Create authenticated or open handlers based on auth configuration
const createHandler = (method: string) => {
  const baseHandler = (request: NextRequest, context: any) => {
    if (request.method !== method) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    }
    return handleRequest(request, context)
  }

  // For mutation operations (POST, PATCH, DELETE), require authentication if enabled
  if (isAuthEnabled && ['POST', 'PATCH', 'DELETE'].includes(method)) {
    return withApiAuthRequired(baseHandler)
  }

  return baseHandler
}

// Export all HTTP methods
export const GET = createHandler('GET')
export const POST = createHandler('POST')
export const PATCH = createHandler('PATCH')
export const PUT = createHandler('PUT')
export const DELETE = createHandler('DELETE')

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
