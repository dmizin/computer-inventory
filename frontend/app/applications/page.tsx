'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  PlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  GlobeAltIcon,
  UserIcon,
  ServerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import {
  Application,
  ApplicationFilters,
  ApplicationCreateRequest,
  APPLICATION_ENVIRONMENTS,
  APPLICATION_STATUSES,
  CRITICALITY_LEVELS,
  Asset,
  User
} from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import { useAuth, canEditAssets } from '@/lib/use-auth'
import { useDebounce } from '@/lib/use-debounce'
import UserSelector from '@/components/UserSelector'
import { clsx } from 'clsx'

// Application Form Modal Component
interface ApplicationFormModalProps {
  application?: Application | null
  isOpen: boolean
  onClose: () => void
  onSave: (application: Application) => void
}

function ApplicationFormModal({ application, isOpen, onClose, onSave }: ApplicationFormModalProps) {
  const [formData, setFormData] = useState<ApplicationCreateRequest>({
    name: application?.name || '',
    description: application?.description || '',
    access_url: application?.access_url || '',
    internal_url: application?.internal_url || '',
    environment: application?.environment || 'development',
    application_type: application?.application_type || '',
    version: application?.version || '',
    port: application?.port || undefined,
    status: application?.status || 'active',
    primary_contact_id: application?.primary_contact_id || undefined,
    notes: application?.notes || '',
    criticality: application?.criticality || 'medium',
    asset_ids: []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available assets for selection
  const { data: assets = [] } = useSWR(
    'assets-for-application',
    () => apiClient.getAssets({ per_page: 200 }).then(res => res.data),
    swrConfig
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let savedApplication: Application
      if (application) {
        // Update existing application
        savedApplication = await apiClient.updateApplication(application.id, formData)
      } else {
        // Create new application
        savedApplication = await apiClient.createApplication(formData)
      }

      onSave(savedApplication)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save application')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {application ? 'Edit Application' : 'Create New Application'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Application Name *
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Environment *
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                >
                  {APPLICATION_ENVIRONMENTS.map(env => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Criticality *
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.criticality}
                  onChange={(e) => setFormData({ ...formData, criticality: e.target.value as any })}
                >
                  {CRITICALITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  {APPLICATION_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Port
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.port || ''}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Access URL
                </label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.access_url}
                  onChange={(e) => setFormData({ ...formData, access_url: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Internal URL
                </label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.internal_url}
                  onChange={(e) => setFormData({ ...formData, internal_url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Application Type
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.application_type}
                  onChange={(e) => setFormData({ ...formData, application_type: e.target.value })}
                  placeholder="e.g., Web Service, Database, API"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Version
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 1.0.0, v2.1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Contact
                </label>
                <UserSelector
                  value={formData.primary_contact_id}
                  onChange={(userId) => setFormData({ ...formData, primary_contact_id: userId || undefined })}
                  clearable={true}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Associated Servers
                </label>
                <select
                  multiple
                  className="mt-1 block w-full h-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.asset_ids}
                  onChange={(e) => setFormData({
                    ...formData,
                    asset_ids: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                >
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.hostname} ({asset.type}) - {asset.vendor || 'Unknown'} {asset.model || ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Hold Ctrl/Cmd to select multiple servers
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes, configuration details, etc."
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (application ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Badge components
const getEnvironmentBadge = (environment: string) => {
  const config = APPLICATION_ENVIRONMENTS.find(e => e.value === environment)
  const colors = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[config?.color as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {config?.label || environment}
    </span>
  )
}

const getCriticalityBadge = (criticality: string) => {
  const config = CRITICALITY_LEVELS.find(c => c.value === criticality)
  const colors = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[config?.color as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {config?.label || criticality}
      {criticality === 'critical' && <ExclamationTriangleIcon className="ml-1 h-3 w-3" />}
    </span>
  )
}

const getStatusBadge = (status: string) => {
  const config = APPLICATION_STATUSES.find(s => s.value === status)
  const colors = {
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[config?.color as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    )}>
      {config?.label || status}
    </span>
  )
}

// Main Applications Page Component
export default function ApplicationsPage() {
  const { user: currentUser } = useAuth()
  const canEdit = canEditAssets(currentUser)

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<ApplicationFilters>({})
  const [showModal, setShowModal] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 300)

  // Fetch applications
  const { data: applications = [], error, isLoading, mutate } = useSWR(
    ['applications', debouncedSearch, filters],
    () => apiClient.getApplications({
      search: debouncedSearch || undefined,
      environment: filters.environment?.join(','),
      status: filters.status?.join(','),
      criticality: filters.criticality?.join(','),
      has_assets: filters.has_assets,
      limit: 100
    }),
    swrConfig
  )

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  // Handle new application
  const handleNewApplication = () => {
    setEditingApplication(null)
    setShowModal(true)
  }

  // Handle edit application
  const handleEditApplication = (application: Application) => {
    setEditingApplication(application)
    setShowModal(true)
  }

  // Handle application saved
  const handleApplicationSaved = () => {
    mutate() // Refresh the application list
  }

  // Handle delete application
  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return

    try {
      await apiClient.deleteApplication(applicationId)
      mutate() // Refresh the application list
    } catch (err) {
      alert('Failed to delete application')
    }
  }

  // Filter applications based on local filters
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (filters.environment && filters.environment.length > 0 && !filters.environment.includes(app.environment)) return false
      if (filters.status && filters.status.length > 0 && !filters.status.includes(app.status)) return false
      if (filters.criticality && filters.criticality.length > 0 && !filters.criticality.includes(app.criticality)) return false
      if (filters.has_assets !== undefined) {
        if (filters.has_assets && app.asset_count === 0) return false
        if (!filters.has_assets && app.asset_count > 0) return false
      }
      return true
    })
  }, [applications, filters])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600">Error loading applications: {error.message}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Applications
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage applications and their server associations
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            {canEdit && (
              <button
                type="button"
                onClick={handleNewApplication}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Add Application
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Environment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Environment
              </label>
              <select
                multiple
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.environment || []}
                onChange={(e) => setFilters({
                  ...filters,
                  environment: Array.from(e.target.selectedOptions, option => option.value as any)
                })}
              >
                {APPLICATION_ENVIRONMENTS.map(env => (
                  <option key={env.value} value={env.value}>
                    {env.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Criticality Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Criticality
              </label>
              <select
                multiple
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.criticality || []}
                onChange={(e) => setFilters({
                  ...filters,
                  criticality: Array.from(e.target.selectedOptions, option => option.value as any)
                })}
              >
                {CRITICALITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Has Assets Filter */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filters
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="has-assets"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={filters.has_assets === true}
                    onChange={(e) => setFilters({
                      ...filters,
                      has_assets: e.target.checked ? true : undefined
                    })}
                  />
                  <label htmlFor="has-assets" className="ml-2 block text-sm text-gray-700">
                    Has servers
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-4 text-center">
              <div className="text-gray-500">Loading applications...</div>
            </div>
          ) : (
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
                            {app.access_url && (
                              <a
                                href={app.access_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                              >
                                <GlobeAltIcon className="h-3 w-3 mr-1" />
                                Access
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <ServerIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {app.asset_count} servers
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {app.primary_contact ? (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                              {app.primary_contact.full_name}
                            </div>
                          ) : (
                            <span className="text-gray-400">No contact</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/applications/${app.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEditApplication(app)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteApplication(app.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredApplications.length === 0 && (
                <div className="text-center py-12">
                  <RectangleStackIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || Object.keys(filters).some(k => filters[k as keyof ApplicationFilters])
                      ? 'Try adjusting your search or filters.'
                      : 'Get started by creating a new application.'}
                  </p>
                  {canEdit && !searchTerm && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleNewApplication}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                      >
                        <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Add Application
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Application Form Modal */}
      <ApplicationFormModal
        application={editingApplication}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleApplicationSaved}
      />
    </div>
  )
}
