'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  UserIcon,
  RectangleStackIcon,
  DocumentTextIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import {
  AssetFilters,
  ASSET_TYPES,
  ASSET_STATUSES,
  User,
  Application
} from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import { clsx } from 'clsx'

interface EnhancedSearchBarProps {
  value?: string
  onChange: (value: string) => void
  onFilter?: (filters: AssetFilters) => void
  filters?: AssetFilters
  placeholder?: string
  className?: string
  showBulkActions?: boolean
  selectedCount?: number
  onBulkAction?: () => void
  onClearSelection?: () => void
}

export default function EnhancedSearchBar({
  value = '',
  onChange,
  onFilter,
  filters = {},
  placeholder = 'Search assets by hostname, serial, vendor, or notes...',
  className = '',
  showBulkActions = false,
  selectedCount = 0,
  onBulkAction,
  onClearSelection
}: EnhancedSearchBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<AssetFilters>(filters)
  const filterRef = useRef<HTMLDivElement>(null)

  // Load users and applications for filter dropdowns
  const { data: users = [] } = useSWR(
    'users-for-filter',
    () => apiClient.getUsers({ active_only: true, limit: 100 }),
    swrConfig
  )

  const { data: applications = [] } = useSWR(
    'applications-for-filter',
    () => apiClient.getApplications({ limit: 100 }),
    swrConfig
  )

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync local filters with prop filters
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof AssetFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilter?.(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: AssetFilters = {}
    setLocalFilters(emptyFilters)
    onFilter?.(emptyFilters)
  }

  const hasActiveFilters = Object.values(localFilters).some(value =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null
  )

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.status && localFilters.status.length > 0) count++
    if (localFilters.type && localFilters.type.length > 0) count++
    if (localFilters.vendor && localFilters.vendor.length > 0) count++
    if (localFilters.owner_id) count++
    if (localFilters.has_applications !== undefined) count++
    if (localFilters.has_notes !== undefined) count++
    return count
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="flex items-center space-x-4">
        {/* Search Input */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>

        {/* Filters Button */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={clsx(
              'inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              hasActiveFilters
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute z-20 right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Filter Assets</h4>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Asset Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Asset Type
                  </label>
                  <div className="space-y-2">
                    {ASSET_TYPES.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={localFilters.type?.includes(type.value) || false}
                          onChange={(e) => {
                            const currentTypes = localFilters.type || []
                            const newTypes = e.target.checked
                              ? [...currentTypes, type.value]
                              : currentTypes.filter(t => t !== type.value)
                            handleFilterChange('type', newTypes.length > 0 ? newTypes : undefined)
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {ASSET_STATUSES.map(status => (
                      <label key={status.value} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          checked={localFilters.status?.includes(status.value) || false}
                          onChange={(e) => {
                            const currentStatuses = localFilters.status || []
                            const newStatuses = e.target.checked
                              ? [...currentStatuses, status.value]
                              : currentStatuses.filter(s => s !== status.value)
                            handleFilterChange('status', newStatuses.length > 0 ? newStatuses : undefined)
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Owner Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    <UserIcon className="h-3 w-3 inline mr-1" />
                    Owner
                  </label>
                  <select
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    value={localFilters.owner_id || ''}
                    onChange={(e) => handleFilterChange('owner_id', e.target.value || undefined)}
                  >
                    <option value="">All owners</option>
                    <option value="__unassigned__">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Vendor
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    placeholder="Filter by vendor..."
                    value={localFilters.vendor?.[0] || ''}
                    onChange={(e) => handleFilterChange('vendor', e.target.value ? [e.target.value] : undefined)}
                  />
                </div>

                {/* Boolean Filters */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Additional Filters
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={localFilters.has_applications === true}
                        onChange={(e) => handleFilterChange(
                          'has_applications',
                          e.target.checked ? true : undefined
                        )}
                      />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <RectangleStackIcon className="h-4 w-4 mr-1" />
                        Has applications
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={localFilters.has_notes === true}
                        onChange={(e) => handleFilterChange(
                          'has_notes',
                          e.target.checked ? true : undefined
                        )}
                      />
                      <span className="ml-2 text-sm text-gray-700 flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        Has notes
                      </span>
                    </label>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800"
                    disabled={!hasActiveFilters}
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {showBulkActions && selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center px-3 py-2 bg-blue-50 text-blue-800 rounded-md text-sm">
              <CheckIcon className="h-4 w-4 mr-1" />
              {selectedCount} selected
            </div>
            <button
              onClick={onBulkAction}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Bulk Actions
            </button>
            <button
              onClick={onClearSelection}
              className="inline-flex items-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {localFilters.status && localFilters.status.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Status: {localFilters.status.join(', ')}
              <button
                onClick={() => handleFilterChange('status', undefined)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.type && localFilters.type.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Type: {localFilters.type.join(', ')}
              <button
                onClick={() => handleFilterChange('type', undefined)}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.owner_id && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Owner: {localFilters.owner_id === '__unassigned__'
                ? 'Unassigned'
                : users.find(u => u.id === localFilters.owner_id)?.full_name || 'Unknown'
              }
              <button
                onClick={() => handleFilterChange('owner_id', undefined)}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.vendor && localFilters.vendor.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Vendor: {localFilters.vendor[0]}
              <button
                onClick={() => handleFilterChange('vendor', undefined)}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.has_applications && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              <RectangleStackIcon className="h-3 w-3 mr-1" />
              Has Applications
              <button
                onClick={() => handleFilterChange('has_applications', undefined)}
                className="ml-1 text-indigo-600 hover:text-indigo-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {localFilters.has_notes && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <DocumentTextIcon className="h-3 w-3 mr-1" />
              Has Notes
              <button
                onClick={() => handleFilterChange('has_notes', undefined)}
                className="ml-1 text-gray-600 hover:text-gray-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
