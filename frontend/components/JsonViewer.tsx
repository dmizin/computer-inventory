'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface JsonViewerProps {
  data: any
  maxDepth?: number
  compact?: boolean
  className?: string
}

export default function JsonViewer({
  data,
  maxDepth = 10,
  compact = false,
  className = ''
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy JSON:', error)
    }
  }

  if (data === null) {
    return <span className="text-gray-400 italic">null</span>
  }

  if (data === undefined) {
    return <span className="text-gray-400 italic">undefined</span>
  }

  if (typeof data === 'string') {
    return (
      <span className="text-green-600">
        "{data}"
      </span>
    )
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600">{data}</span>
  }

  if (typeof data === 'boolean') {
    return (
      <span className={data ? 'text-green-600' : 'text-red-600'}>
        {data.toString()}
      </span>
    )
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="absolute top-2 right-2">
        <button
          onClick={handleCopy}
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Copy JSON"
        >
          <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className={clsx(
        'bg-gray-50 rounded-lg p-4 overflow-auto',
        compact ? 'text-sm' : 'text-base'
      )}>
        <JsonNode
          data={data}
          depth={0}
          maxDepth={maxDepth}
          compact={compact}
        />
      </div>
    </div>
  )
}

interface JsonNodeProps {
  data: any
  depth: number
  maxDepth: number
  compact: boolean
  parentKey?: string
}

function JsonNode({ data, depth, maxDepth, compact, parentKey }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2) // Expand first 2 levels by default

  // Prevent infinite recursion
  if (depth > maxDepth) {
    return <span className="text-gray-400 italic">...</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-600">[]</span>
    }

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <span className="ml-1 text-gray-600">
            Array ({data.length} {data.length === 1 ? 'item' : 'items'})
          </span>
        </button>

        {isExpanded && (
          <div className={clsx('ml-6 mt-1', compact ? 'space-y-1' : 'space-y-2')}>
            {data.map((item, index) => (
              <div key={index} className="flex">
                <span className="text-gray-500 mr-2 min-w-0 text-right" style={{ minWidth: '2rem' }}>
                  {index}:
                </span>
                <JsonNode
                  data={item}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data)

    if (keys.length === 0) {
      return <span className="text-gray-600">{'{}'}</span>
    }

    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <span className="ml-1 text-gray-600">
            Object ({keys.length} {keys.length === 1 ? 'property' : 'properties'})
          </span>
        </button>

        {isExpanded && (
          <div className={clsx('ml-6 mt-1', compact ? 'space-y-1' : 'space-y-2')}>
            {keys.map((key) => (
              <div key={key} className="flex items-start">
                <span className="text-purple-600 mr-2 font-medium min-w-0 break-all">
                  "{key}":
                </span>
                <div className="flex-1 min-w-0">
                  <JsonNode
                    data={data[key]}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    compact={compact}
                    parentKey={key}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Primitive values (string, number, boolean handled above)
  return <span className="text-gray-900">{JSON.stringify(data)}</span>
}
