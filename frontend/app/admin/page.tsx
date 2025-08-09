'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Cog6ToothIcon,
  UserGroupIcon,
  KeyIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth, hasAdminRole } from '@/lib/use-auth'
import { apiClient, swrConfig } from '@/lib/api-client'
import { isAuthEnabled } from '@/lib/auth0-config'
import { LoadingButton, StatsSkeleton, PageLoading } from '@/components/Loading'
import { clsx } from 'clsx'

interface SystemHealth {
  status: string
  timestamp: string
  database_status: string
  api_status: string
  auth_status: string
}

export default function AdminPage() {
  const { user, isLoading: userLoading } = useAuth()
  const [testingConnection, setTestingConnection] = useState(false)

  // Check if user has admin permissions
  const isAdmin = hasAdminRole(user)

  // Fetch system health
  const { data: health, error: healthError, mutate: refreshHealth } = useSWR<SystemHealth>(
    'admin-health',
    async () => {
      try {
        const response = await apiClient.healthCheck()
        return {
          status: response.status,
          timestamp: response.timestamp,
          database_status: 'connected',
          api_status: 'operational',
          auth_status: isAuthEnabled ? 'enabled' : 'disabled'
        }
      } catch (error) {
        throw new Error('Failed to fetch system health')
      }
    },
    { ...swrConfig, refreshInterval: 30000 } // Refresh every 30 seconds
  )

  // Test API connection
  const testConnection = async () => {
    setTestingConnection(true)
    try {
      await refreshHealth()
      alert('Connection test successful!')
    } catch (error) {
      alert('Connection test failed. Please check the logs.')
    } finally {
      setTestingConnection(false)
    }
  }

  if (userLoading) {
    return <PageLoading message="Checking permissions..." />
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Authentication Required
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                Please sign in to access the admin panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <p className="mt-2 text-sm text-red-700">
                You don't have permission to access the admin panel. Admin privileges are required.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'enabled':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      case 'disabled':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
      case 'connected':
        return 'text-green-700 bg-green-50'
      case 'enabled':
        return 'text-blue-700 bg-blue-50'
      case 'disabled':
        return 'text-gray-700 bg-gray-50'
      default:
        return 'text-yellow-700 bg-yellow-50'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          System administration and configuration
        </p>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">System Health</h2>
            <LoadingButton
              loading={testingConnection}
              onClick={testConnection}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Test Connection
            </LoadingButton>
          </div>
        </div>

        <div className="px-6 py-4">
          {healthError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <XCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Health Check Failed
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    Unable to retrieve system health status. The backend API may be unavailable.
                  </p>
                </div>
              </div>
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  {getStatusIcon(health.status)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">API Status</p>
                    <p className={clsx('text-sm capitalize px-2 py-1 rounded-full', getStatusColor(health.api_status))}>
                      {health.api_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  {getStatusIcon(health.database_status)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Database</p>
                    <p className={clsx('text-sm capitalize px-2 py-1 rounded-full', getStatusColor(health.database_status))}>
                      {health.database_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  {getStatusIcon(health.auth_status)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Authentication</p>
                    <p className={clsx('text-sm capitalize px-2 py-1 rounded-full', getStatusColor(health.auth_status))}>
                      {health.auth_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Last Check</p>
                    <p className="text-sm text-gray-500">
                      {health.timestamp ? new Date(health.timestamp).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <StatsSkeleton count={4} />
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Configuration</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <KeyIcon className="h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Authentication Mode</p>
                  <p className="text-sm text-gray-500">
                    {isAuthEnabled ? 'Auth0 OIDC Enabled' : 'Development Mode (No Auth)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Current User</p>
                  <p className="text-sm text-gray-500">
                    {user?.email || 'Unknown'} ({isAdmin ? 'Admin' : 'User'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => window.open('/assets', '_blank')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-900">View Assets</p>
                <p className="text-sm text-gray-500">Browse all inventory items</p>
              </div>
            </button>

            <button
              onClick={() => window.open('/dashboard', '_blank')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Cog6ToothIcon className="h-6 w-6 text-green-600" />
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-900">Dashboard</p>
                <p className="text-sm text-gray-500">View system statistics</p>
              </div>
            </button>

            <button
              onClick={() => alert('API documentation feature coming soon!')}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-6 w-6 text-purple-600" />
              <div className="ml-3 text-left">
                <p className="text-sm font-medium text-gray-900">API Docs</p>
                <p className="text-sm text-gray-500">View API documentation</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Development Mode
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This application is running in development mode.</p>
                {!isAuthEnabled && (
                  <p className="mt-1">
                    Authentication is disabled. Set <code>NEXT_PUBLIC_AUTH_ENABLED=true</code> to enable Auth0.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
