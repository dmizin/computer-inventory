'use client'

import { clsx } from 'clsx'

// Basic spinner component
export function Spinner({ size = 'md', className = '' }: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <svg
      className={clsx(
        'animate-spin text-blue-600',
        sizeClasses[size],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Loading button component
export function LoadingButton({
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}: {
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
  [key: string]: any
}) {
  return (
    <button
      disabled={loading || disabled}
      className={clsx(
        'relative inline-flex items-center justify-center',
        (loading || disabled) && 'cursor-not-allowed opacity-50',
        className
      )}
      {...props}
    >
      {loading && (
        <Spinner size="sm" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
    </button>
  )
}

// Full page loading component
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-64 py-12">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}

// Table skeleton loader
export function TableSkeleton({
  rows = 5,
  columns = 6
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  {rowIndex === 0 && (
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Card skeleton loader
export function CardSkeleton({
  showHeader = true,
  showFooter = false,
  lines = 3
}: {
  showHeader?: boolean
  showFooter?: boolean
  lines?: number
}) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      {showHeader && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className={clsx(
              'h-4 bg-gray-200 rounded animate-pulse',
              index === lines - 1 ? 'w-2/3' : 'w-full'
            )} />
          </div>
        ))}
      </div>

      {showFooter && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
        </div>
      )}
    </div>
  )
}

// Stats skeleton loader
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="ml-5 w-0 flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Error state component
export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  retry,
  className = ''
}: {
  title?: string
  message?: string
  retry?: () => void
  className?: string
}) {
  return (
    <div className={clsx('text-center py-12', className)}>
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 14.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>

      <h3 className="mt-4 text-sm font-medium text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {message}
      </p>

      {retry && (
        <div className="mt-6">
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = ''
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  message: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('text-center py-12', className)}>
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400" />}

      <h3 className="mt-4 text-sm font-medium text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {message}
      </p>

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}
