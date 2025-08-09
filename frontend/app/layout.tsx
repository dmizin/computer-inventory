import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConditionalAuthProvider, isAuthEnabled } from '@/lib/auth0-config'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Computer Inventory System',
  description: 'Track and manage computer assets, hardware specifications, and management controllers',
  keywords: ['inventory', 'assets', 'computers', 'hardware', 'management'],
  authors: [{ name: 'Computer Inventory System' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full`}>
        <ConditionalAuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>

            <footer className="bg-white border-t border-gray-200 py-4">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <p>
                    Computer Inventory System v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                  </p>
                  <div className="flex items-center space-x-4">
                    {!isAuthEnabled && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Development Mode
                      </span>
                    )}
                    <p>&copy; 2025 Your Organization</p>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ConditionalAuthProvider>
      </body>
    </html>
  )
}
