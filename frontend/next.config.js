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
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
      },
    ]
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/assets',
        permanent: false,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.auth0.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
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
    ]
  },
}

module.exports = nextConfig
