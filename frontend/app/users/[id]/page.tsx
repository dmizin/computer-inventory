'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CalendarIcon,
  ServerIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { User, Asset, AssetType } from '@/lib/types'
import { apiClient, swrConfig } from '@/lib/api-client'
import { useAuth, canEditAssets } from '@/lib/use-auth'
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

// User Edit Modal Component
interface UserEditModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSave: (user: User) => void
}

function UserEditModal({ user, isOpen, onClose, onSave }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    username: user.username,
    full_name: user.full_name,
    email: user.email || '',
    department: user.department || '',
    title: user.title || '',
    active: user.active
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const updatedUser = await apiClient.updateUser(user.id, formData)
      onSave(updatedUser)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Active user
              </label>
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

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { user: currentUser } = useAuth()
  const canEdit = canEditAssets(currentUser)

  const [showEditModal, setShowEditModal] = useState(false)

  // Fetch user details
  const { data: user, error: userError, isLoading: userLoading, mutate: mutateUser } = useSWR(
    userId ? ['user', userId] : null,
    () => apiClient.getUser(userId),
    swrConfig
  )

  // Fetch user's assets
  const { data: assets = [], error: assetsError, isLoading: assetsLoading } = useSWR(
    userId ? ['user-assets', userId] : null,
    () => apiClient.getUserAssets(userId, { limit: 100 }),
    swrConfig
  )

  const handleEditUser = () => {
    setShowEditModal(true)
  }

  const handleUserUpdated = (updatedUser: User) => {
    mutateUser(updatedUser, false)
  }

  const handleDeleteUser = async () => {
    if (!user || !confirm(`Are you sure you want to deactivate ${user.full_name}?`)) return

    try {
      await apiClient.deleteUser(user.id)
      router.push('/users')
    } catch (err) {
      alert('Failed to deactivate user')
    }
  }

  if (userError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600">Error loading user: {userError.message}</div>
            <Link href="/users" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
              ← Back to Users
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-gray-500">Loading user...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <Link href="/users" className="text-gray-400 hover:text-gray-500">
                    <ArrowLeftIcon className="flex-shrink-0 h-5 w-5" />
                    <span className="sr-only">Back to users</span>
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-500">/</span>
                  <Link href="/users" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                    Users
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-500">/</span>
                  <span className="ml-4 text-sm font-medium text-gray-900">
                    {user.full_name}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        {/* User Info Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-10 w-10 text-gray-500" />
                  </div>
                </div>
                <div className="ml-6">
                  <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  <div className="mt-1">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      user.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    )}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditUser}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" />
                    Deactivate
                  </button>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {user.email && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      <a href={`mailto:${user.email}`} className="text-indigo-600 hover:text-indigo-500">
                        {user.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {user.department && (
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="text-sm text-gray-900">{user.department}</dd>
                  </div>
                </div>
              )}

              {user.title && (
                <div className="flex items-center">
                  <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Title</dt>
                    <dd className="text-sm text-gray-900">{user.title}</dd>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Joined</dt>
                  <dd className="text-sm text-gray-900">
                    {format(new Date(user.created_at), 'MMMM d, yyyy')}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owned Assets */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Owned Assets
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Assets owned by this user ({assets.length} total)
            </p>
          </div>

          {assetsLoading ? (
            <div className="px-6 py-4 text-center">
              <div className="text-gray-500">Loading assets...</div>
            </div>
          ) : assetsError ? (
            <div className="px-6 py-4 text-center">
              <div className="text-red-600">Error loading assets: {assetsError.message}</div>
            </div>
          ) : assets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assets owned</h3>
              <p className="mt-1 text-sm text-gray-500">
                This user doesn't own any assets yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
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
                  {assets.map((asset) => {
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
                          <Link
                            href={`/assets/${asset.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </Link>
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

      {/* Edit User Modal */}
      {user && (
        <UserEditModal
          user={user}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUserUpdated}
        />
      )}
    </div>
  )
}
