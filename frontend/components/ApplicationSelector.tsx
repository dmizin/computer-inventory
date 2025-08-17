'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUpDownIcon, CheckIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import { Application, APPLICATION_ENVIRONMENTS, CRITICALITY_LEVELS } from '@/lib/types'
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
    const envConfig = APPLICATION_ENVIRONMENTS.find(e => e.value === environment)
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
            <div className="ml-2 flex flex-wrap gap-1">
              {selectedApplications.map((app) => (
                <span
                  key={app.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {app.name}
                  {multiple && (
                    <button
                      onClick={(e) => removeApplication(app.id, e)}
                      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-600 hover:bg-indigo-200 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <span className="ml-2 block truncate text-gray-500">
              {placeholder}
            </span>
          )}

          {value.length > 0 && (
            <button
              onClick={handleClear}
              className="ml-auto mr-8 text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
          )}
        </div>

        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* Search Input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Selection Info */}
          {multiple && (
            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
              {value.length} selected
              {maxSelections && ` (max ${maxSelections})`}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Loading applications...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Application Options */}
          {!loading && !error && (
            <>
              {applications.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {search ? 'No applications found' : 'No applications available'}
                </div>
              ) : (
                applications.map((app) => {
                  const isSelected = value.includes(app.id)
                  const isMaxed = maxSelections && value.length >= maxSelections && !isSelected

                  return (
                    <button
                      key={app.id}
                      onClick={() => handleSelect(app.id)}
                      disabled={isMaxed}
                      className={clsx(
                        'relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 w-full text-left',
                        isMaxed
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-indigo-600 hover:text-white',
                        isSelected && 'bg-indigo-600 text-white'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="block truncate font-medium">
                            {app.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={clsx(
                              'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
                              isSelected ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-800'
                            )}>
                              {app.environment}
                            </span>
                            <span className={clsx(
                              'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
                              isSelected ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-800'
                            )}>
                              {app.criticality}
                            </span>
                            {app.asset_count > 0 && (
                              <span className={clsx(
                                'text-xs opacity-75',
                                isSelected ? 'text-white' : 'text-gray-500'
                              )}>
                                {app.asset_count} servers
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-5 w-5 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </>
          )}
        </div>
      )}

      {/* Validation Error */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
