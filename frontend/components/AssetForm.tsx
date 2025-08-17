'use client'

import { useState, useEffect } from 'react'
import {
  AssetCreateRequest,
  AssetUpdateRequest,
  Asset,
  ASSET_TYPES,
  ASSET_STATUSES,
  ManagementControllerCreateRequest,
  MANAGEMENT_CONTROLLER_TYPES
} from '@/lib/types'
import UserSelector from '@/components/UserSelector'
import ApplicationSelector from '@/components/ApplicationSelector'
import { clsx } from 'clsx'
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  UserIcon,
  RectangleStackIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'

interface EnhancedAssetFormProps {
  asset?: Asset | null
  isOpen: boolean
  onClose: () => void
  onSave: (asset: Asset) => void
  mode?: 'create' | 'edit'
}

interface AssetFormData extends Omit<AssetCreateRequest, 'specs'> {
  specs: {
    cpu?: {
      model?: string
      count?: number
      cores?: number
      threads?: number
    }
    memory_gb?: number
    disks?: Array<{
      model?: string
      size_gb?: number
      type?: string
      interface?: string
    }>
    network?: Array<{
      interface?: string
      mac?: string
      speed_gbps?: number
    }>
    [key: string]: any
  }
  management_controllers?: ManagementControllerCreateRequest[]
}

export default function EnhancedAssetForm({
  asset,
  isOpen,
  onClose,
  onSave,
  mode = asset ? 'edit' : 'create'
}: EnhancedAssetFormProps) {
  const [formData, setFormData] = useState<AssetFormData>({
    hostname: '',
    fqdn: '',
    serial_number: '',
    vendor: '',
    model: '',
    type: 'server',
    status: 'active',
    location: '',
    primary_owner_id: '',
    notes: '',
    application_ids: [],
    specs: {
      cpu: { model: '', count: 1, cores: 1, threads: 1 },
      memory_gb: 0,
      disks: [{ model: '', size_gb: 0, type: 'SSD', interface: 'SATA' }],
      network: [{ interface: 'eth0', mac: '', speed_gbps: 1 }]
    },
    management_controllers: []
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'specs' | 'mgmt' | 'relationships'>('basic')

  // Initialize form data when asset changes
  useEffect(() => {
    if (asset) {
      setFormData({
        hostname: asset.hostname,
        fqdn: asset.fqdn || '',
        serial_number: asset.serial_number || '',
        vendor: asset.vendor || '',
        model: asset.model || '',
        type: asset.type,
        status: asset.status,
        location: asset.location || '',
        primary_owner_id: asset.primary_owner_id || '',
        notes: asset.notes || '',
        application_ids: [], // Will be populated from asset.applications if available
        specs: {
          cpu: asset.specs?.cpu || { model: '', count: 1, cores: 1, threads: 1 },
          memory_gb: asset.specs?.memory_gb || 0,
          disks: asset.specs?.disks || [{ model: '', size_gb: 0, type: 'SSD', interface: 'SATA' }],
          network: asset.specs?.network || [{ interface: 'eth0', mac: '', speed_gbps: 1 }],
          ...asset.specs
        },
        management_controllers: []
      })
    } else {
      // Reset form for new asset
      setFormData({
        hostname: '',
        fqdn: '',
        serial_number: '',
        vendor: '',
        model: '',
        type: 'server',
        status: 'active',
        location: '',
        primary_owner_id: '',
        notes: '',
        application_ids: [],
        specs: {
          cpu: { model: '', count: 1, cores: 1, threads: 1 },
          memory_gb: 0,
          disks: [{ model: '', size_gb: 0, type: 'SSD', interface: 'SATA' }],
          network: [{ interface: 'eth0', mac: '', speed_gbps: 1 }]
        },
        management_controllers: []
      })
    }
  }, [asset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Clean up the form data
      const submitData: AssetCreateRequest | AssetUpdateRequest = {
        hostname: formData.hostname,
        fqdn: formData.fqdn || undefined,
        serial_number: formData.serial_number || undefined,
        vendor: formData.vendor || undefined,
        model: formData.model || undefined,
        type: formData.type,
        status: formData.status,
        location: formData.location || undefined,
        primary_owner_id: formData.primary_owner_id || undefined,
        notes: formData.notes || undefined,
        application_ids: formData.application_ids,
        specs: formData.specs
      }

      // Call the appropriate API method (would need to be implemented in the parent component)
      // This is a placeholder - the parent component should handle the actual API call
      const savedAsset = mode === 'edit' && asset
        ? await updateAsset(asset.id, submitData)
        : await createAsset(submitData)

      onSave(savedAsset)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save asset')
    } finally {
      setSaving(false)
    }
  }

  // Placeholder functions - these should be passed as props or imported
  const updateAsset = async (id: string, data: AssetUpdateRequest): Promise<Asset> => {
    throw new Error('updateAsset not implemented')
  }

  const createAsset = async (data: AssetCreateRequest): Promise<Asset> => {
    throw new Error('createAsset not implemented')
  }

  // Helper functions for dynamic arrays
  const addDisk = () => {
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        disks: [...(formData.specs.disks || []), { model: '', size_gb: 0, type: 'SSD', interface: 'SATA' }]
      }
    })
  }

  const removeDisk = (index: number) => {
    const newDisks = formData.specs.disks?.filter((_, i) => i !== index) || []
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        disks: newDisks
      }
    })
  }

  const updateDisk = (index: number, field: string, value: any) => {
    const newDisks = formData.specs.disks?.map((disk, i) =>
      i === index ? { ...disk, [field]: value } : disk
    ) || []
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        disks: newDisks
      }
    })
  }

  const addNetworkInterface = () => {
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        network: [...(formData.specs.network || []), { interface: 'eth0', mac: '', speed_gbps: 1 }]
      }
    })
  }

  const removeNetworkInterface = (index: number) => {
    const newNetwork = formData.specs.network?.filter((_, i) => i !== index) || []
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        network: newNetwork
      }
    })
  }

  const updateNetworkInterface = (index: number, field: string, value: any) => {
    const newNetwork = formData.specs.network?.map((nic, i) =>
      i === index ? { ...nic, [field]: value } : nic
    ) || []
    setFormData({
      ...formData,
      specs: {
        ...formData.specs,
        network: newNetwork
      }
    })
  }

  const addManagementController = () => {
    setFormData({
      ...formData,
      management_controllers: [
        ...(formData.management_controllers || []),
        { type: 'ilo', address: '', port: 443 }
      ]
    })
  }

  const removeManagementController = (index: number) => {
    const newControllers = formData.management_controllers?.filter((_, i) => i !== index) || []
    setFormData({
      ...formData,
      management_controllers: newControllers
    })
  }

  const updateManagementController = (index: number, field: string, value: any) => {
    const newControllers = formData.management_controllers?.map((controller, i) =>
      i === index ? { ...controller, [field]: value } : controller
    ) || []
    setFormData({
      ...formData,
      management_controllers: newControllers
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white max-h-[95vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium text-gray-900">
              {mode === 'edit' ? 'Edit Asset' : 'Create New Asset'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'basic', label: 'Basic Info', icon: CpuChipIcon },
                { key: 'specs', label: 'Hardware Specs', icon: CpuChipIcon },
                { key: 'mgmt', label: 'Management', icon: CpuChipIcon },
                { key: 'relationships', label: 'Owner & Apps', icon: UserIcon }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={clsx(
                    'flex items-center py-2 px-1 border-b-2 font-medium text-sm',
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hostname *
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.hostname}
                      onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      FQDN
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.fqdn}
                      onChange={(e) => setFormData({ ...formData, fqdn: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Asset Type *
                    </label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      {ASSET_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
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
                      {ASSET_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Vendor
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Model
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., DC1-Rack-42-U10"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hardware Specs Tab */}
            {activeTab === 'specs' && (
              <div className="space-y-8">
                {/* CPU Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">CPU Information</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CPU Model</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={formData.specs.cpu?.model || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          specs: {
                            ...formData.specs,
                            cpu: { ...formData.specs.cpu, model: e.target.value }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Count</label>
                      <input
                        type="number"
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={formData.specs.cpu?.count || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          specs: {
                            ...formData.specs,
                            cpu: { ...formData.specs.cpu, count: parseInt(e.target.value) }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cores</label>
                      <input
                        type="number"
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={formData.specs.cpu?.cores || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          specs: {
                            ...formData.specs,
                            cpu: { ...formData.specs.cpu, cores: parseInt(e.target.value) }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Threads</label>
                      <input
                        type="number"
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        value={formData.specs.cpu?.threads || 1}
                        onChange={(e) => setFormData({
                          ...formData,
                          specs: {
                            ...formData.specs,
                            cpu: { ...formData.specs.cpu, threads: parseInt(e.target.value) }
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Memory Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Memory</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Memory (GB)</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formData.specs.memory_gb || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        specs: {
                          ...formData.specs,
                          memory_gb: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                </div>

                {/* Disks Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Storage Devices</h4>
                    <button
                      type="button"
                      onClick={addDisk}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Disk
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.specs.disks?.map((disk, index) => (
                      <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-5 border rounded-md p-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Model</label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={disk.model || ''}
                            onChange={(e) => updateDisk(index, 'model', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Size (GB)</label>
                          <input
                            type="number"
                            min="0"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={disk.size_gb || 0}
                            onChange={(e) => updateDisk(index, 'size_gb', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={disk.type || 'SSD'}
                            onChange={(e) => updateDisk(index, 'type', e.target.value)}
                          >
                            <option value="SSD">SSD</option>
                            <option value="NVMe">NVMe</option>
                            <option value="HDD">HDD</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Interface</label>
                          <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={disk.interface || 'SATA'}
                            onChange={(e) => updateDisk(index, 'interface', e.target.value)}
                          >
                            <option value="SATA">SATA</option>
                            <option value="SAS">SAS</option>
                            <option value="NVMe">NVMe</option>
                            <option value="U.2">U.2</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeDisk(index)}
                            className="inline-flex items-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Network Interfaces</h4>
                    <button
                      type="button"
                      onClick={addNetworkInterface}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Interface
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.specs.network?.map((nic, index) => (
                      <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-4 border rounded-md p-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Interface</label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={nic.interface || ''}
                            onChange={(e) => updateNetworkInterface(index, 'interface', e.target.value)}
                            placeholder="eth0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">MAC Address</label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={nic.mac || ''}
                            onChange={(e) => updateNetworkInterface(index, 'mac', e.target.value)}
                            placeholder="00:11:22:33:44:55"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Speed (Gbps)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={nic.speed_gbps || 1}
                            onChange={(e) => updateNetworkInterface(index, 'speed_gbps', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeNetworkInterface(index)}
                            className="inline-flex items-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Management Controllers Tab */}
            {activeTab === 'mgmt' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">Management Controllers</h4>
                  <button
                    type="button"
                    onClick={addManagementController}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Controller
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.management_controllers?.map((controller, index) => (
                    <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-4 border rounded-md p-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          value={controller.type}
                          onChange={(e) => updateManagementController(index, 'type', e.target.value)}
                        >
                          {MANAGEMENT_CONTROLLER_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          value={controller.address}
                          onChange={(e) => updateManagementController(index, 'address', e.target.value)}
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Port</label>
                        <input
                          type="number"
                          min="1"
                          max="65535"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          value={controller.port || 443}
                          onChange={(e) => updateManagementController(index, 'port', parseInt(e.target.value) || 443)}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeManagementController(index)}
                          className="inline-flex items-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!formData.management_controllers || formData.management_controllers.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      No management controllers configured. Click "Add Controller" to add one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Relationships Tab */}
            {activeTab === 'relationships' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Primary Owner
                  </label>
                  <UserSelector
                    value={formData.primary_owner_id}
                    onChange={(userId) => setFormData({ ...formData, primary_owner_id: userId || '' })}
                    clearable={true}
                    placeholder="Select an owner for this asset..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <RectangleStackIcon className="h-4 w-4 mr-2" />
                    Applications
                  </label>
                  <ApplicationSelector
                    value={formData.application_ids || []}
                    onChange={(appIds) => setFormData({ ...formData, application_ids: appIds })}
                    multiple={true}
                    placeholder="Select applications running on this asset..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes about this asset (maintenance history, special configurations, etc.)"
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              {error && (
                <div className="mr-auto text-red-600 text-sm">{error}</div>
              )}
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
                {saving ? 'Saving...' : (mode === 'edit' ? 'Update Asset' : 'Create Asset')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
