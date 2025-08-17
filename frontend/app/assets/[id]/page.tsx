// app/assets/[id]/page.tsx - Enhanced Asset Detail Page with Editing
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AssetWithDetails,
  AssetUpdateRequest,
  ASSET_TYPES,
  ASSET_STATUSES,
  AssetType,
  AssetStatus
} from '@/lib/types'
import { apiClient } from '@/lib/api-client'
import UserSelector from '@/components/UserSelector'
import ApplicationSelector from '@/components/ApplicationSelector'
import {
  ServerIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  CircleStackIcon,
  WifiIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UserIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'

// Helper function to get icon for asset type
function getAssetIcon(type: string) {
  switch (type) {
    case 'server':
      return ServerIcon
    case 'workstation':
      return ComputerDesktopIcon
    default:
      return ServerIcon
  }
}

// Helper function to get status badge
function getStatusBadge(status: string) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"

  switch (status) {
    case 'active':
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>Active</span>
    case 'retired':
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Retired</span>
    case 'maintenance':
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Maintenance</span>
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>
  }
}

// Editable Field Component
interface EditableFieldProps {
  label: string
  value: string | null | undefined
  onSave: (value: string) => Promise<void>
  type?: 'text' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
  multiline?: boolean
}

function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = '',
  multiline = false
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving) return

    setSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving field:', error)
      setEditValue(value || '')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value || '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 flex items-center space-x-2">
          {type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={saving}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : multiline ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={saving}
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={saving}
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center p-1 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex items-center p-1 border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </dd>
      </div>
    )
  }

  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 flex items-center justify-between">
        <span className={value ? '' : 'text-gray-400 italic'}>
          {value || 'Not specified'}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-2 text-indigo-600 hover:text-indigo-900"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </dd>
    </div>
  )
}

// Technical Specifications Component
interface TechnicalSpecsProps {
  specs: Record<string, any>
  onUpdateSpecs: (newSpecs: Record<string, any>) => Promise<void>
}

function TechnicalSpecifications({ specs, onUpdateSpecs }: TechnicalSpecsProps) {
  // Helper function to safely get nested spec values
  const getSpecValue = (path: string[], fallback: any = null) => {
    let value = specs
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return fallback
      }
    }
    return value
  }

  const updateSpec = async (path: string[], value: any) => {
    const newSpecs = { ...specs }
    let current = newSpecs

    // Navigate to the parent object
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]] || typeof current[path[i]] !== 'object') {
        current[path[i]] = {}
      }
      current = current[path[i]]
    }

    // Set the final value
    const finalKey = path[path.length - 1]
    current[finalKey] = value

    await onUpdateSpecs(newSpecs)
  }

  // Format CPU information for display
  const formatCpuInfo = () => {
    const cpu = getSpecValue(['cpu'])
    const cpuModel = getSpecValue(['cpu']) || getSpecValue(['cpu', 'model'])
    const cpunum = getSpecValue(['cpunum']) || getSpecValue(['cpu', 'count'])
    const cpucore = getSpecValue(['cpucore']) || getSpecValue(['cpu', 'cores'])

    if (typeof cpu === 'string') {
      return cpu // If CPU is stored as simple string
    }

    if (cpuModel || cpunum || cpucore) {
      return `${cpuModel || 'Unknown CPU'} (${cpunum || 'Unknown'} CPUs, ${cpucore || 'Unknown'} cores)`
    }

    return null
  }

  // Format RAM information
  const formatRamInfo = () => {
    const ram = getSpecValue(['ram'])
    const memoryGb = getSpecValue(['memory_gb'])

    if (ram) return ram
    if (memoryGb) return `${memoryGb}GB`
    return null
  }

  const cpuInfo = formatCpuInfo()
  const ramInfo = formatRamInfo()
  const cpunum = getSpecValue(['cpunum']) || getSpecValue(['cpu', 'count'])
  const cpucore = getSpecValue(['cpucore']) || getSpecValue(['cpu', 'cores'])

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <CpuChipIcon className="h-5 w-5 mr-2 text-gray-400" />
            Technical Specifications
          </h3>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {/* CPU Information */}
          <EditableField
            label="CPU"
            value={cpuInfo}
            onSave={async (value) => {
              if (typeof getSpecValue(['cpu']) === 'string' || !getSpecValue(['cpu'])) {
                await updateSpec(['cpu'], value)
              } else {
                await updateSpec(['cpu', 'model'], value)
              }
            }}
            placeholder="e.g., Intel(R) Xeon(R) CPU E5-2670 v3 @ 2.30GHz"
          />

          <EditableField
            label="RAM"
            value={ramInfo}
            onSave={async (value) => {
              await updateSpec(['ram'], value)
            }}
            placeholder="e.g., 64GB"
          />

          <EditableField
            label="CPU Count"
            value={cpunum?.toString()}
            onSave={async (value) => {
              await updateSpec(['cpunum'], parseInt(value) || value)
            }}
            placeholder="e.g., 2"
          />

          <EditableField
            label="CPU Cores"
            value={cpucore?.toString()}
            onSave={async (value) => {
              await updateSpec(['cpucore'], parseInt(value) || value)
            }}
            placeholder="e.g., 24"
          />
        </dl>

        {/* Storage Information */}
        {specs.disks && Array.isArray(specs.disks) && specs.disks.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 flex items-center mb-3">
              <CircleStackIcon className="h-4 w-4 mr-2 text-gray-400" />
              Storage
            </h4>
            <div className="space-y-2">
              {specs.disks.map((disk: any, index: number) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium">Disk {index + 1}</div>
                  <div>Model: {disk.model || 'Unknown'}</div>
                  <div>Size: {disk.size_gb ? `${disk.size_gb}GB` : 'Unknown'}</div>
                  <div>Type: {disk.type || 'Unknown'}</div>
                  {disk.interface && <div>Interface: {disk.interface}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Network Information */}
        {specs.network && Array.isArray(specs.network) && specs.network.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 flex items-center mb-3">
              <WifiIcon className="h-4 w-4 mr-2 text-gray-400" />
              Network Interfaces
            </h4>
            <div className="space-y-2">
              {specs.network.map((nic: any, index: number) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium">{nic.interface || `Interface ${index + 1}`}</div>
                  {nic.mac && <div>MAC: {nic.mac}</div>}
                  {nic.speed_gbps && <div>Speed: {nic.speed_gbps}Gbps</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw specs display for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Specs (Development)</h4>
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(specs, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const assetId = params?.id as string

  const [asset, setAsset] = useState<AssetWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // State for editing user and applications
  const [editingOwner, setEditingOwner] = useState(false)
  const [editingApps, setEditingApps] = useState(false)

  // Load asset data
  useEffect(() => {
    if (!assetId) return

    const loadAsset = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getAsset(assetId)
        setAsset(data)
      } catch (err: any) {
        console.error('Error loading asset:', err)
        setError(err.message || 'Failed to load asset')
      } finally {
        setLoading(false)
      }
    }

    loadAsset()
  }, [assetId])

  // Update asset field
  const updateAssetField = async (updates: AssetUpdateRequest) => {
    if (!asset || updating) return

    setUpdating(true)
    try {
      const updatedAsset = await apiClient.updateAsset(asset.id, updates)
      setAsset({ ...asset, ...updatedAsset })
    } catch (error: any) {
      console.error('Error updating asset:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }

  // Update specs specifically
  const updateSpecs = async (newSpecs: Record<string, any>) => {
    await updateAssetField({ specs: newSpecs })
  }

  // Update owner
  const updateOwner = async (userId: string | null) => {
    await updateAssetField({ primary_owner_id: userId })
    // Refresh asset to get updated owner details
    const refreshedAsset = await apiClient.getAsset(assetId)
    setAsset(refreshedAsset)
  }

  // Update applications
  const updateApplications = async (applicationIds: string[]) => {
    await updateAssetField({ application_ids: applicationIds })
    // Refresh asset to get updated application details
    const refreshedAsset = await apiClient.getAsset(assetId)
    setAsset(refreshedAsset)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading asset...</div>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Asset</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'Asset not found'}</p>
          <div className="mt-6">
            <Link
              href="/assets"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Back to Assets
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const IconComponent = getAssetIcon(asset.type)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <div>
                <Link href="/" className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Home</span>
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
          <div className="flex items-center justify-between">
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
            {updating && (
              <div className="text-sm text-indigo-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Updating...
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Asset Information */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Asset Information
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <EditableField
                    label="Hostname"
                    value={asset.hostname}
                    onSave={async (value) => await updateAssetField({ hostname: value })}
                  />

                  <EditableField
                    label="FQDN"
                    value={asset.fqdn}
                    onSave={async (value) => await updateAssetField({ fqdn: value })}
                  />

                  <EditableField
                    label="Serial Number"
                    value={asset.serial_number}
                    onSave={async (value) => await updateAssetField({ serial_number: value })}
                  />

                  <EditableField
                    label="Vendor"
                    value={asset.vendor}
                    onSave={async (value) => await updateAssetField({ vendor: value })}
                  />

                  <EditableField
                    label="Model"
                    value={asset.model}
                    onSave={async (value) => await updateAssetField({ model: value })}
                  />

                  <EditableField
                    label="Type"
                    value={asset.type}
                    type="select"
                    options={ASSET_TYPES.map(type => ({ value: type.value, label: type.label }))}
                    onSave={async (value) => await updateAssetField({ type: value as AssetType })}
                  />

                  <EditableField
                    label="Status"
                    value={asset.status}
                    type="select"
                    options={ASSET_STATUSES.map(status => ({ value: status.value, label: status.label }))}
                    onSave={async (value) => await updateAssetField({ status: value as AssetStatus })}
                  />

                  <EditableField
                    label="Location"
                    value={asset.location}
                    onSave={async (value) => await updateAssetField({ location: value })}
                    placeholder="e.g., DC1-Rack-42-U10"
                  />
                </dl>

                {/* Primary Owner Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Primary Owner</dt>
                    <dd className="flex items-center justify-between">
                      {editingOwner ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <div className="flex-1">
                            <UserSelector
                              value={asset.primary_owner_id}
                              onChange={(userId) => {
                                updateOwner(userId)
                                setEditingOwner(false)
                              }}
                              placeholder="Select owner..."
                              clearable={true}
                            />
                          </div>
                          <button
                            onClick={() => setEditingOwner(false)}
                            className="inline-flex items-center p-1 border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={asset.primary_owner?.full_name ? 'text-gray-900' : 'text-gray-400 italic'}>
                            {asset.primary_owner?.full_name || 'No owner assigned'}
                          </span>
                          <button
                            onClick={() => setEditingOwner(true)}
                            className="ml-2 text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </dd>
                  </div>
                </div>

                {/* Applications Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Applications</dt>
                    <dd className="flex items-center justify-between">
                      {editingApps ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <div className="flex-1">
                            <ApplicationSelector
                              value={asset.applications?.map(app => app.id) || []}
                              onChange={(appIds) => {
                                updateApplications(appIds)
                                setEditingApps(false)
                              }}
                              multiple={true}
                              placeholder="Select applications..."
                            />
                          </div>
                          <button
                            onClick={() => setEditingApps(false)}
                            className="inline-flex items-center p-1 border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className={asset.applications && asset.applications.length > 0 ? 'text-gray-900' : 'text-gray-400 italic'}>
                              {asset.applications && asset.applications.length > 0
                                ? `${asset.applications.length} application${asset.applications.length === 1 ? '' : 's'} assigned`
                                : 'No applications assigned'}
                            </span>
                            {asset.applications && asset.applications.length > 0 && (
                              <div className="mt-1 space-x-1">
                                {asset.applications.map((app: any) => (
                                  <span key={app.id} className="inline-block text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                                    {app.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setEditingApps(true)}
                            className="ml-2 text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </dd>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <EditableField
                    label="Notes"
                    value={asset.notes}
                    onSave={async (value) => await updateAssetField({ notes: value })}
                    multiline={true}
                    placeholder="Add notes about this asset..."
                  />
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <TechnicalSpecifications
              specs={asset.specs || {}}
              onUpdateSpecs={updateSpecs}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Overview
                </h3>
                <div className="space-y-4">
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Primary Owner</span>
                    <span className="font-medium text-gray-900">
                      {asset.primary_owner?.full_name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-medium text-gray-900">
                      {new Date(asset.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Owner Details */}
            {asset.primary_owner && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Primary Owner
                  </h3>
                  <div className="space-y-2">
                    <div className="font-medium text-gray-900">{asset.primary_owner.full_name}</div>
                    <div className="text-sm text-gray-600">{asset.primary_owner.email}</div>
                    {asset.primary_owner.department && (
                      <div className="text-sm text-gray-600">{asset.primary_owner.department}</div>
                    )}
                    {asset.primary_owner.title && (
                      <div className="text-sm text-gray-500">{asset.primary_owner.title}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Applications */}
            {asset.applications && asset.applications.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                    <RectangleStackIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Applications ({asset.applications.length})
                  </h3>
                  <div className="space-y-3">
                    {asset.applications.map((application) => (
                      <div
                        key={application.id}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start">
                          <Link
                            href={`/applications/${application.id}`}
                            className="flex-1 hover:text-indigo-600 transition-colors"
                          >
                            <div className="font-medium text-gray-900">
                              {application.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.environment} • {application.application_type}
                            </div>
                            {application.description && (
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {application.description}
                              </div>
                            )}
                          </Link>

                          {application.access_url && (
                            <a
                              href={application.access_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 text-indigo-600 hover:text-indigo-900 text-sm flex-shrink-0"
                            >
                              Open ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Management Controllers */}
            {asset.management_controllers && asset.management_controllers.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Management Controllers
                  </h3>
                  <div className="space-y-3">
                    {asset.management_controllers.map((controller) => (
                      <div key={controller.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900 capitalize">
                              {controller.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              {controller.address}:{controller.port}
                            </div>
                          </div>
                          {controller.ui_url && (
                            <a
                              href={controller.ui_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900 text-sm"
                            >
                              Open
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
        </div>
      </div>
    </div>
  )
}
