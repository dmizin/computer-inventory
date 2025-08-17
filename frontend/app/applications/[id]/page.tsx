'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  RectangleStackIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  UserIcon,
  ServerIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import {
  ApplicationWithAssets,
  ApplicationUpdateRequest,
  Asset,
  AssetType,
  APPLICATION_ENVIRONMENTS,
  APPLICATION_STATUSES,
  CRITICALITY_LEVELS
} from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import { useAuth, canEditAssets } from '@/lib/use-auth'
import UserSelector from '@/components/UserSelector'
import { clsx } from 'clsx'

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

// Badge components
const getEnvironmentBadge = (environment: string) => {
  const config = APPLICATION_ENVIRONMENTS.find(e => e.value === environment)
  const colors = {
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
      colors[config?.color as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
    )}>
      {config?.label || environment}
    </span>
  )
}

const getCriticalityBadge = (criticality: string) => {
  const config = CRITICALITY_LEVELS.find(c => c.value === criticality)
  const colors = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
      colors[config?.color as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
    )}>
      {config?.label || criticality}
      {criticality === 'critical' && <ExclamationTriangleIcon className="ml-1 h-4 w-4" />}
    </span>
  )
}

// Application Edit Modal Component
interface ApplicationEditModalProps {
  application: ApplicationWithAssets
  isOpen: boolean
  onClose: () => void
  onSave: (application: ApplicationWithAssets) => void
}

function ApplicationEditModal({ application, isOpen, onClose, onSave }: ApplicationEditModalProps) {
  const [formData, setFormData] = useState<ApplicationUpdateRequest>({
    name: application.name,
    description: application.description || '',
    access_url: application.access_url || '',
    internal_url: application.internal_url || '',
    environment: application.environment,
    application_type: application.application_type || '',
    version: application.version || '',
    port: application.port || undefined,
    status: application.status,
    primary_contact_id: application.primary_contact_id || undefined,
    notes: application.notes || '',
    criticality: application.criticality
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const updatedApplication = await apiClient.updateApplication(application.id, formData)
      // Merge the updated data with existing assets
      onSave({ ...application, ...updatedApplication })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update application')
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
            <h3 className="text-lg font-medium text-gray-900">Edit Application</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Application Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Environment *</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                >
                  {APPLICATION_ENVIRONMENTS.map(env => (
                    <option key={env.value} value={env.value}>{env.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Criticality *</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.criticality}
                  onChange={(e) => setFormData({ ...formData, criticality: e.target.value as any })}
                >
                  {CRITICALITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  {APPLICATION_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Port</label>
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
                <label className="block text-sm font-medium text-gray-700">Access URL</label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.access_url}
                  onChange={(e) => setFormData({ ...formData, access_url: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Internal URL</label>
                <input
                  type="url"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.internal_url}
                  onChange={(e) => setFormData({ ...formData, internal_url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Application Type</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.application_type}
                  onChange={(e) => setFormData({ ...formData, application_type: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Primary Contact</label>
                <UserSelector
                  value={formData.primary_contact_id}
                  onChange={(userId) => setFormData({ ...formData, primary_contact_id: userId || undefined })}
                  clearable={true}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string
  const { user: currentUser } = useAuth()
  const canEdit = canEditAssets(currentUser)

  const [showEditModal, setShowEditModal] = useState(false)

  // Fetch application details with assets
  const { data: application, error: applicationError, isLoading: applicationLoading, mutate: mutateApplication } = useSWR(
    applicationId ? ['application', applicationId] : null,
    () => apiClient.getApplication(applicationId),
    swrConfig
  )

  // Load available assets for adding servers
  const { data: availableAssets = [] } = useSWR(
    'assets-for-assignment',
    () => apiClient.getAssets({ per_page: 200 }).then(res => res.data),
    swrConfig
  )

  const handleEditApplication = () => {
    setShowEditModal(true)
  }

  const handleApplicationUpdated = (updatedApplication: ApplicationWithAssets) => {
    mutateApplication(updatedApplication, false)
  }

  const handleDeleteApplication = async () => {
    if (!application || !confirm(`Are you sure you want to delete ${application.name}?`)) return

    try {
      await apiClient.deleteApplication(application.id)
      router.push('/applications')
    } catch (err) {
      alert('Failed to delete application')
    }
  }

  const handleAddServer = async (assetId: string) => {
    if (!application) return

    try {
      await apiClient.addAssetToApplication(application.id, assetId)
      mutateApplication() // Refresh application data
    } catch (err) {
      alert('Failed to add server to application')
    }
  }

  const handleRemoveServer = async (assetId: string) => {
    if (!application) return

    try {
      await apiClient.removeAssetFromApplication(application.id, assetId)
      mutateApplication() // Refresh application data
    } catch (err) {
      alert('Failed to remove server from application')
    }
  }

  if (applicationError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600">Error loading application: {applicationError.message}</div>
            <Link href="/applications" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
              ← Back to Applications
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (applicationLoading || !application) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-gray-500">Loading application...</div>
          </div>
        </div>
      </div>
    )
  }

  // Filter available assets to exclude already assigned ones
  const unassignedAssets = availableAssets.filter(asset =>
    !application.assets?.some(appAsset => appAsset.id === asset.id)
  )

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
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
        </div>

        {/* Application Info Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16">
                  <RectangleStackIcon className="h-16 w-16 text-gray-400" />
                </div>
                <div className="ml-6">
                  <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
                  <p className="text-sm text-gray-500 mt-1">{application.description}</p>
                  <div className="mt-2 flex items-center space-x-4">
                    {getEnvironmentBadge(application.environment)}
                    {getCriticalityBadge(application.criticality)}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditApplication}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteApplication}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Application Details */}
            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
              {application.access_url && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Access URL</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={application.access_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 flex items-center"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      {application.access_url}
                    </a>
                  </dd>
                </div>
              )}

              {application.primary_contact && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Contact</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                    {application.primary_contact.full_name}
                    {application.primary_contact.email && (
                      <a
                        href={`mailto:${application.primary_contact.email}`}
                        className="ml-2 text-indigo-600 hover:text-indigo-500"
                      >
                        {application.primary_contact.email}
                      </a>
                    )}
                  </dd>
                </div>
              )}

              {application.version && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.version}</dd>
                </div>
              )}

              {application.application_type && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{application.application_type}</dd>
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
                  {format(new Date(application.created_at), 'MMMM d, yyyy')}
                </dd>
              </div>
            </div>

            {/* Notes */}
            {application.notes && (
              <div className="mt-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  Notes
                </dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {application.notes}
                </dd>
              </div>
            )}
          </div>
        </div>

        {/* Associated Servers */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Associated Servers
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Servers running this application ({application.assets?.length || 0} total)
                </p>
              </div>

              {canEdit && unassignedAssets.length > 0 && (
                <div className="flex items-center">
                  <select
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddServer(e.target.value)
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">Add server...</option>
                    {unassignedAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.hostname} ({asset.type}) - {asset.vendor || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {!application.assets || application.assets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No servers assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                This application doesn't have any servers assigned yet.
              </p>
              {canEdit && unassignedAssets.length > 0 && (
                <div className="mt-6">
                  <select
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddServer(e.target.value)
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">Select a server to add...</option>
                    {unassignedAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.hostname} ({asset.type}) - {asset.vendor || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Server
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
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
                  {application.assets.map((asset) => {
                    const TypeIcon = getAssetTypeIcon(asset.type)

                    return (
                      <tr key={asset.id} className="hover:bg-gray-50">
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
                            {asset.vendor || '-'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/assets/${asset.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </Link>
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveServer(asset.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Remove from application"
                              >
                                <XMarkIcon className="h-4 w-4" />
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
          )}
        </div>
      </div>

      {/* Edit Application Modal */}
      {application && (
        <ApplicationEditModal
          application={application}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleApplicationUpdated}
        />
      )}
    </div>
  )
}
