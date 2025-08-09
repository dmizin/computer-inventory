// app/api/placeholder/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  // Generate a simple SVG avatar
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#E5E7EB"/>
    <circle cx="16" cy="12" r="5" fill="#9CA3AF"/>
    <path d="M6 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#9CA3AF"/>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
