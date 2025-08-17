// components/JsonViewer.tsx
'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ClipboardIcon } from '@heroicons/react/24/outline'

interface JsonViewerProps {
  data: any
  collapsible?: boolean
  defaultExpanded?: boolean
}

export default function JsonViewer({
  data,
  collapsible = true,
  defaultExpanded = true
}: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatValue = (value: any): string => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return JSON.stringify(value)
  }

  const renderObject = (obj: any, depth: number = 0): JSX.Element => {
    if (obj === null || obj === undefined) {
      return <span className="text-gray-500">null</span>
    }

    if (typeof obj !== 'object') {
      return (
        <span className={`${
          typeof obj === 'string' ? 'text-green-600' :
          typeof obj === 'number' ? 'text-blue-600' :
          typeof obj === 'boolean' ? 'text-purple-600' :
          'text-gray-600'
        }`}>
          {formatValue(obj)}
        </span>
      )
    }

    if (Array.isArray(obj)) {
      return (
        <div>
          <span className="text-gray-600">[</span>
          {obj.length > 0 && (
            <div className="ml-4">
              {obj.map((item, index) => (
                <div key={index} className="py-0.5">
                  {renderObject(item, depth + 1)}
                  {index < obj.length - 1 && <span className="text-gray-600">,</span>}
                </div>
              ))}
            </div>
          )}
          <span className="text-gray-600">]</span>
        </div>
      )
    }

    const keys = Object.keys(obj)
    if (keys.length === 0) {
      return <span className="text-gray-600">{'{}'}</span>
    }

    return (
      <div>
        <span className="text-gray-600">{'{'}</span>
        <div className="ml-4">
          {keys.map((key, index) => (
            <div key={key} className="py-0.5">
              <span className="text-red-600 font-medium">"{key}"</span>
              <span className="text-gray-600">: </span>
              {renderObject(obj[key], depth + 1)}
              {index < keys.length - 1 && <span className="text-gray-600">,</span>}
            </div>
          ))}
        </div>
        <span className="text-gray-600">{'}'}</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-gray-100 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center">
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center text-gray-300 hover:text-white mr-2"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          )}
          <span className="text-sm font-medium text-gray-300">JSON Data</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded"
        >
          <ClipboardIcon className="h-3 w-3 mr-1" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {renderObject(data)}
          </pre>
        </div>
      )}
    </div>
  )
}
