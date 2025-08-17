// app/settings/page.tsx
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure your inventory system preferences
          </p>
        </div>

        {/* Settings placeholder */}
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Settings Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            System configuration options will be available in a future release.
          </p>
        </div>
      </div>
    </div>
  )
}
