'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ComputerDesktopIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'
import { Asset, AssetType, SortConfig, ASSET_STATUSES } from '@/lib/types'
import { useAuth, canEditAssets } from '@/lib/use-auth'
import { clsx } from 'clsx'

interface AssetTableProps {
  assets: Asset[]
  loading?: boolean
  onSort?: (sortConfig: SortConfig) => void
  sortConfig?: SortConfig
  onEdit?: (asset: Asset) => void
  onDelete?: (assetId: string) => void
}

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

export default function AssetTable({
  assets,
  loading = false,
  onSort,
  sortConfig,
  onEdit,
  onDelete
}: AssetTableProps) {
  const { user } = useAuth()
  const canEdit = canEditAssets(user)

  const handleSort = (field: keyof Asset) => {
    if (!onSort) return

    const direction =
      sortConfig?.field === field && sortConfig.direction === 'asc'
        ? 'desc'
        : 'asc'

    onSort({ field, direction })
  }

  const SortButton = ({ field, children }: { field: keyof Asset; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="group inline-flex items-center text-left font-medium text-gray-900 hover:text-gray-700"
    >
      {children}
      <span className="ml-2 flex-none rounded text-gray-400 group-hover:text-gray-700">
        {sortConfig?.field === field ? (
          sortConfig.direction === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )
        ) : (
          <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-50" />
        )}
      </span>
    </button>
  )

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-16 text-center">
          <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No assets found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by adding your first computer asset to the inventory.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="hostname">Asset</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="type">Type</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="vendor">Vendor/Model</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="location">Location</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="updated_at">Updated</SortButton>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assets.map((asset) => {
              const TypeIcon = getAssetTypeIcon(asset.type)

              return (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TypeIcon className="h-8 w-8 text-gray-400" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {asset.hostname}
                        </div>
                        {asset.fqdn && (
                          <div className="text-sm text-gray-500">
                            {asset.fqdn}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {asset.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {asset.vendor}
                    </div>
                    {asset.model && (
                      <div className="text-sm text-gray-500">
                        {asset.model}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.location || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(asset.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(asset.updated_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>

                      {canEdit && onEdit && (
                        <button
                          onClick={() => onEdit(asset)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Edit asset"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}

                      {canEdit && onDelete && (
                        <button
                          onClick={() => onDelete(asset.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete asset"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
