'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUpDownIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline'
import { User } from '@/lib/types'
import { apiClient } from '@/lib/api-client'
import { clsx } from 'clsx'

interface UserSelectorProps {
  value?: string | null
  onChange: (userId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  clearable?: boolean
}

export default function UserSelector({
  value,
  onChange,
  placeholder = "Select an owner...",
  disabled = false,
  className = '',
  required = false,
  clearable = true
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  // Load users with optional search
  const loadUsers = async (searchTerm: string = '') => {
    try {
      setLoading(true)
      setError(null)

      const loadedUsers = await apiClient.getUsers({
        search: searchTerm || undefined,
        active_only: true,
        limit: 50
      })

      setUsers(loadedUsers)
    } catch (err) {
      setError('Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle search input
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (isOpen) {
        loadUsers(search)
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

  // Find selected user
  const selectedUser = users.find(user => user.id === value)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSearch('')
      }
    }
  }

  const handleSelect = (userId: string | null) => {
    onChange(userId)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (clearable) {
      onChange(null)
    }
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
        <span className="flex items-center">
          {selectedUser ? (
            <>
              <UserIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <span className="ml-2 block truncate">
                {selectedUser.full_name} ({selectedUser.username})
                {selectedUser.department && (
                  <span className="text-gray-500 text-sm ml-1">
                    - {selectedUser.department}
                  </span>
                )}
              </span>
              {clearable && value && (
                <button
                  onClick={handleClear}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </>
          ) : (
            <>
              <UserIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <span className="ml-2 block truncate text-gray-500">
                {placeholder}
              </span>
            </>
          )}
        </span>
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
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Clear Option */}
          {clearable && (
            <button
              onClick={() => handleSelect(null)}
              className={clsx(
                'relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white w-full text-left',
                !value && 'bg-indigo-600 text-white'
              )}
            >
              <span className="block truncate italic">
                {!required ? 'No owner' : 'Clear selection'}
              </span>
              {!value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <CheckIcon className="h-5 w-5" />
                </span>
              )}
            </button>
          )}

          {/* Loading State */}
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Loading users...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* User Options */}
          {!loading && !error && (
            <>
              {users.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {search ? 'No users found' : 'No users available'}
                </div>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className={clsx(
                      'relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white w-full text-left',
                      value === user.id && 'bg-indigo-600 text-white'
                    )}
                  >
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 flex-shrink-0 mr-2" />
                      <div>
                        <div className="block truncate font-medium">
                          {user.full_name}
                        </div>
                        <div className="block truncate text-sm opacity-75">
                          {user.username}
                          {user.department && ` • ${user.department}`}
                        </div>
                      </div>
                    </div>
                    {value === user.id && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    )}
                  </button>
                ))
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
