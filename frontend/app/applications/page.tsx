'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  PlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  GlobeAltIcon,
  UserIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import {
  Application,
  ApplicationType,
  ApplicationCreateRequest,
  ApplicationUpdateRequest
} from '../../lib/types'
import { apiClient } from '../../lib/api-client'
import clsx from 'clsx'

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const getEnvironmentBadge = (environment: string) => {
  const colors = {
    development: 'bg-blue-100 text-blue-800',
    staging: 'bg-yellow-100 text-yellow-800',
    production: 'bg-red-100 text-red-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[environment as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {environment}
    </span>
  )
}

const getCriticalityBadge = (criticality: string) => {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[criticality as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {criticality}
      {criticality === 'critical' && <ExclamationTriangleIcon className="ml-1 h-3 w-3" />}
    </span>
  )
}

const getStatusBadge = (status: string) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    deprecated: 'bg-red-100 text-red-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {status}
    </span>
  )
}

export default function ApplicationsPage() {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Fetch applications - the key fix is ensuring we always have an array
  const { data: applications = [], error, isLoading, mutate } = useSWR(
    ['applications', debouncedSearch],
    () => apiClient.getApplications({
      search: debouncedSearch || undefined,
      limit: 100
    }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2
    }
  )

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Apply local filtering - this ensures applications is always an array
  const filteredApplications = useMemo(() => {
    // Ensure applications is always an array before calling filter
    if (!Array.isArray(applications)) {
      return []
    }

    return applications.filter(app => {
      // Add any additional local filtering logic here if needed
      return true
    })
  }, [applications])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Applications</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message || 'Failed to load applications'}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => mutate()}
                    className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-red-800 text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
              Applications
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your application inventory and server assignments
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <Link
              href="/applications/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Add Application
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-lg">
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Search applications by name, description..."
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500">Loading applications...</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredApplications.length === 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-12 text-center">
              <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first application.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <Link
                    href="/applications/new"
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    Add Application
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications Table */}
        {!isLoading && filteredApplications.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Environment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criticality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <RectangleStackIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {app.name}
                            </div>
                            {app.description && (
                              <div className="text-sm text-gray-500">
                                {app.description}
                              </div>
                            )}
                            {app.access_url && (
                              <a
                                href={app.access_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                              >
                                <GlobeAltIcon className="h-3 w-3 mr-1" />
                                Access
                                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEnvironmentBadge(app.environment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getCriticalityBadge(app.criticality)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <ServerIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {app.asset_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.primary_contact ? (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {app.primary_contact.full_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {app.primary_contact.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/applications/${app.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {filteredApplications.length} applications
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
