/** @type {import('next').NextConfig} */

// Environment variable validation
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

if (isAuthEnabled) {
  const requiredVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
  ]

  const missing = requiredVars.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    console.warn('⚠️  Auth0 is enabled but missing required environment variables:')
    missing.forEach(varName => console.warn(`   - ${varName}`))
    console.warn('   Authentication will not work properly!')
  }
} else {
  console.info('ℹ️  Authentication is disabled for development')
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  experimental: {
    serverComponentsExternalPackages: [],
  },

  env: {
    CUSTOM_APP_NAME: 'Computer Inventory System',
  },

  async rewrites() {
    const rewrites = [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
      },
    ];

    // Only add Auth0 API routes if authentication is enabled
    if (process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true') {
      // Auth0 routes are handled by @auth0/nextjs-auth0 automatically
      // No additional rewrites needed for auth routes
    }

    return rewrites;
  },

  async redirects() {
    return [
      // Redirect root to assets page
      {
        source: '/',
        destination: '/assets',
        permanent: false,
      },
    ];
  },

  images: {
    domains: [
      'localhost',
      // Add Auth0 avatar domains
      's.gravatar.com',
      'cdn.auth0.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Environment variable validation
  async buildMetadata() {
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

    if (isAuthEnabled) {
      const requiredVars = [
        'AUTH0_SECRET',
        'AUTH0_BASE_URL',
        'AUTH0_ISSUER_BASE_URL',
        'AUTH0_CLIENT_ID',
        'AUTH0_CLIENT_SECRET',
      ];

      const missing = requiredVars.filter(varName => !process.env[varName]);

      if (missing.length > 0) {
        console.warn('⚠️  Auth0 is enabled but missing required environment variables:');
        missing.forEach(varName => console.warn(`   - ${varName}`));
        console.warn('   Authentication will not work properly!');
      }
    } else {
      console.info('ℹ️  Authentication is disabled for development');
    }
  },
}

module.exports = nextConfig
