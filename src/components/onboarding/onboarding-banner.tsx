'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStatus } from '@/hooks/use-onboarding-status'
import { useOnboardingRequired } from '@/components/onboarding/onboarding-guard'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

interface OnboardingBannerProps {
  variant?: 'warning' | 'success' | 'info'
  dismissible?: boolean
  className?: string
}

export function OnboardingBanner({ 
  variant = 'warning', 
  dismissible = true,
  className = ''
}: OnboardingBannerProps) {
  const { isOnboardingCompleted, isLoading } = useOnboardingStatus()
  const isOnboardingRequired = useOnboardingRequired()
  const router = useRouter()
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show banner if onboarding is completed or not required
  if (isLoading || isOnboardingCompleted || !isOnboardingRequired) {
    return null
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null
  }

  const handleCompleteOnboarding = () => {
    router.push('/onboarding')
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700 text-white'
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          text: 'text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      default: // warning
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          text: 'text-orange-800',
          button: 'bg-orange-600 hover:bg-orange-700 text-white'
        }
    }
  }

  const styles = getVariantStyles()
  const Icon = variant === 'success' ? CheckCircle : AlertCircle

  return (
    <div className={`border-l-4 ${styles.container} p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${styles.text}`}>
                Onboarding Required
              </h3>
              <p className={`mt-1 text-sm ${styles.text}`}>
                Complete your onboarding to access all features and start investing.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleCompleteOnboarding}
                size="sm"
                className={styles.button}
              >
                Complete Now
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function OnboardingBannerCompact({ className = '' }: { className?: string }) {
  const { isOnboardingCompleted, isLoading } = useOnboardingStatus()
  const isOnboardingRequired = useOnboardingRequired()
  const router = useRouter()

  if (isLoading || isOnboardingCompleted || !isOnboardingRequired) {
    return null
  }

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <span className="text-sm text-orange-800">
            Complete onboarding to access all features
          </span>
        </div>
        
        <Button
          onClick={() => router.push('/onboarding')}
          size="sm"
          variant="outline"
          className="text-orange-600 border-orange-300 hover:bg-orange-100"
        >
          Complete
        </Button>
      </div>
    </div>
  )
}
