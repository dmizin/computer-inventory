// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import EnhancedNavigation from '@/components/EnhancedNavigation'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    template: '%s | Computer Inventory System',
    default: 'Computer Inventory System'
  },
  description: 'Track and manage IT assets, users, applications, and infrastructure inventory',
  keywords: ['inventory', 'asset management', 'IT infrastructure', 'servers', 'hardware tracking'],
  authors: [{ name: 'Your Organization' }],
  creator: 'Computer Inventory System',
  publisher: 'Your Organization',
  robots: {
    index: false, // Set to true in production if you want search indexing
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <div id="app-root" className="min-h-screen">
          <EnhancedNavigation>
            <main id="main-content">
              {children}
            </main>
          </EnhancedNavigation>
        </div>

        {/* Development tools */}
        {process.env.NODE_ENV === 'development' && (
          <div id="dev-tools" className="fixed bottom-4 right-4 z-50">
            <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              DEV MODE
            </div>
          </div>
        )}
      </body>
    </html>
  )
}
