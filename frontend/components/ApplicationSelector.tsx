// components/ApplicationSelector.tsx - Fixed imports
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUpDownIcon, CheckIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import { Application, ENVIRONMENTS, CRITICALITY_LEVELS } from '@/lib/types'
import { apiClient } from '@/lib/api-client'
import { clsx } from 'clsx'

interface ApplicationSelectorProps {
  value?: string[]
  onChange: (applicationIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  multiple?: boolean
  maxSelections?: number
}

export default function ApplicationSelector({
  value = [],
  onChange,
  placeholder = "Select applications...",
  disabled = false,
  className = '',
  multiple = true,
  maxSelections
}: ApplicationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load applications on mount
  useEffect(() => {
    loadApplications()
  }, [])

  // Load applications with optional search
  const loadApplications = async (searchTerm: string = '') => {
    try {
      setLoading(true)
      setError(null)

      const loadedApplications = await apiClient.getApplications({
        search: searchTerm || undefined,
        limit: 50
      })

      setApplications(loadedApplications)
    } catch (err) {
      setError('Failed to load applications')
      console.error('Error loading applications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle search input
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (isOpen) {
        loadApplications(search)
      }
    }, 300)

    return () => clearTimeout(debounceTimeout)
  }, [search, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Find selected applications
  const selectedApplications = applications.filter(app => value.includes(app.id))

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearch('')
      }
    }
  }

  const handleSelect = (applicationId: string) => {
    if (multiple) {
      const isSelected = value.includes(applicationId)
      if (isSelected) {
        // Remove from selection
        onChange(value.filter(id => id !== applicationId))
      } else {
        // Add to selection (check max limit)
        if (!maxSelections || value.length < maxSelections) {
          onChange([...value, applicationId])
        }
      }
    } else {
      // Single selection
      onChange([applicationId])
      setIsOpen(false)
      setSearch('')
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const removeApplication = (applicationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(id => id !== applicationId))
  }

  // Get badge colors for environment and criticality
  const getEnvironmentBadge = (environment: string) => {
    const envConfig = ENVIRONMENTS.find(e => e.value === environment)
    return envConfig ? envConfig.color : 'gray'
  }

  const getCriticalityBadge = (criticality: string) => {
    const critConfig = CRITICALITY_LEVELS.find(c => c.value === criticality)
    return critConfig ? critConfig.color : 'gray'
  }

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      {/* Selection Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={clsx(
          'relative w-full cursor-default rounded-md border py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-500'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400',
          error && 'border-red-300'
        )}
      >
        <div className="flex items-center min-h-[1.5rem]">
          <RectangleStackIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />

          {selectedApplications.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 ml-2">
              {selectedApplications.slice(0, 2).map((app) => (
                <span
                  key={app.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-md"
                >
                  {app.name}
                  {multiple && (
                    <button
                      type="button"
                      onClick={(e) => removeApplication(app.id, e)}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {selectedApplications.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{selectedApplications.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <span className="ml-2 text-gray-500">{placeholder}</span>
          )}
        </div>

        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {/* Clear button for multiple selections */}
      {multiple && selectedApplications.length > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600"
        >
          <span className="text-sm">×</span>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md border border-gray-300 py-1 text-base overflow-auto focus:outline-none sm:text-sm">
          {/* Search input */}
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Loading applications...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* No results */}
          {!loading && !error && applications.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No applications found
            </div>
          )}

          {/* Application options */}
          {!loading && !error && applications.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              {applications.map((application) => (
                <div
                  key={application.id}
                  onClick={() => handleSelect(application.id)}
                  className={clsx(
                    'cursor-pointer select-none relative px-3 py-2 hover:bg-indigo-50',
                    value.includes(application.id) && 'bg-indigo-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {application.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {application.description || 'No description'}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span
                          className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            getEnvironmentBadge(application.environment) === 'blue' && 'bg-blue-100 text-blue-800',
                            getEnvironmentBadge(application.environment) === 'yellow' && 'bg-yellow-100 text-yellow-800',
                            getEnvironmentBadge(application.environment) === 'red' && 'bg-red-100 text-red-800',
                            getEnvironmentBadge(application.environment) === 'gray' && 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {application.environment}
                        </span>
                        <span
                          className={clsx(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            getCriticalityBadge(application.criticality) === 'green' && 'bg-green-100 text-green-800',
                            getCriticalityBadge(application.criticality) === 'yellow' && 'bg-yellow-100 text-yellow-800',
                            getCriticalityBadge(application.criticality) === 'orange' && 'bg-orange-100 text-orange-800',
                            getCriticalityBadge(application.criticality) === 'red' && 'bg-red-100 text-red-800',
                            getCriticalityBadge(application.criticality) === 'gray' && 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {application.criticality}
                        </span>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {value.includes(application.id) && (
                      <CheckIcon className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
