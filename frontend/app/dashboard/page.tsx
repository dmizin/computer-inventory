'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ComputerDesktopIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { apiClient, swrConfig } from '@/lib/api-client'
import { Asset, AssetType, ASSET_STATUSES } from '@/lib/types'
import { clsx } from 'clsx'

interface DashboardStats {
  total_assets: number
  active_assets: number
  retired_assets: number
  maintenance_assets: number
  assets_by_type: Record<AssetType, number>
  assets_by_vendor: Record<string, number>
  recent_additions: Asset[]
}

export default function DashboardPage() {
  // Fetch all assets for dashboard statistics
  const { data: assetsData, error, isLoading } = useSWR(
    'dashboard-assets',
    async () => {
      // Fetch a large number to get all assets for stats
      return await apiClient.getAssets({ per_page: 1000 })
    },
    swrConfig
  )

  // Calculate dashboard statistics
  const stats: DashboardStats = useMemo(() => {
    if (!assetsData) {
      return {
        total_assets: 0,
        active_assets: 0,
        retired_assets: 0,
        maintenance_assets: 0,
        assets_by_type: {} as Record<AssetType, number>,
        assets_by_vendor: {},
        recent_additions: [],
      }
    }

    const assets = assetsData.data

    // Count by status
    const active_assets = assets.filter(a => a.status === 'active').length
    const retired_assets = assets.filter(a => a.status === 'retired').length
    const maintenance_assets = assets.filter(a => a.status === 'maintenance').length

    // Count by type
    const assets_by_type = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1
      return acc
    }, {} as Record<AssetType, number>)

    // Count by vendor
    const assets_by_vendor = assets.reduce((acc, asset) => {
      if (asset.vendor) {
        acc[asset.vendor] = (acc[asset.vendor] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Get recent additions (last 30 days, sorted by created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recent_additions = assets
      .filter(asset => new Date(asset.created_at) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)

    return {
      total_assets: assets.length,
      active_assets,
      retired_assets,
      maintenance_assets,
      assets_by_type,
      assets_by_vendor,
      recent_additions,
    }
  }, [assetsData])

  const getTypeIcon = (type: AssetType) => {
    const icons = {
      server: ServerIcon,
      workstation: ComputerDesktopIcon,
      network: DevicePhoneMobileIcon,
      storage: CircleStackIcon,
    }
    return icons[type] || ComputerDesktopIcon
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Failed to load dashboard data. Please try again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your computer inventory and asset statistics
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Assets
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {isLoading ? '...' : stats.total_assets}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {ASSET_STATUSES.map((status) => {
          const count = status.value === 'active' ? stats.active_assets :
                      status.value === 'retired' ? stats.retired_assets :
                      stats.maintenance_assets

          const colorClasses = {
            green: 'text-green-600',
            yellow: 'text-yellow-600',
            red: 'text-red-600',
          }

          return (
            <div key={status.value} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={clsx(
                      'h-6 w-6 rounded-full flex items-center justify-center',
                      status.color === 'green' ? 'bg-green-100' :
                      status.color === 'yellow' ? 'bg-yellow-100' :
                      'bg-red-100'
                    )}>
                      <div className={clsx(
                        'h-2 w-2 rounded-full',
                        colorClasses[status.color as keyof typeof colorClasses]
                      )} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {status.label}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoading ? '...' : count}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Asset Types */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Assets by Type
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.assets_by_type).map(([type, count]) => {
                const TypeIcon = getTypeIcon(type as AssetType)
                const percentage = stats.total_assets > 0 ? (count / stats.total_assets) * 100 : 0

                return (
                  <div key={type} className="flex items-center">
                    <TypeIcon className="h-5 w-5 text-gray-400" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 capitalize">{type}</span>
                        <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Top Vendors
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.assets_by_vendor)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([vendor, count]) => {
                  const percentage = stats.total_assets > 0 ? (count / stats.total_assets) * 100 : 0

                  return (
                    <div key={vendor} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{vendor}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-3">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Additions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Additions
            </h3>
            <Link
              href="/assets"
              className="text-sm text-blue-600 hover:text-blue-900"
            >
              View all assets →
            </Link>
          </div>

          {stats.recent_additions.length === 0 ? (
            <div className="text-center py-6">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent additions</h3>
              <p className="mt-1 text-sm text-gray-500">
                No assets have been added in the last 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_additions.map((asset) => {
                const TypeIcon = getTypeIcon(asset.type)

                return (
                  <div key={asset.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <TypeIcon className="h-5 w-5 text-gray-400" />
                      <div className="ml-3">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {asset.hostname}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {asset.vendor} {asset.model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {format(new Date(asset.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {asset.type}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
