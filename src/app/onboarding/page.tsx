'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { OnboardingProvider } from '@/contexts/onboarding-context'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingData } from '@/types/onboarding'
import { ErrorDisplay } from '@/components/ui/error-display'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'

// Import the onboarding data
import onboardingData from '../../../onboarding.json'

import { logger } from '@/lib/logger'
export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OnboardingData | null>(null)
  const [isCheckingOnboardingStatus, setIsCheckingOnboardingStatus] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  // Check onboarding completion status
  const checkOnboardingStatus = async () => {
    if (!user?.id) {
      logger.log('No user ID available for onboarding status check')
      return
    }

    try {
      setIsCheckingOnboardingStatus(true)
      logger.log('🔍 Checking onboarding status for user:', user.id)
      
      const response = await apiClient.getOnboardingStatus()
      logger.log('📊 Onboarding status response:', response)
      
      if (response.success) {
        // The backend returns the onboarding status directly in the response
        const completed = (response as any).borabond_onboarding_completed
        setOnboardingCompleted(completed)
        logger.log('✅ Onboarding status retrieved:', completed)
        
        // If onboarding is completed, redirect to dashboard
        if (completed) {
          logger.log('🚀 Onboarding already completed, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
      } else {
        logger.error('❌ Failed to get onboarding status:', response.message)
        setError(response.message || 'Failed to check onboarding status')
      }
    } catch (err: any) {
      logger.error('❌ Error checking onboarding status:', err)
      setError(err.message || 'Failed to check onboarding status')
    } finally {
      setIsCheckingOnboardingStatus(false)
    }
  }

  useEffect(() => {
    // Load onboarding data and check completion status
    const loadOnboardingData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // In a real app, you might fetch this from an API
        // For now, we'll use the imported JSON data
        if (onboardingData && onboardingData.success && onboardingData.data) {
          // The data is already in the correct format
          setData(onboardingData.data as any)
        } else if (onboardingData && (onboardingData as any).steps) {
          // Transform the data structure to match what the context expects
          const stepsData = (onboardingData as any).steps
          const transformedData = {
            ...onboardingData,
            sections: stepsData.map((step: any) => ({
              id: step.id,
              name: step.title,
              description: step.description
            })),
            questions: stepsData.flatMap((step: any) => 
              step.fields.map((field: any) => ({
                id: `${step.id}-${field.name}`,
                title: field.label,
                type: field.type,
                options: field.options,
                required: field.required,
                helpText: field.description || '',
                section: step.id
              }))
            )
          }
          setData(transformedData as any)
        } else {
          throw new Error('Failed to load onboarding data')
        }
      } catch (err) {
        logger.error('Error loading onboarding data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load onboarding data')
      } finally {
        setIsLoading(false)
      }
    }

    loadOnboardingData()
  }, [])

  // Check onboarding status when user is available
  useEffect(() => {
    if (user && !authLoading && data) {
      checkOnboardingStatus()
    }
  }, [user, authLoading, data])

  // Show loading state while loading data or checking onboarding status
  if (isLoading || isCheckingOnboardingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-md mx-3 sm:mx-4 px-2">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mb-4"
              >
                <Loader2 className="h-8 w-8 text-blue-600" />
              </motion.div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">
                {isCheckingOnboardingStatus ? 'Checking Status' : 'Loading Onboarding'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 text-center">
                {isCheckingOnboardingStatus 
                  ? 'Verifying your onboarding status...' 
                  : 'Preparing your personalized setup experience...'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show completion message if onboarding is already completed
  if (onboardingCompleted === true) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-md mx-3 sm:mx-4 px-2">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-4"
              >
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
              </motion.div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">
                Onboarding Complete
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 text-center">
                You have already completed the onboarding process. Redirecting to your dashboard...
              </p>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mt-4"
              >
                <Loader2 className="h-4 w-4 text-blue-600" />
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-md mx-3 sm:mx-4 px-2">
          <Card className="w-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Setup Error
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    We couldn't load your onboarding experience
                  </p>
                </div>
              </div>
              
              <ErrorDisplay
                error={error}
                onDismiss={() => setError(null)}
                userFriendly={true}
                size="sm"
                variant="inline"
                showCopyButton={false}
                showReportButton={false}
              />

              <div className="flex gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-md mx-3 sm:mx-4 px-2">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
              <AlertCircle className="h-8 w-8 text-gray-400 mb-4" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">
                No Data Available
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 text-center mb-4">
                Unable to load onboarding questions. Please try again later.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Go to Dashboard
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Only show onboarding wizard if onboarding is not completed
  if (onboardingCompleted === false || onboardingCompleted === null) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <OnboardingProvider onboardingData={data}>
          <OnboardingWizard onboardingData={data} />
        </OnboardingProvider>
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}
