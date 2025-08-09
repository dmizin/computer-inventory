'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { PlusIcon } from '@heroicons/react/24/outline'
import { AssetFilters, SortConfig } from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import { useAuth, canEditAssets } from '@/lib/use-auth'
import AssetTable from '@/components/AssetTable'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { useDebounce } from '@/lib/use-debounce'

export default function AssetsPage() {
  const { user } = useAuth()
  const canEdit = canEditAssets(user)

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<AssetFilters>({})
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'updated_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)

  const debouncedSearch = useDebounce(searchTerm, 300)

  // Build API parameters
  const apiParams = useMemo(() => ({
    page: currentPage,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: filters.status?.join(',') || undefined,
    type: filters.type?.join(',') || undefined,
    vendor: filters.vendor?.[0] || undefined,
    sort_by: sortConfig.field,
    sort_order: sortConfig.direction,
  }), [currentPage, debouncedSearch, filters, sortConfig])

  // Create cache key
  const cacheKey = useMemo(() =>
    ['assets', JSON.stringify(apiParams)],
    [apiParams]
  )

  // Fetch data
  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(apiParams).filter(([, value]) => value !== undefined)
      )
      return await apiClient.getAssets(cleanParams)
    },
    {
      ...swrConfig,
      keepPreviousData: true,
    }
  )

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Handle filters
  const handleFilter = (newFilters: AssetFilters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Handle sorting
  const handleSort = (newSortConfig: SortConfig) => {
    setSortConfig(newSortConfig)
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle edit asset (placeholder - would open modal or navigate to edit page)
  const handleEditAsset = (asset: any) => {
    console.log('Edit asset:', asset)
    // TODO: Implement edit functionality
  }

  // Handle delete asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await apiClient.deleteAsset(assetId)
      mutate() // Refresh the data
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
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading assets
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Failed to load asset data. Please check your connection and try again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your computer inventory and hardware assets
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Asset
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <SearchBar
        value={searchTerm}
        onChange={handleSearch}
        onFilter={handleFilter}
        filters={filters}
        placeholder="Search assets by hostname, serial number, or vendor..."
        className="w-full"
      />

      {/* Results Summary */}
      {data && (
        <div className="flex items-center justify-between text-sm text-gray-700">
          <p>
            Showing {data.data.length} of {data.meta.total} assets
            {debouncedSearch && (
              <span className="ml-1">
                for &ldquo;<strong>{debouncedSearch}</strong>&rdquo;
              </span>
            )}
          </p>
          <p>
            Page {data.meta.page} of {data.meta.pages}
          </p>
        </div>
      )}

      {/* Asset Table */}
      <AssetTable
        assets={data?.data || []}
        loading={isLoading}
        onSort={handleSort}
        sortConfig={sortConfig}
        onEdit={canEdit ? handleEditAsset : undefined}
        onDelete={canEdit ? handleDeleteAsset : undefined}
      />

      {/* Pagination */}
      {data && data.meta.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={data.meta.pages}
          totalItems={data.meta.total}
          itemsPerPage={data.meta.per_page}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
