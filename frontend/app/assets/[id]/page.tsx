'use client'

import { useState, useEffect } from 'react'
import { ServerIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function DebugAssetsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true)
        setError(null)

        console.log('🔍 Starting assets fetch...')

        // Try the API call
        const response = await fetch('/api/assets')

        console.log('📡 Response status:', response.status)
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

        const responseText = await response.text()
        console.log('📄 Raw response:', responseText)

        setDebugInfo({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Try to parse JSON
        let jsonData
        try {
          jsonData = JSON.parse(responseText)
        } catch (parseError) {
          throw new Error(`JSON Parse Error: ${parseError}`)
        }

        console.log('✅ Parsed data:', jsonData)
        setData(jsonData)

      } catch (err) {
        console.error('❌ Assets fetch failed:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assets Debug Page</h1>
          <p className="text-sm text-gray-500">Debugging assets API connection</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Loading</div>
            <div className={`text-lg font-semibold ${loading ? 'text-yellow-600' : 'text-gray-900'}`}>
              {loading ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Error</div>
            <div className={`text-lg font-semibold ${error ? 'text-red-600' : 'text-green-600'}`}>
              {error ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Data Received</div>
            <div className={`text-lg font-semibold ${data ? 'text-green-600' : 'text-gray-400'}`}>
              {data ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Loading assets from API...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">API Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {data && !loading && !error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ServerIcon className="h-5 w-5 text-green-400 mr-3" />
              <span className="text-green-800">Successfully loaded assets data!</span>
            </div>
          </div>
        )}

        {/* Debug Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Debug Information</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">API Endpoint</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/assets</code>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700">Response Status</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {debugInfo.status || 'Not yet called'} {debugInfo.statusText || ''}
              </code>
            </div>

            {debugInfo.headers && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Response Headers</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(debugInfo.headers, null, 2)}
                </pre>
              </div>
            )}

            {debugInfo.rawResponse && (
              <div>
                <h3 className="text-sm font-medium text-gray-700">Raw Response (first 500 chars)</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {debugInfo.rawResponse}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Data Display */}
        {data && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Received Data</h2>

            {/* Try to show assets if they exist in the expected format */}
            {data.data && Array.isArray(data.data) ? (
              <div>
                <p className="text-sm text-green-600 mb-4">
                  ✅ Found {data.data.length} assets in expected format
                </p>

                {data.data.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Hostname
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Vendor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.data.slice(0, 5).map((asset: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {asset.hostname || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {asset.type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {asset.status || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {asset.vendor || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.data.length > 5 && (
                      <p className="mt-2 text-sm text-gray-500">
                        Showing first 5 of {data.data.length} assets
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-yellow-600 mb-4">
                  ⚠️ Data not in expected format (expected data.data array)
                </p>
              </div>
            )}

            {/* Raw JSON */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                View Raw JSON Response
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                fetch('/api/assets')
                  .then(r => r.text())
                  .then(text => {
                    console.log('Manual test result:', text)
                    alert(`Manual API test completed. Check console for details. Response length: ${text.length}`)
                  })
                  .catch(err => {
                    console.error('Manual test failed:', err)
                    alert(`Manual API test failed: ${err.message}`)
                  })
              }}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Test API Call
            </button>
            <a
              href="/api/assets"
              target="_blank"
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Open API in New Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
