'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import {
  ComputerDesktopIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useAuth, getLoginUrl, getLogoutUrl, canEditAssets, isAuthEnabled } from '@/lib/use-auth'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Assets', href: '/assets', icon: ComputerDesktopIcon },
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
]

export default function Header() {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and primary navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <ComputerDesktopIcon className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                Computer Inventory
              </h1>
            </div>

            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <Menu as="div" className="relative ml-3">
                <div>
                  <Menu.Button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span className="sr-only">Open user menu</span>
                    {user.picture ? (
                      <Image
                        className="h-8 w-8 rounded-full"
                        src={user.picture}
                        alt={user.name || 'User avatar'}
                        width={32}
                        height={32}
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </Menu.Button>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      {canEditAssets(user) && (
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/admin"
                              className={clsx(
                                'flex items-center px-4 py-2 text-sm',
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              )}
                            >
                              <Cog6ToothIcon className="h-4 w-4 mr-3" />
                              Admin Settings
                            </Link>
                          )}
                        </Menu.Item>
                      )}

                      <Menu.Item>
                        {({ active }) => (
                          <a
                            href={getLogoutUrl('/')}
                            className={clsx(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            )}
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                            {isAuthEnabled ? 'Sign out' : 'Logout (Dev)'}
                          </a>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <div className="flex items-center space-x-4">
                <a
                  href={getLoginUrl(pathname)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
                  {isAuthEnabled ? 'Sign in' : 'Login (Dev)'}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
