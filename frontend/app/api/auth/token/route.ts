// app/api/auth/token/route.ts
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthEnabled } from '@/lib/auth0-config'

// Only create the authenticated handler if auth is enabled
const authenticatedHandler = isAuthEnabled
  ? withApiAuthRequired(async function handler(req: NextRequest) {
      try {
        const { accessToken } = await getAccessToken(req, NextResponse.next(), {
          scopes: ['openid', 'profile', 'email']
        });

        return NextResponse.json({
          accessToken: accessToken || null
        });
      } catch (error) {
        console.error('Error getting access token:', error);
        return NextResponse.json(
          { error: 'Failed to get access token' },
          { status: 500 }
        );
      }
    })
  : null;

export async function GET(request: NextRequest) {
  // If auth is disabled, return a mock token or no token
  if (!isAuthEnabled) {
    return NextResponse.json({
      accessToken: null,
      message: 'Authentication disabled in development mode'
    });
  }

  // If auth is enabled but not properly configured, return an error
  if (!authenticatedHandler) {
    return NextResponse.json(
      { error: 'Authentication not properly configured' },
      { status: 500 }
    );
  }

  // Call the authenticated handler
  return authenticatedHandler(request);
}
