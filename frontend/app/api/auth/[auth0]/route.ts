// app/api/auth/[auth0]/route.ts
import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthEnabled, auth0Config } from '@/lib/auth0-config'

// Only create handlers if auth is enabled
if (isAuthEnabled) {
  const { GET, POST } = handleAuth({
    login: handleLogin({
      authorizationParams: {
        audience: auth0Config.audience || undefined,
        scope: auth0Config.scope,
      },
    }),

    logout: handleLogout({
      returnToURL: auth0Config.baseUrl,
    }),

    callback: handleCallback({
      afterCallback: async (req, session, state) => {
        // Custom logic after successful login
        console.log('User logged in:', session.user.email);
        return session;
      },
    }),

    profile: handleProfile({
      refetch: true,
    }),
  });

  export { GET, POST };
} else {
  // When auth is disabled, provide mock handlers for development
  export async function GET(request: NextRequest, { params }: { params: { auth0: string } }) {
    const { auth0: route } = params;

    switch (route) {
      case 'login':
        // Mock login - redirect back to where they came from
        const returnTo = request.nextUrl.searchParams.get('returnTo') || '/assets';
        return NextResponse.redirect(new URL(returnTo, request.url));

      case 'logout':
        // Mock logout - redirect to home
        const logoutReturnTo = request.nextUrl.searchParams.get('returnTo') || '/';
        return NextResponse.redirect(new URL(logoutReturnTo, request.url));

      case 'me':
        // Return mock user profile
        return NextResponse.json({
          sub: 'dev-user',
          name: 'Development User',
          email: 'dev@localhost',
          email_verified: true,
          picture: '/api/placeholder/avatar',
        });

      default:
        return NextResponse.json(
          { error: 'Authentication is disabled in development mode' },
          { status: 400 }
        );
    }
  }

  export async function POST(request: NextRequest) {
    return NextResponse.json(
      { error: 'Authentication is disabled in development mode' },
      { status: 400 }
    );
  }
}
