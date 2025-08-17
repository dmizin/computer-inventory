// app/page.tsx
import Link from 'next/link'
import {
  ServerIcon,
  UserIcon,
  RectangleStackIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const stats = [
  { name: 'Total Assets', value: '0', icon: ServerIcon, href: '/assets' },
  { name: 'Active Users', value: '0', icon: UserIcon, href: '/users' },
  { name: 'Applications', value: '0', icon: RectangleStackIcon, href: '/applications' },
  { name: 'Reports', value: '0', icon: ChartBarIcon, href: '/reports' },
]

const quickActions = [
  { name: 'Add New Asset', href: '/assets', description: 'Register a new server, workstation, or device' },
  { name: 'Create User', href: '/users', description: 'Add a new system user for asset ownership' },
  { name: 'New Application', href: '/applications', description: 'Document a new application or service' },
  { name: 'Bulk Operations', href: '/assets', description: 'Perform operations on multiple assets' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to the Computer Inventory Tracking System
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.name}
              href={stat.href}
              className="relative bg-white py-6 px-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Common tasks to get started with your inventory management
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:border-gray-400"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {action.name}
                    </span>
                    <p className="mt-1 text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900">
                Getting Started
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Welcome to your enhanced inventory system! Here's what's new:
                </p>
                <ul className="mt-2 space-y-1">
                  <li>• <strong>User Management</strong> - Assign asset owners and track contact information</li>
                  <li>• <strong>Application Tracking</strong> - Map applications to servers with environment and criticality</li>
                  <li>• <strong>Enhanced Assets</strong> - Add notes, owners, and application associations</li>
                  <li>• <strong>Bulk Operations</strong> - Update multiple assets at once</li>
                  <li>• <strong>Advanced Filtering</strong> - Find assets by owner, applications, and more</li>
                </ul>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    href="/assets"
                    className="bg-blue-100 px-2 py-1.5 rounded-md text-xs font-medium text-blue-800 hover:bg-blue-200"
                  >
                    Start with Assets
                  </Link>
                  <Link
                    href="/users"
                    className="ml-3 bg-blue-100 px-2 py-1.5 rounded-md text-xs font-medium text-blue-800 hover:bg-blue-200"
                  >
                    Manage Users
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
