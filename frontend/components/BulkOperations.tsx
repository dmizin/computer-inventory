'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  CheckIcon,
  XMarkIcon,
  UserIcon,
  RectangleStackIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import {
  Asset,
  BulkAssetUpdate,
  BulkApplicationAssignment,
  ASSET_STATUSES
} from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import UserSelector from '@/components/UserSelector'
import ApplicationSelector from '@/components/ApplicationSelector'
import { clsx } from 'clsx'

interface BulkOperationsProps {
  selectedAssets: Asset[]
  onOperationComplete: () => void
  onClose: () => void
  isOpen: boolean
}

type BulkOperationType = 'owner' | 'status' | 'applications' | 'notes' | 'assign-app'

export default function BulkOperations({
  selectedAssets,
  onOperationComplete,
  onClose,
  isOpen
}: BulkOperationsProps) {
  const [operationType, setOperationType] = useState<BulkOperationType>('owner')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state for different operation types
  const [bulkData, setBulkData] = useState({
    primary_owner_id: '',
    status: 'active' as any,
    notes: '',
    application_ids: [] as string[],
    assign_application_id: ''
  })

  // Load applications for assignment operations
  const { data: availableApplications = [] } = useSWR(
    'applications-for-bulk',
    () => apiClient.getApplications({ limit: 100 }),
    swrConfig
  )

  const handleBulkUpdate = async () => {
    if (selectedAssets.length === 0) {
      setError('No assets selected')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const assetIds = selectedAssets.map(asset => asset.id)

      if (operationType === 'assign-app') {
        // Special case: bulk assign single application
        if (!bulkData.assign_application_id) {
          setError('Please select an application to assign')
          setIsProcessing(false)
          return
        }

        const assignmentData: BulkApplicationAssignment = {
          application_id: bulkData.assign_application_id,
          asset_ids: assetIds
        }

        const result = await apiClient.bulkAssignApplication(assignmentData)
        setSuccess(`Successfully assigned application to ${result.assigned_count} assets`)
      } else {
        // Regular bulk update
        const updates: any = {}

        switch (operationType) {
          case 'owner':
            if (bulkData.primary_owner_id) {
              updates.primary_owner_id = bulkData.primary_owner_id
            }
            break
          case 'status':
            updates.status = bulkData.status
            break
          case 'notes':
            if (bulkData.notes.trim()) {
              updates.notes = bulkData.notes
            }
            break
          case 'applications':
            if (bulkData.application_ids.length > 0) {
              updates.application_ids = bulkData.application_ids
            }
            break
        }

        if (Object.keys(updates).length === 0) {
          setError('No updates specified')
          setIsProcessing(false)
          return
        }

        const updateData: BulkAssetUpdate = {
          asset_ids: assetIds,
          updates
        }

        const result = await apiClient.bulkUpdateAssets(updateData)
        setSuccess(`Successfully updated ${result.updated_count} assets`)
      }

      // Give user time to see success message, then close
      setTimeout(() => {
        onOperationComplete()
        onClose()
      }, 2000)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to perform bulk operation')
    } finally {
      setIsProcessing(false)
    }
  }

  const getOperationDescription = () => {
    const count = selectedAssets.length
    switch (operationType) {
      case 'owner':
        return `Assign owner to ${count} selected assets`
      case 'status':
        return `Change status of ${count} selected assets`
      case 'applications':
        return `Associate applications with ${count} selected assets`
      case 'notes':
        return `Add notes to ${count} selected assets`
      case 'assign-app':
        return `Assign single application to ${count} selected assets`
      default:
        return `Update ${count} selected assets`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Bulk Operations
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Selected Assets Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-blue-800">
                <strong>{selectedAssets.length}</strong> assets selected for bulk operation
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedAssets.slice(0, 5).map((asset) => (
                <span
                  key={asset.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {asset.hostname}
                </span>
              ))}
              {selectedAssets.length > 5 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  +{selectedAssets.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Operation Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Operation Type
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: 'owner', label: 'Change Owner', icon: UserIcon, desc: 'Assign or change asset owner' },
                { key: 'status', label: 'Change Status', icon: ExclamationTriangleIcon, desc: 'Update asset status' },
                { key: 'applications', label: 'Set Applications', icon: RectangleStackIcon, desc: 'Replace application associations' },
                { key: 'assign-app', label: 'Assign App', icon: RectangleStackIcon, desc: 'Add single application to assets' },
                { key: 'notes', label: 'Add Notes', icon: ExclamationTriangleIcon, desc: 'Add or replace notes' }
              ].map((op) => (
                <button
                  key={op.key}
                  onClick={() => setOperationType(op.key as BulkOperationType)}
                  className={clsx(
                    'relative p-3 rounded-lg border text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
                    operationType === op.key
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center">
                    <op.icon className="h-5 w-5 mr-3" />
                    <div>
                      <div className="text-sm font-medium">{op.label}</div>
                      <div className="text-xs text-gray-500">{op.desc}</div>
                    </div>
                  </div>
                  {operationType === op.key && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Operation-specific Forms */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {getOperationDescription()}
            </h4>

            {operationType === 'owner' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Owner
                </label>
                <UserSelector
                  value={bulkData.primary_owner_id}
                  onChange={(userId) => setBulkData({ ...bulkData, primary_owner_id: userId || '' })}
                  placeholder="Select new owner for selected assets..."
                  clearable={true}
                />
              </div>
            )}

            {operationType === 'status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={bulkData.status}
                  onChange={(e) => setBulkData({ ...bulkData, status: e.target.value as any })}
                >
                  {ASSET_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {operationType === 'applications' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applications (replaces existing associations)
                </label>
                <ApplicationSelector
                  value={bulkData.application_ids}
                  onChange={(appIds) => setBulkData({ ...bulkData, application_ids: appIds })}
                  multiple={true}
                  placeholder="Select applications to associate with selected assets..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will replace all existing application associations for the selected assets.
                </p>
              </div>
            )}

            {operationType === 'assign-app' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application to Assign
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={bulkData.assign_application_id}
                  onChange={(e) => setBulkData({ ...bulkData, assign_application_id: e.target.value })}
                >
                  <option value="">Select an application...</option>
                  {availableApplications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.name} ({app.environment})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This will add the selected application to all selected assets without removing existing associations.
                </p>
              </div>
            )}

            {operationType === 'notes' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={bulkData.notes}
                  onChange={(e) => setBulkData({ ...bulkData, notes: e.target.value })}
                  placeholder="Enter notes to add to selected assets..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will replace existing notes on the selected assets.
                </p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
                <div className="text-sm text-green-800">{success}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Apply Changes'
              )}
            </button>
          </div>

          {/* Warning Notice */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> Bulk operations will modify {selectedAssets.length} assets simultaneously.
                This action cannot be undone. Please review your selections carefully before proceeding.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper hook for managing bulk operations in parent components
export function useBulkOperations() {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)

  const toggleAssetSelection = (asset: Asset) => {
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === asset.id)
      if (exists) {
        return prev.filter(a => a.id !== asset.id)
      } else {
        return [...prev, asset]
      }
    })
  }

  const selectAllAssets = (assets: Asset[]) => {
    setSelectedAssets(assets)
  }

  const clearSelection = () => {
    setSelectedAssets([])
  }

  const openBulkModal = () => {
    if (selectedAssets.length > 0) {
      setShowBulkModal(true)
    }
  }

  const closeBulkModal = () => {
    setShowBulkModal(false)
  }

  const handleBulkOperationComplete = () => {
    clearSelection()
    // Parent component should refresh data
  }

  return {
    selectedAssets,
    showBulkModal,
    toggleAssetSelection,
    selectAllAssets,
    clearSelection,
    openBulkModal,
    closeBulkModal,
    handleBulkOperationComplete
  }
}
