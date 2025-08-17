// lib/auth0-config.ts

// Check if Auth0 is enabled based on environment variables
export const isAuthEnabled = !!(
  process.env.AUTH0_SECRET &&
  process.env.AUTH0_BASE_URL &&
  process.env.AUTH0_ISSUER_BASE_URL &&
  process.env.AUTH0_CLIENT_ID &&
  process.env.AUTH0_CLIENT_SECRET
)

// Auth0 configuration (only used if auth is enabled)
export const auth0Config = {
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  scope: 'openid profile email',
  audience: process.env.AUTH0_AUDIENCE || '',
}
