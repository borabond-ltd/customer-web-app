// Shared post-Google-auth handler for GIS ID token exchange.

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'

export type GoogleAuthRedirectResult = {
  path: string
  message: string
}

type GoogleAuthApiData = {
  token?: string
  accessToken?: string
  refreshToken?: string
  tokens?: { accessToken: string; refreshToken: string }
  user: {
    id: string
    email: string
    phone?: string
    onboarding_completed?: boolean
    [key: string]: unknown
  }
}

/**
 * Exchange Google credentials with the backend, store tokens, and determine redirect path.
 */
export async function completeGoogleAuthExchange<TUser = GoogleAuthApiData['user']>(
  payload: { idToken: string },
  setUser: (user: TUser) => void
): Promise<GoogleAuthRedirectResult> {
  const response = await apiClient.signInWithGoogleIdToken(payload.idToken)

  logger.debug('Google auth backend response:', response)

  if (!response.success || !response.data) {
    throw new Error(response.message || response.error || 'Authentication failed')
  }

  const authData = response.data as GoogleAuthApiData
  const token = authData.token || authData.accessToken || authData.tokens?.accessToken

  if (!token) {
    throw new Error('No authentication token received')
  }

  apiClient.setToken(token)

  const refreshToken = authData.refreshToken || authData.tokens?.refreshToken
  if (refreshToken) {
    apiClient.setRefreshToken(refreshToken)
  }

  setUser(authData.user as TUser)

  const phoneValue = authData.user.phone
  const needsPhone = !phoneValue || phoneValue.trim() === ''

  if (needsPhone) {
    return {
      path: '/complete-profile',
      message: 'Almost done! Please confirm your phone number...',
    }
  }

  if (!authData.user.onboarding_completed) {
    return {
      path: '/onboarding',
      message: "Welcome! Let's set up your account...",
    }
  }

  return {
    path: '/dashboard',
    message: 'Welcome back! Setting up your dashboard...',
  }
}

export function navigateAfterGoogleAuth(
  router: AppRouterInstance,
  result: GoogleAuthRedirectResult
): void {
  try {
    router.replace(result.path)
  } catch (error) {
    logger.error('Router replace failed after Google auth, using window.location:', error)
    window.location.href = result.path
  }
}
