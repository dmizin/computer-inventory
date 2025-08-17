// lib/use-auth.ts
import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate auth check - replace with your actual auth logic
    const checkAuth = async () => {
      try {
        // For now, simulate a logged-in user
        // In production, this would check your authentication system
        setUser({
          id: 'demo-user',
          email: 'admin@example.com',
          name: 'Demo Admin'
        })
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  return { user, isLoading }
}

// Helper function to check if user can edit assets
export function canEditAssets(user: User | null): boolean {
  // For now, all authenticated users can edit
  // In production, you'd check roles/permissions here
  return user !== null
}
