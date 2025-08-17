// app/error.tsx
'use client'

import { useEffect } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            Something went wrong!
          </h1>
          <p className="mt-4 text-base text-gray-500">
            An unexpected error occurred. Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-left">
              <h3 className="text-sm font-medium text-red-800">Error Details (Development)</h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-mono">{error.message}</p>
                {error.digest && (
                  <p className="mt-1 text-xs">Error ID: {error.digest}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center space-x-4">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Try again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}
