'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ExternalLinkIcon,
  ComputerDesktopIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon,
  CpuChipIcon,
  CircleStackIcon as MemoryIcon,
  RectangleGroupIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { apiClient, swrConfig } from '@/lib/api-client'
import { AssetWithControllers, AssetType, ASSET_STATUSES, MANAGEMENT_CONTROLLER_TYPES } from '@/lib/types'
import { useAuth, canEditAssets } from '@/lib/use-auth'
import JsonViewer from '@/components/JsonViewer'
import { clsx } from 'clsx'

export default function AssetDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const canEdit = canEditAssets(user)
  const assetId = params.id as string

  const { data: asset, error, isLoading, mutate } = useSWR(
    assetId ? `asset-${assetId}` : null,
    async () => await apiClient.getAsset(assetId),
    swrConfig
  )

  const getAssetTypeIcon = (type: AssetType) => {
    const icons = {
      server: ServerIcon,
      workstation: ComputerDesktopIcon,
      network: DevicePhoneMobileIcon,
      storage: CircleStackIcon,
    }
    return icons[type] || ComputerDesktopIcon
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = ASSET_STATUSES.find(s => s.value === status)
    if (!statusConfig) return null

    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
    }

    return (
      <span className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClasses[statusConfig.color as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800'
      )}>
        {statusConfig.label}
      </span>
    )
  }

  const handleDeleteAsset = async () => {
    if (!confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      return
    }

    try {
      await apiClient.deleteAsset(assetId)
      // Redirect to assets list after successful deletion
      window.location.href = '/assets'
    } catch (error) {
      console.error('Failed to delete asset:', error)
      alert('Failed to delete asset. Please try again.')
    }
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Asset not found</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The requested asset could not be found or you don't have permission to view it.</p>
              </div>
              <div className="mt-4">
                <Link
                  href="/assets"
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  ← Back to assets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!asset) return null

  const TypeIcon = getAssetTypeIcon(asset.type)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/assets"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to assets
          </Link>
        </div>

        {canEdit && (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>

            <button
              onClick={handleDeleteAsset}
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Asset Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <TypeIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{asset.hostname}</h1>
              {asset.fqdn && (
                <p className="text-sm text-gray-500">{asset.fqdn}</p>
              )}
            </div>
            <div className="ml-auto">
              {getStatusBadge(asset.status)}
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Asset Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{asset.type}</dd>
            </div>

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

            {asset.serial_number && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{asset.serial_number}</dd>
              </div>
            )}

            {asset.location && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{asset.location}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(asset.updated_at), 'MMM d, yyyy \'at\' h:mm a')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Management Controllers */}
      {asset.management_controllers && asset.management_controllers.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Management Controllers</h2>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {asset.management_controllers.map((controller) => {
                const controllerType = MANAGEMENT_CONTROLLER_TYPES.find(
                  t => t.value === controller.type
                )?.label || controller.type.toUpperCase()

                return (
                  <div key={controller.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {controllerType}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {controller.address}:{controller.port}
                        </p>
                      </div>

                      {controller.ui_url && (
                        <a
                          href={controller.ui_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Open Console
                          <ExternalLinkIcon className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hardware Specifications */}
      {asset.specs && Object.keys(asset.specs).length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Hardware Specifications</h2>
          </div>
          <div className="px-6 py-4">
            <JsonViewer data={asset.specs} />
          </div>
        </div>
      )}

      {/* Raw Asset Data (for debugging/admin) */}
      {canEdit && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Raw Asset Data</h2>
            <p className="text-sm text-gray-500">
              Complete asset information as stored in the database
            </p>
          </div>
          <div className="px-6 py-4">
            <JsonViewer data={asset} />
          </div>
        </div>
      )}
    </div>
  )
}
