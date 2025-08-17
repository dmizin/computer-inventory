'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeftIcon,
  ServerIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon,
  UserIcon,
  RectangleStackIcon,
  KeyIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  CogIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { apiClient } from '../../../lib/api-client'
import type { AssetWithDetails, AssetType } from '../../../lib/types'

const getAssetTypeIcon = (type: AssetType) => {
  switch (type) {
    case 'server':
      return ServerIcon
    case 'workstation':
      return ComputerDesktopIcon
    case 'network':
      return DevicePhoneMobileIcon
    case 'storage':
      return CircleStackIcon
    default:
      return ComputerDesktopIcon
  }
}

const getStatusBadge = (status: string) => {
  const colors = {
    active: 'bg-green-100 text-green-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    retired: 'bg-red-100 text-red-800'
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
    </span>
  )
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

export default function AssetDetailPage() {
  const params = useParams()
  const assetId = params.id as string

  // Fetch asset details
  const { data: asset, error, isLoading } = useSWR(
    assetId ? ['asset', assetId] : null,
    () => apiClient.getAsset(assetId),
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
                <h3 className="text-sm font-medium text-red-800">Asset Not Found</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>The requested asset could not be found or you don't have permission to view it.</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/assets"
                    className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-red-800 text-sm font-medium"
                  >
                    Back to Assets
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
            <div className="text-gray-500">Loading asset details...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!asset) {
    return null
  }

  const IconComponent = getAssetTypeIcon(asset.type)

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <div>
                <Link href="/assets" className="text-gray-400 hover:text-gray-500">
                  <ArrowLeftIcon className="flex-shrink-0 h-5 w-5" />
                  <span className="sr-only">Back to assets</span>
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-500">/</span>
                <Link href="/assets" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Assets
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="text-gray-500">/</span>
                <span className="ml-4 text-sm font-medium text-gray-900">
                  {asset.hostname}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconComponent className="h-12 w-12 text-gray-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{asset.hostname}</h1>
              <div className="flex items-center mt-1 space-x-4">
                {asset.fqdn && (
                  <span className="text-sm text-gray-500">{asset.fqdn}</span>
                )}
                <div className="flex items-center space-x-2">
                  {getStatusBadge(asset.status)}
                  <span className="text-sm text-gray-500 capitalize">{asset.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Details Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Asset Information
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hostname</dt>
                    <dd className="mt-1 text-sm text-gray-900">{asset.hostname}</dd>
                  </div>
                  {asset.fqdn && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">FQDN</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.fqdn}</dd>
                    </div>
                  )}
                  {asset.serial_number && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.serial_number}</dd>
                    </div>
                  )}
                  {asset.vendor && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.vendor}</dd>
                    </div>
                  )}
                  {asset.model && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Model</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.model}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{asset.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">{getStatusBadge(asset.status)}</dd>
                  </div>
                  {asset.location && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{asset.location}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(asset.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Specs Card */}
            {asset.specs && Object.keys(asset.specs).length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <CogIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Technical Specifications
                    </h3>
                  </div>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg overflow-auto">
                    {JSON.stringify(asset.specs, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Notes Card */}
            {asset.notes && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Notes
                    </h3>
                  </div>
                  <p className="text-sm text-gray-900">{asset.notes}</p>
                </div>
              </div>
            )}

            {/* Applications Card */}
            {asset.applications && asset.applications.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <RectangleStackIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Applications ({asset.applications.length})
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {asset.applications.map((app) => (
                      <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{app.name}</h4>
                            {app.description && (
                              <p className="mt-1 text-sm text-gray-500">{app.description}</p>
                            )}
                            <div className="mt-2 flex items-center space-x-4 text-xs">
                              {getEnvironmentBadge(app.environment)}
                              {getCriticalityBadge(app.criticality)}
                              <span className="text-gray-500 capitalize">{app.application_type}</span>
                            </div>
                            {app.primary_contact && (
                              <div className="mt-2 text-xs text-gray-500">
                                Contact: {app.primary_contact.full_name} ({app.primary_contact.email})
                              </div>
                            )}
                          </div>
                          {app.access_url && (
                            <a
                              href={app.access_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 text-indigo-600 hover:text-indigo-500"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Primary Owner Card */}
            {asset.primary_owner && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center mb-4">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Primary Owner
                    </h3>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {asset.primary_owner.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {asset.primary_owner.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {asset.primary_owner.email}
                    </div>
                    {asset.primary_owner.department && (
                      <div className="text-sm text-gray-500 mt-1">
                        {asset.primary_owner.department}
                      </div>
                    )}
                    {asset.primary_owner.title && (
                      <div className="text-sm text-gray-500">
                        {asset.primary_owner.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Info Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Security
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">1Password Integration</span>
                    <div className="flex items-center">
                      {asset.has_onepassword_secret ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1" />
                      )}
                      <span className={clsx(
                        'text-xs',
                        asset.has_onepassword_secret ? 'text-green-600' : 'text-yellow-600'
                      )}>
                        {asset.has_onepassword_secret ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  {asset.onepassword_secret_id && (
                    <div className="text-xs text-gray-500">
                      Secret ID: {asset.onepassword_secret_id}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Management Controllers Card */}
            {asset.management_controllers && asset.management_controllers.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Management Controllers
                  </h3>
                  <div className="space-y-3">
                    {asset.management_controllers.map((controller) => (
                      <div key={controller.id} className="border border-gray-200 rounded p-3">
                        <div className="text-sm font-medium text-gray-900 uppercase">
                          {controller.type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {controller.address}:{controller.port}
                        </div>
                        {controller.ui_url && (
                          <a
                            href={controller.ui_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center mt-1"
                          >
                            Access UI <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Applications</span>
                    <span className="font-medium text-gray-900">
                      {asset.application_count || asset.applications?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Management Controllers</span>
                    <span className="font-medium text-gray-900">
                      {asset.management_controllers?.length || 0}
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
                <div>Asset ID: {asset.id}</div>
                <div>API Call: GET /api/v1/assets/{assetId}</div>
                <div>Response Keys: {Object.keys(asset).join(', ')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
