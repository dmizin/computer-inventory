'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  showSummary?: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showSummary = true
}: PaginationProps) {
  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showPages = 5 // Number of page buttons to show

    if (totalPages <= showPages) {
      // Show all pages if total is less than or equal to showPages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Calculate which pages to show
      let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
      const endPage = Math.min(totalPages, startPage + showPages - 1)

      // Adjust if we're near the end
      if (endPage - startPage < showPages - 1) {
        startPage = Math.max(1, endPage - showPages + 1)
      }

      // Always show first page
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('...')
        }
      }

      // Show middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Always show last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number' && page !== currentPage) {
      onPageChange(page)
    }
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
      {/* Summary (mobile hidden) */}
      {showSummary && (
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
        </div>
      )}

      {/* Pagination controls */}
      <div className={clsx(
        'flex justify-center w-full',
        showSummary ? 'sm:justify-end' : ''
      )}>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={clsx(
              'relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium',
              currentPage === 1
                ? 'bg-gray-50 border-gray-300 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
            )}
          >
            <span className="sr-only">Previous</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              onClick={() => handlePageClick(page)}
              disabled={page === '...'}
              className={clsx(
                'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                page === currentPage
                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                  : page === '...'
                  ? 'bg-white border-gray-300 text-gray-700 cursor-default'
                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              )}
            >
              {page}
            </button>
          ))}

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={clsx(
              'relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium',
              currentPage === totalPages
                ? 'bg-gray-50 border-gray-300 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
            )}
          >
            <span className="sr-only">Next</span>
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>

      {/* Mobile summary */}
      {showSummary && (
        <div className="flex-1 flex justify-center sm:hidden">
          <p className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  )
}
