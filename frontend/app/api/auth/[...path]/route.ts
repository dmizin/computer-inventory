// app/api/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Get the backend API URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000'

// Helper function to create headers
function createHeaders(request: NextRequest) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Copy relevant headers from the original request
  const relevantHeaders = [
    'authorization',
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

// Generic proxy handler for all HTTP methods
async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const url = new URL(request.url)

  // Build target URL
  const targetUrl = `${API_BASE_URL}/api/v1/${path}${url.search}`

  console.log(`[API Proxy] ${request.method} ${request.url} -> ${targetUrl}`)

  try {
    const headers = createHeaders(request)

    // Prepare request options
    const requestOptions: RequestInit = {
      method: request.method,
      headers,
    }

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.text()
        if (body) {
          requestOptions.body = body
        }
      } catch (error) {
        console.warn('[API Proxy] Could not read request body:', error)
      }
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
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
    ]

    headersToInclude.forEach(headerName => {
      const value = response.headers.get(headerName)
      if (value) {
        responseHeaders.set(headerName, value)
      }
    })

    // Handle different response types
    const contentType = response.headers.get('content-type')
    let responseBody

    if (contentType?.includes('application/json')) {
      try {
        const jsonData = await response.text()
        responseBody = jsonData
      } catch (error) {
        console.error('[API Proxy] Error reading JSON response:', error)
        responseBody = JSON.stringify({
          error: 'Failed to parse response from backend',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } else {
      responseBody = await response.text()
    }

    console.log(`[API Proxy] Response: ${response.status} ${response.statusText}`)

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('[API Proxy] Request failed:', error)

    const errorResponse = {
      error: 'Backend API unavailable',
      details: error instanceof Error ? error.message : 'Unknown error',
      target_url: targetUrl,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(errorResponse, {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}

// Export handlers for all HTTP methods
export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}

export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context)
}
