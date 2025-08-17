'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeftIcon,
  RectangleStackIcon,
  UserIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { apiClient } from '../../../lib/api-client'
import type { Application, Asset, User } from '../../../lib/types'

// Define the enhanced types inline to match API response
interface AssetWithOwner extends Asset {
  primary_owner?: User | null
}

interface ApplicationWithAssets extends Application {
  assets?: AssetWithOwner[]
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

export default function ApplicationDetailPage() {
  const params = useParams()
  const applicationId = params.id as string

  // Fetch application details
  const { data: application, error, isLoading, mutate } = useSWR(
    applicationId ? ['application', applicationId] : null,
    () => apiClient.getApplication(applicationId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2
    }
  )

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
                <h3 className="text-sm font-medium text-red-800">Application Not Found</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>The requested application could not be found or you don't have permission to view it.</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/applications"
                    className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-red-800 text-sm font-medium"
                  >
                    Back to Applications
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-gray-500">Loading application details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!application) {
    return null
  }

  // Ensure assets is always an array with proper typing
  const assets: AssetWithOwner[] = Array.isArray(application.assets) ? application.assets : []

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <div>
                <Link href="/applications" className="text-gray-400 hover:text-gray-500">
                  <ArrowLeftIcon className="flex-shrink-0 h-5 w-5" />
                  <span className="sr-only">Back to applications</span>
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-500">/</span>
                <Link href="/applications" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Applications
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-500">/</span>
                <span className="ml-4 text-sm font-medium text-gray-900">
                  {application.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RectangleStackIcon className="h-12 w-12 text-gray-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
              <div className="flex items-center mt-1 space-x-4">
                {application.description && (
                  <span className="text-sm text-gray-500">{application.description}</span>
                )}
                <div className="flex items-center space-x-2">
                  {getStatusBadge(application.status)}
                  {getEnvironmentBadge(application.environment)}
                  {getCriticalityBadge(application.criticality)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Details Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Application Information
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{application.name}</dd>
                  </div>
                  {application.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-sm text-gray-900">{application.description}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Environment</dt>
                    <dd className="mt-1">{getEnvironmentBadge(application.environment)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">{getStatusBadge(application.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Criticality</dt>
                    <dd className="mt-1">{getCriticalityBadge(application.criticality)}</dd>
                  </div>
                  {application.application_type && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">{application.application_type}</dd>
                    </div>
                  )}
                  {application.version && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Version</dt>
                      <dd className="mt-1 text-sm text-gray-900">{application.version}</dd>
                    </div>
                  )}
                  {application.port && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Port</dt>
                      <dd className="mt-1 text-sm text-gray-900">{application.port}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(application.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(application.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* URLs Card */}
            {(application.access_url || application.internal_url) && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Access URLs
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {application.access_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-1">Public URL</dt>
                        <dd>
                          <a
                            href={application.access_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                          >
                            {application.access_url}
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
                          </a>
                        </dd>
                      </div>
                    )}
                    {application.internal_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-1">Internal URL</dt>
                        <dd>
                          <a
                            href={application.internal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500 inline-flex items-center"
                          >
                            {application.internal_url}
                            <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
                          </a>
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Card */}
            {application.notes && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Notes
                    </h3>
                  </div>
                  <p className="text-sm text-gray-900">{application.notes}</p>
                </div>
              </div>
            )}

            {/* Assets/Servers Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <ServerIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Servers ({assets.length})
                  </h3>
                </div>

                {assets.length === 0 ? (
                  <div className="text-center py-8">
                    <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No servers assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This application doesn't have any servers assigned yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assets.map((asset) => (
                      <div key={asset.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              <Link
                                href={`/assets/${asset.id}`}
                                className="hover:text-indigo-600"
                              >
                                {asset.hostname}
                              </Link>
                            </h4>
                            {asset.fqdn && (
                              <p className="mt-1 text-sm text-gray-500">{asset.fqdn}</p>
                            )}
                            <div className="mt-2 flex items-center space-x-4 text-xs">
                              <span className={clsx(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                asset.status === 'active' ? 'bg-green-100 text-green-800' :
                                asset.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              )}>
                                {asset.status}
                              </span>
                              <span className="text-gray-500 capitalize">{asset.type}</span>
                              {asset.vendor && (
                                <span className="text-gray-500">{asset.vendor}</span>
                              )}
                              {asset.location && (
                                <span className="text-gray-500">{asset.location}</span>
                              )}
                            </div>
                            {asset.primary_owner && (
                              <div className="mt-2 text-xs text-gray-500">
                                Owner: {asset.primary_owner.full_name}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <Link
                              href={`/assets/${asset.id}`}
                              className="text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Primary Contact Card */}
            {application.primary_contact && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Primary Contact
                    </h3>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {application.primary_contact.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {application.primary_contact.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {application.primary_contact.email}
                    </div>
                    {application.primary_contact.department && (
                      <div className="text-sm text-gray-500 mt-1">
                        {application.primary_contact.department}
                      </div>
                    )}
                    {application.primary_contact.title && (
                      <div className="text-sm text-gray-500">
                        {application.primary_contact.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Technical Details Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <Cog6ToothIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Technical Details
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Application Type</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {application.application_type || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Version</span>
                    <span className="font-medium text-gray-900">
                      {application.version || 'Not specified'}
                    </span>
                  </div>
                  {application.port && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Port</span>
                      <span className="font-medium text-gray-900">{application.port}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Servers</span>
                    <span className="font-medium text-gray-900">
                      {application.asset_count || assets.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Environment</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {application.environment}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {application.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>Debug Info:</strong>
              <div className="mt-2 text-xs">
                <div>Application ID: {application.id}</div>
                <div>API Call: GET /api/v1/applications/{applicationId}</div>
                <div>Assets Length: {assets.length}</div>
                <div>Assets Type: {Array.isArray(application.assets) ? 'Array' : typeof application.assets}</div>
                <div>Response Keys: {Object.keys(application).join(', ')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
