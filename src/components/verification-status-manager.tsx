'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usePersona } from '@/contexts/persona-context'

/**
 * Component that manages verification status persistence
 * - Clears verification status from localStorage when user logs out
 * - This component should be included in the app layout
 */
export function VerificationStatusManager() {
  const { user, isAuthenticated } = useAuth()
  const { clearVerificationStatus } = usePersona()

  useEffect(() => {
    // Clear verification status when user logs out
    if (!isAuthenticated && !user) {
      // Get the last known user ID from localStorage keys
      const keys = Object.keys(localStorage)
      const verificationKeys = keys.filter(key => key.startsWith('verification_status_'))
      
      // Clear all verification status entries
      verificationKeys.forEach(key => {
        const userId = key.replace('verification_status_', '')
        clearVerificationStatus(userId)
      })
    }
  }, [isAuthenticated, user, clearVerificationStatus])

  // This component doesn't render anything
  return null
}
