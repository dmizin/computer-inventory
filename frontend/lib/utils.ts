// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format memory size (GB to human readable)
 */
export function formatMemorySize(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`
  if (gb < 1024) return `${gb} GB`
  return `${Math.round(gb / 1024 * 10) / 10} TB`
}

/**
 * Format disk size with appropriate units
 */
export function formatDiskSize(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`
  if (gb < 1024) return `${gb} GB`
  return `${Math.round(gb / 1024 * 10) / 10} TB`
}

/**
 * Format network speed
 */
export function formatNetworkSpeed(gbps: number): string {
  if (gbps < 1) return `${Math.round(gbps * 1000)} Mbps`
  return `${gbps} Gbps`
}

/**
 * Format CPU frequency
 */
export function formatCpuFrequency(mhz: number): string {
  if (mhz < 1000) return `${mhz} MHz`
  return `${Math.round(mhz / 100) / 10} GHz`
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generate a random color for avatars/icons
 */
export function generateColor(seed: string): string {
  const colors = [
    '#f56565', '#ed8936', '#ecc94b', '#38a169',
    '#00b894', '#0984e3', '#6c5ce7', '#a29bfe',
    '#fd79a8', '#fdcb6e', '#6c5ce7', '#00cec9'
  ]

  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any

  const cloned = {} as T
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diff = now.getTime() - target.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (seconds > 30) return `${seconds} second${seconds > 1 ? 's' : ''} ago`
  return 'Just now'
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Sleep function for async delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      textArea.remove()
      return true
    } catch {
      textArea.remove()
      return false
    }
  }
}

/**
 * Download data as file
 */
export function downloadFile(data: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Format hardware specifications for display
 */
export function formatHardwareSpec(key: string, value: any): string {
  const lowerKey = key.toLowerCase()

  // Memory formatting
  if (lowerKey.includes('memory') && typeof value === 'number') {
    return formatMemorySize(value)
  }

  // Disk size formatting
  if (lowerKey.includes('size') && lowerKey.includes('gb') && typeof value === 'number') {
    return formatDiskSize(value)
  }

  // CPU frequency formatting
  if (lowerKey.includes('frequency') && typeof value === 'number') {
    return formatCpuFrequency(value)
  }

  // Network speed formatting
  if (lowerKey.includes('speed') && lowerKey.includes('gbps') && typeof value === 'number') {
    return formatNetworkSpeed(value)
  }

  // Default formatting
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

const utilsExport = {
  cn,
  formatFileSize,
  formatMemorySize,
  formatDiskSize,
  formatNetworkSpeed,
  formatCpuFrequency,
  capitalize,
  snakeToTitleCase,
  truncate,
  generateColor,
  deepClone,
  debounce,
  throttle,
  isEmpty,
  safeJsonParse,
  formatRelativeTime,
  getInitials,
  isValidEmail,
  generateUuid,
  sleep,
  copyToClipboard,
  downloadFile,
  formatHardwareSpec,
}

export default utilsExport
