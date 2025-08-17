// app/reports/page.tsx
import { ChartBarIcon } from '@heroicons/react/24/outline'

const reportTypes = [
  {
    name: 'Asset Summary Report',
    description: 'Overview of all assets by type, status, and location',
    status: 'Coming Soon'
  },
  {
    name: 'User Assets Report',
    description: 'Assets assigned to each user with ownership details',
    status: 'Coming Soon'
  },
  {
    name: 'Application Mapping Report',
    description: 'Applications and their associated servers',
    status: 'Coming Soon'
  },
  {
    name: 'Hardware Utilization Report',
    description: 'Hardware specs and utilization across assets',
    status: 'Coming Soon'
  }
]

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate reports and analytics for your inventory data
          </p>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {reportTypes.map((report) => (
            <div
              key={report.name}
              className="bg-white overflow-hidden shadow rounded-lg p-6"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {report.description}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {report.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900">
                Reports Coming Soon
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Comprehensive reporting features are being developed to help you analyze your inventory data.
                  Future reports will include:
                </p>
                <ul className="mt-2 space-y-1">
                  <li>• Asset lifecycle and maintenance tracking</li>
                  <li>• Compliance and security reporting</li>
                  <li>• Cost analysis and depreciation reports</li>
                  <li>• Custom report builder with filters</li>
                  <li>• Scheduled report delivery</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
