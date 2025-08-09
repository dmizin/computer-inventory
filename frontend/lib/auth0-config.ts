// lib/auth0-config.ts
import React from 'react';
import { UserProvider } from '@auth0/nextjs-auth0/client';

export const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

// Mock user for development when auth is disabled
export const mockUser = {
  sub: 'dev-user',
  name: 'Development User',
  email: 'dev@localhost',
  picture: '/api/placeholder/avatar',
  email_verified: true,
  updated_at: new Date().toISOString(),
};

// Auth0 configuration
export const auth0Config = {
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  baseUrl: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  secret: process.env.AUTH0_SECRET || '',
  audience: process.env.AUTH0_AUDIENCE || '',
  scope: process.env.AUTH0_SCOPE || 'openid profile email',
};

// Check if Auth0 is properly configured
export const isAuth0Configured = () => {
  if (!isAuthEnabled) return true; // Always valid when auth is disabled

  return !!(
    auth0Config.domain &&
    auth0Config.clientId &&
    auth0Config.clientSecret &&
    auth0Config.secret &&
    auth0Config.baseUrl
  );
};

// Conditional Auth Provider wrapper
export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  if (isAuthEnabled) {
    return <UserProvider>{children}</UserProvider>;
  }

  // Return children without auth provider when auth is disabled
  return <>{children}</>;
}
