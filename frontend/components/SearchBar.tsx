'use client'

import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { AssetFilters, ASSET_TYPES, ASSET_STATUSES } from '@/lib/types'
import { clsx } from 'clsx'

interface SearchBarProps {
  value?: string
  onChange: (value: string) => void
  onFilter?: (filters: AssetFilters) => void
  filters?: AssetFilters
  placeholder?: string
  className?: string
}

export default function SearchBar({
  value = '',
  onChange,
  onFilter,
  filters = {},
  placeholder = 'Search assets by hostname, serial, or vendor...',
  className = ''
}: SearchBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<AssetFilters>(filters)
  const filterRef = useRef<HTMLDivElement>(null)

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
    Array.isArray(value) ? value.length > 0 : !!value
  )

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.search) count++
    if (localFilters.status?.length) count++
    if (localFilters.type?.length) count++
    if (localFilters.vendor?.length) count++
    return count
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="flex items-center space-x-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter button */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={clsx(
              'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors',
              hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {isFilterOpen && (
            <div className="absolute right-0 z-10 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Filter Assets</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Asset Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Type
                  </label>
                  <div className="space-y-2">
                    {ASSET_TYPES.map((type) => (
                      <label key={type.value} className="inline-flex items-center mr-4">
                        <input
                          type="checkbox"
                          checked={localFilters.type?.includes(type.value) || false}
                          onChange={(e) => {
                            const currentTypes = localFilters.type || []
                            const newTypes = e.target.checked
                              ? [...currentTypes, type.value]
                              : currentTypes.filter(t => t !== type.value)
                            handleFilterChange('type', newTypes.length ? newTypes : undefined)
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {ASSET_STATUSES.map((status) => (
                      <label key={status.value} className="inline-flex items-center mr-4">
                        <input
                          type="checkbox"
                          checked={localFilters.status?.includes(status.value) || false}
                          onChange={(e) => {
                            const currentStatuses = localFilters.status || []
                            const newStatuses = e.target.checked
                              ? [...currentStatuses, status.value]
                              : currentStatuses.filter(s => s !== status.value)
                            handleFilterChange('status', newStatuses.length ? newStatuses : undefined)
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Vendor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by vendor..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      const vendors = e.target.value.trim() ? [e.target.value.trim()] : undefined
                      handleFilterChange('vendor', vendors)
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {localFilters.search && (
            <FilterTag
              label={`Search: "${localFilters.search}"`}
              onRemove={() => handleFilterChange('search', undefined)}
            />
          )}
          {localFilters.type?.map((type) => (
            <FilterTag
              key={`type-${type}`}
              label={`Type: ${ASSET_TYPES.find(t => t.value === type)?.label}`}
              onRemove={() => {
                const newTypes = localFilters.type?.filter(t => t !== type)
                handleFilterChange('type', newTypes?.length ? newTypes : undefined)
              }}
            />
          ))}
          {localFilters.status?.map((status) => (
            <FilterTag
              key={`status-${status}`}
              label={`Status: ${ASSET_STATUSES.find(s => s.value === status)?.label}`}
              onRemove={() => {
                const newStatuses = localFilters.status?.filter(s => s !== status)
                handleFilterChange('status', newStatuses?.length ? newStatuses : undefined)
              }}
            />
          ))}
          {localFilters.vendor?.map((vendor) => (
            <FilterTag
              key={`vendor-${vendor}`}
              label={`Vendor: ${vendor}`}
              onRemove={() => {
                const newVendors = localFilters.vendor?.filter(v => v !== vendor)
                handleFilterChange('vendor', newVendors?.length ? newVendors : undefined)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FilterTagProps {
  label: string
  onRemove: () => void
}

function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
      {label}
      <button
        onClick={onRemove}
        className="flex-shrink-0 ml-2 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  )
}
