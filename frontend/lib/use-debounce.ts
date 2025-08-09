// lib/use-debounce.ts
import { useState, useEffect } from 'react'

/**
 * Custom hook for debouncing a value
 * Useful for delaying API calls until user stops typing
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timeout if the value changes before the delay completes
    // This ensures that the debounced value only updates after the delay period
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
