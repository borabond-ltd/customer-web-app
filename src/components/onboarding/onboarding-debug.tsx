'use client'

import React from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useOnboardingStatus } from '@/hooks/use-onboarding-status'
import { usePathname } from 'next/navigation'

export function OnboardingDebug() {
  const { user, loading: authLoading } = useAuth()
  const { onboardingStatus, isOnboardingCompleted, isLoading, error } = useOnboardingStatus()
  const pathname = usePathname()

  const ALLOWED_PATHS = [
    '/onboarding',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/terms'
  ]

  const isAllowedPath = ALLOWED_PATHS.some(path => {
    if (path === '/') {
      // Only allow exact match for root path
      return pathname === '/'
    }
    // For other paths, allow startsWith
    return pathname.startsWith(path)
  })

  const shouldRedirect = user && !authLoading && !isLoading && !isOnboardingCompleted && !isAllowedPath

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono max-w-md z-50">
      <div className="font-bold mb-2">🐛 Onboarding Debug</div>
      
      <div className="space-y-1">
        <div>Path: <span className="text-yellow-300">{pathname}</span></div>
        <div>Allowed: <span className={isAllowedPath ? 'text-green-300' : 'text-red-300'}>{isAllowedPath ? 'YES' : 'NO'}</span></div>
        <div>User: <span className={user ? 'text-green-300' : 'text-red-300'}>{user ? 'YES' : 'NO'}</span></div>
        <div>Auth Loading: <span className={authLoading ? 'text-yellow-300' : 'text-green-300'}>{authLoading ? 'YES' : 'NO'}</span></div>
        <div>Onboarding Loading: <span className={isLoading ? 'text-yellow-300' : 'text-green-300'}>{isLoading ? 'YES' : 'NO'}</span></div>
        <div>Onboarding Completed: <span className={isOnboardingCompleted ? 'text-green-300' : 'text-red-300'}>{isOnboardingCompleted ? 'YES' : 'NO'}</span></div>
        <div>Should Redirect: <span className={shouldRedirect ? 'text-red-300' : 'text-green-300'}>{shouldRedirect ? 'YES' : 'NO'}</span></div>
      </div>

      {onboardingStatus && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div>Status: <span className="text-blue-300">{onboardingStatus.borabond_onboarding_completed ? 'COMPLETED' : 'NOT COMPLETED'}</span></div>
          <div>User ID: <span className="text-blue-300">{onboardingStatus.userId}</span></div>
        </div>
      )}

      {error && (
        <div className="mt-2 pt-2 border-t border-gray-600 text-red-300">
          Error: {error}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-gray-600">
        <button 
          onClick={() => window.location.href = '/onboarding'}
          className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Force Redirect
        </button>
      </div>
    </div>
  )
}
