'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'

import { logger } from '@/lib/logger'
interface OnboardingStatus {
  success: boolean
  userId: string
  borabond_onboarding_completed: boolean
  onboarding_completed_at: string | null
}

interface UseOnboardingStatusReturn {
  onboardingStatus: OnboardingStatus | null
  isOnboardingCompleted: boolean
  isLoading: boolean
  error: string | null
  checkOnboardingStatus: () => Promise<void>
  redirectToOnboarding: () => void
}

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const checkOnboardingStatus = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      logger.log('🔍 Checking onboarding status for user:', user?.id)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      })
      
      const response = await Promise.race([
        apiClient.getOnboardingStatus(),
        timeoutPromise
      ]) as any
      
      logger.log('📊 Onboarding status response:', response)
      
      if (response.success) {
        // The backend returns the onboarding status directly in the response
        const onboardingData = {
          success: response.success,
          userId: response.userId,
          borabond_onboarding_completed: response.borabond_onboarding_completed,
          onboarding_completed_at: response.onboarding_completed_at
        } as OnboardingStatus
        
        setOnboardingStatus(onboardingData)
        logger.log('✅ Onboarding status retrieved successfully:', onboardingData)
      } else {
        logger.error('❌ Failed to get onboarding status:', response.message)
        setError(response.message || 'Failed to get onboarding status')
      }
    } catch (err: any) {
      logger.error('❌ Error checking onboarding status:', err)
      setError(err.message || 'Failed to check onboarding status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const redirectToOnboarding = useCallback(() => {
    router.push('/onboarding')
  }, [router])

  // Check onboarding status when user changes
  useEffect(() => {
    if (user?.id) {
      logger.log('🔄 User changed, checking onboarding status for user:', user.id)
      checkOnboardingStatus()
    } else {
      logger.log('🔄 No user, clearing onboarding status')
      setOnboardingStatus(null)
      setError(null)
    }
  }, [user?.id, checkOnboardingStatus])

  const isOnboardingCompleted = onboardingStatus?.borabond_onboarding_completed ?? false

  // Debug logging
  logger.log('🎯 Onboarding Status Debug:', {
    onboardingStatus,
    isOnboardingCompleted,
    isLoading,
    error,
    user: user?.id
  })

  return {
    onboardingStatus,
    isOnboardingCompleted,
    isLoading,
    error,
    checkOnboardingStatus,
    redirectToOnboarding
  }
}
