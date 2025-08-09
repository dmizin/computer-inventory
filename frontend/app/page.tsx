'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ComputerDesktopIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/use-auth'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Redirect to assets page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/assets')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="text-center space-y-8">
      <div>
        <ComputerDesktopIcon className="mx-auto h-16 w-16 text-blue-600" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Computer Inventory System
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Track and manage your computer assets, hardware specifications, and management controllers
        </p>
      </div>

      {!isLoading && (
        <div className="max-w-lg mx-auto">
          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Welcome back, <span className="font-medium">{user.name || user.email}</span>
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => handleNavigate('/assets')}
                  className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                  View Assets
                </button>

                <button
                  onClick={() => handleNavigate('/dashboard')}
                  className="flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please sign in to access the inventory system
              </p>

              <a
                href="/api/auth/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      )}

      {/* Features overview */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Inventory Management Features
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <ComputerDesktopIcon className="mx-auto h-12 w-12 text-blue-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Asset Tracking
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Track servers, workstations, network devices, and storage systems with detailed specifications
            </p>
          </div>

          <div className="text-center">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-green-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Management Controllers
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Manage out-of-band access via iLO, iDRAC, IPMI, and Redfish controllers
            </p>
          </div>

          <div className="text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-purple-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Reporting & Analytics
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Get insights into your infrastructure with detailed reports and analytics
            </p>
          </div>
        </div>
      </div>

      {/* Auto-redirect notice */}
      <div className="mt-8 text-sm text-gray-500">
        <p>Redirecting to assets page in a moment...</p>
      </div>
    </div>
  )
}
