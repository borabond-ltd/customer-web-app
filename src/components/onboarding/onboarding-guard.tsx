'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useOnboardingStatus } from '@/hooks/use-onboarding-status'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'

import { logger } from '@/lib/logger'
interface OnboardingGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Pages that don't require onboarding completion
const ALLOWED_PATHS = [
  '/onboarding',
  '/complete-profile',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/dashboard/notifications',
  '/dashboard/investment/monthly-deposits', // Allow monthly deposits page without onboarding completion
  '/dashboard/statements/print', // Allow print-friendly statements page for downloads
  '/get-app',
]

export function OnboardingGuard({ children, fallback }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { isOnboardingCompleted, isLoading, checkOnboardingStatus } = useOnboardingStatus()
  const router = useRouter()
  const pathname = usePathname()
  const needsPhone = !!user && (!user.phone || user.phone.trim() === '')
  const isGetAppPath = pathname.startsWith('/get-app')

  // Check if current path is allowed without onboarding
  const isAllowedPath = ALLOWED_PATHS.some(path => {
    if (path === '/') {
      // Only allow exact match for root path
      return pathname === '/'
    }
    // For other paths, allow startsWith
    return pathname.startsWith(path)
  })
  
  // Debug logging for path checking
  logger.log('🛣️ Path Debug:', {
    pathname,
    isAllowedPath,
    allowedPaths: ALLOWED_PATHS,
    needsPhone
  })

  useEffect(() => {
    // Debug logging
    logger.log('🔍 OnboardingGuard Debug:', {
      user: !!user,
      user_id: user?.id,
      authLoading,
      isLoading,
      isOnboardingCompleted,
      isAllowedPath,
      pathname,
      needsPhone
    })
    
    if (isGetAppPath) return

    // Redirect to complete profile if phone number is required
    if (user && !authLoading && needsPhone && !pathname.startsWith('/complete-profile')) {
      logger.log('📱 Phone number required before onboarding, redirecting to /complete-profile')
      try {
        router.replace('/complete-profile')
      } catch (error) {
        logger.error('Router.replace failed when redirecting to /complete-profile, using window.location', error)
        if (typeof window !== 'undefined') {
          window.location.href = '/complete-profile'
        }
      }
      return
    }

    // Only check onboarding status if user is authenticated, doesn't need phone, and not on allowed paths
    if (user && !authLoading && !needsPhone && !isAllowedPath) {
      logger.log('📡 Checking onboarding status...')
      checkOnboardingStatus()
    }
  }, [user, authLoading, needsPhone, isAllowedPath, isGetAppPath, checkOnboardingStatus, router, pathname])

  useEffect(() => {
    if (isGetAppPath) return

    // Only redirect if we have a definitive answer about onboarding status
    if (user && !authLoading && !isLoading && !isAllowedPath) {
      if (needsPhone) {
        logger.log('📱 User must add phone number before onboarding, ensuring redirect to /complete-profile')
        try {
          router.replace('/complete-profile')
        } catch (error) {
          logger.error('Router.replace failed during phone enforcement, using window.location', error)
          if (typeof window !== 'undefined') {
            window.location.href = '/complete-profile'
          }
        }
        return
      }

      if (isOnboardingCompleted === false) {
        logger.log('🚀 REDIRECTING TO ONBOARDING - User not completed onboarding')
        logger.log('🚀 Redirect conditions met:', {
          user: !!user,
          authLoading,
          isLoading,
          isOnboardingCompleted,
          isAllowedPath
        })
        
        // Use both methods for more reliable redirect
        router.push('/onboarding')
        
        // Also use window.location as backup
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding') {
            logger.log('🚀 Backup redirect using window.location')
            window.location.href = '/onboarding'
          }
        }, 100)
      } else if (isOnboardingCompleted === true) {
        logger.log('✅ Onboarding completed, allowing access to:', pathname)
      } else {
        logger.log('⏳ Onboarding status unknown, waiting for response...')
      }
    } else {
      logger.log('🚫 Not redirecting - conditions not met:', {
        user: !!user,
        authLoading,
        isLoading,
        isOnboardingCompleted,
        isAllowedPath,
        reason: !user ? 'No user' : 
                authLoading ? 'Auth loading' :
                isLoading ? 'Onboarding loading' :
                isOnboardingCompleted ? 'Onboarding completed' :
                isAllowedPath ? 'Path allowed' : 'Unknown'
      })
    }
  }, [user, authLoading, isLoading, isOnboardingCompleted, isAllowedPath, isGetAppPath, router, pathname])

  // Share-link landing must paint immediately — never wait on auth or onboarding.
  if (isGetAppPath) {
    return <>{children}</>
  }

  // Show loading state while checking authentication or onboarding status
  if (
    authLoading ||
    (user && !needsPhone && !isAllowedPath && isLoading) ||
    (user && needsPhone && !pathname.startsWith('/complete-profile'))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">
              {needsPhone ? 'Please wait while we redirect you to confirm your phone number...' : 'Checking onboarding status...'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user is not authenticated, show children (login/signup pages)
  if (!user) {
    return <>{children}</>
  }

  // If on allowed path, show children
  if (isAllowedPath) {
    return <>{children}</>
  }

  // Allow the complete profile page when phone is required
  if (needsPhone && pathname.startsWith('/complete-profile')) {
    return <>{children}</>
  }

  // If onboarding is not completed and not on allowed path, force redirect
  if (!needsPhone && !isOnboardingCompleted && !isAllowedPath) {
    logger.log('🚨 FORCE REDIRECT: Onboarding not completed and not on allowed path')
    
    // Force redirect using window.location for more reliable redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/onboarding'
      return null
    }
    
    // Fallback to router.push
    router.push('/onboarding')
    return null
  }

  // If onboarding is completed, show children
  return <>{children}</>
}

// Higher-order component for protecting individual pages
export function withOnboardingGuard<P extends object>(
  Component: React.ComponentType<P>
) {
  return function OnboardingGuardedComponent(props: P) {
    return (
      <OnboardingGuard>
        <Component {...props} />
      </OnboardingGuard>
    )
  }
}

// Hook for checking if onboarding is required on current page
export function useOnboardingRequired(): boolean {
  const { user } = useAuth()
  const { isOnboardingCompleted } = useOnboardingStatus()
  const pathname = usePathname()

  if (!user) return false
  if (isOnboardingCompleted) return false
  if (ALLOWED_PATHS.some(path => pathname.startsWith(path))) return false

  return true
}
