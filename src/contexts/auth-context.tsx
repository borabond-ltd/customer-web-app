'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { completeGoogleAuthExchange, navigateAfterGoogleAuth } from '@/lib/google-auth-handler'

import { logger } from '@/lib/logger'
interface AuthResponse {
  token?: string
  user: User
}

interface User {
  id: string
  user_id?: string // UUID from backend response
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  phone?: string
  profile_picture_url?: string
  created_at: string
  updated_at: string
  onboarding_completed?: boolean
  verification_status?: string
  is_verified?: boolean
  cybrid_integration_completed?: boolean
  // Customer information from Cybrid
  customerGuid?: string
  customerData?: {
    localRecord?: {
      id: string
      user_id: string
      cybrid_customer_id: string
      verification_status: string
      external_bank_accounts_count: number
      created_at: string
      updated_at: string
      full_name?: string
      date_of_birth?: string
      phone_number?: string
      email_address?: string
      street?: string
      street2?: string
      city?: string
      subdivision?: string
      postal_code?: string
      country_code?: string
      kyc_state?: string
    }
    cybridData?: {
      created_at: string
      updated_at: string
      guid: string
      bank_guid: string
      type: string
      state: string
      labels?: any
      compliance_decisions?: Array<{
        type: string
        state: string
        failure_codes: string[]
      }>
      activity_limits?: Array<{
        type: string
        name: string
        asset: string
        amount: number
        interval?: any
        activities: string[]
        sides?: string[]
      }>
    }
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, phone?: string, phoneVerificationToken?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithGoogleIdToken: (idToken: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  refreshToken: () => Promise<{ error: any }>
  isAuthenticated: boolean
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type CustomerEnrichmentContext = 'fetchUserData' | 'signup' | 'signin' | string

const deriveVerificationStatusFromKyc = (targetUser: any, kyc: any) => {
  const status = String(kyc?.status || '').toLowerCase()
  if (kyc?.is_verified || status === 'verified' || status === 'approved') {
    targetUser.is_verified = true
    targetUser.verification_status = 'verified'
  } else if (status === 'rejected' || status === 'failed') {
    targetUser.is_verified = false
    targetUser.verification_status = 'failed'
  } else if (status === 'pending') {
    targetUser.is_verified = false
    targetUser.verification_status = 'pending'
  } else {
    targetUser.is_verified = false
    targetUser.verification_status = 'not_started'
  }
}

const extractStatusCode = (error: any): number | null => {
  const raw =
    error?.status ??
    error?.code ??
    error?.details?.status ??
    error?.details?.response?.status ??
    error?.details?.error?.status
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const enrichUserWithCustomerData = async (targetUser: any, context: CustomerEnrichmentContext = 'auth') => {
  if (!targetUser?.user_id && !targetUser?.id) {
    logger.log(`ℹ️ Skipping KYC enrichment (${context}) because user id is missing`)
    return
  }

  try {
    const kycResponse = await apiClient.getKycStatus()
    if (kycResponse.success && kycResponse.data) {
      const kyc = kycResponse.data as any
      targetUser.customerGuid = kyc.customer_guid || kyc.providerCustomerId || targetUser.customerGuid
      deriveVerificationStatusFromKyc(targetUser, kyc)
      logger.log(`✅ KYC status applied (${context}):`, {
        customerGuid: targetUser.customerGuid,
        verificationStatus: targetUser.verification_status,
      })
    } else {
      logger.warn(`⚠️ KYC status fetch failed (${context}), continuing without enrichment:`, kycResponse.message)
    }
  } catch (error) {
    const statusCode = extractStatusCode(error)
    if (statusCode === 404) {
      logger.log(`ℹ️ No KYC record yet (${context}); skipping enrichment`)
      return
    }
    logger.error(`❌ Error fetching KYC status (${context}):`, error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  // Check if user is authenticated
  const isAuthenticated = !!user
  
  // Debug logging
  logger.log('Auth context state:', { 
    user: !!user, 
    userEmail: user?.email,
    loading, 
    isAuthenticated,
    token: apiClient.getToken() ? 'present' : 'missing'
  })

  useEffect(() => {
    if (isInitialized) {
      logger.log('🚀 Auth context already initialized, skipping')
      return
    }
    
    logger.log('🚀 Auth context useEffect initialized')

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      logger.log('⏰ Auth initialization timeout, setting loading to false')
      setLoading(false)
      setIsInitialized(true)
    }, 5000) // 5 second timeout

    // Check for existing token and fetch user data
    const token = apiClient.getToken()
    logger.log('🔍 Initial token check:', token ? 'present' : 'missing')
    
    if (token) {
      logger.log('📡 Token found, calling fetchUserData')
      fetchUserData()
    } else {
      logger.log('❌ No token found, setting loading to false')
      clearTimeout(timeoutId)
      setLoading(false)
      setIsInitialized(true)
    }

    return () => clearTimeout(timeoutId)
  }, [isInitialized])

  // Listen for token expired events from API client
  useEffect(() => {
    const handleTokenExpired = () => {
      logger.log('🔄 Token expired event received, clearing auth state')
      setUser(null)
      apiClient.setToken(null)
      apiClient.setRefreshToken(null)
      
      if (!window.location.pathname.startsWith('/get-app')) {
        router.push('/auth/signin')
      }
    }

    // Add event listener for token expiration
    window.addEventListener('auth:token-expired', handleTokenExpired)

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired)
    }
  }, [router])

  useEffect(() => {
    if (loading) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const currentPath = window.location.pathname
    const isCompleteProfilePath = currentPath.startsWith('/complete-profile')
    const isGetAppPath = currentPath.startsWith('/get-app')

    if (isGetAppPath) {
      return
    }

    if (!user) {
      if (isCompleteProfilePath) {
        router.replace('/auth/signin')
      }
      return
    }

    const needsPhone = !user.phone || user.phone.trim() === ''

    if (needsPhone) {
      if (!isCompleteProfilePath) {
        router.replace('/complete-profile')
      }
      return
    }

    if (isCompleteProfilePath) {
      if (!user.onboarding_completed) {
        router.replace('/onboarding')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [user, loading, router])

  const fetchUserData = async (retryAfterRefresh = true) => {
    try {
      let token = apiClient.getToken()
      logger.log('🔍 fetchUserData called with token:', token ? 'present' : 'missing')

      if (!token) {
        logger.log('❌ No token found, setting user to null')
        setUser(null)
        setLoading(false)
        return
      }

      logger.log('📡 Making API call to /me with token')
      let response
      try {
        response = await apiClient.getMe(token)
      } catch (error) {
        const status = extractStatusCode(error)
        if (retryAfterRefresh && status === 401 && apiClient.getRefreshToken()) {
          logger.log('🔄 /me returned 401, attempting token refresh...')
          const newToken = await apiClient.refreshAccessToken()
          if (newToken) {
            await fetchUserData(false)
            return
          }
        }
        throw error
      }

      logger.log('📡 API response:', response)

      if (response.success && response.data) {
        logger.log('✅ User data fetched successfully:', response.data)
        const userData = (response.data as any).auth || response.data

        if (userData.user_id) {
          logger.log('📡 Fetching customer information for user_id:', userData.user_id)
          await enrichUserWithCustomerData(userData, 'fetchUserData')
        }

        setUser(userData as User)
      } else {
        const status = extractStatusCode(response)
        if (retryAfterRefresh && status === 401 && apiClient.getRefreshToken()) {
          logger.log('🔄 /me failed with 401, attempting token refresh...')
          const newToken = await apiClient.refreshAccessToken()
          if (newToken) {
            await fetchUserData(false)
            return
          }
        }
        logger.log('❌ API call failed:', response.message)
        setUser(null)
        apiClient.setToken(null)
        apiClient.setRefreshToken(null)
      }
    } catch (error) {
      const status = extractStatusCode(error)
      logger.error('❌ Error fetching user data:', error)
      if (status === 401) {
        apiClient.setToken(null)
        apiClient.setRefreshToken(null)
      }
      setUser(null)
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, phone?: string, phoneVerificationToken?: string) => {
    try {
      setLoading(true)
      logger.log('Starting signup process...')
      
      const response = await apiClient.signUp({
        email,
        password,
        full_name: fullName,
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        phone: phone || '',
        phoneVerificationToken: phoneVerificationToken || '',
      })

      logger.log('Signup response:', response)

      if (response.success && response.data) {
        const authData = response.data as any
        logger.log('Signup successful, setting user data:', authData)
        
        // Extract tokens from the new JWT structure
        const token = authData.accessToken || authData.token || authData.session?.access_token
        const refreshToken = authData.refreshToken || authData.tokens?.refreshToken
        
        if (token) {
          apiClient.setToken(token)
          logger.log('✅ JWT token set successfully')
          
          // Store refresh token if available
          if (refreshToken) {
            apiClient.setRefreshToken(refreshToken)
            logger.log('✅ Refresh token set successfully')
          }
          
          // Longer delay to ensure cookie is set and available to middleware
          await new Promise(resolve => setTimeout(resolve, 500))
        } else {
          logger.log('❌ No token found in response')
        }
        
        // Fetch customer information if we have a user_id
        if (authData.user.user_id) {
          logger.log('📡 Fetching customer information for new user:', authData.user.user_id)
          await enrichUserWithCustomerData(authData.user, 'signup')
        }

        // Set user data and loading state
        setUser(authData.user)
        setLoading(false)
        logger.log('✅ User set successfully:', authData.user)
        logger.log('🔍 User ID details:', {
          user_id: authData.user.user_id,
          id: authData.user.id,
          using_uuid: !!authData.user.user_id,
          customerGuid: authData.user.customerGuid
        })
        logger.log('✅ Auth state after signup:', { 
          user: !!authData.user, 
          isAuthenticated: !!authData.user,
          loading: false 
        })
        
        // Redirect to onboarding for new users
        if (!authData.user.onboarding_completed) {
          logger.log('🔄 New user detected, redirecting to onboarding')
          // Only redirect if not already on an allowed path
          if (!window.location.pathname.startsWith('/onboarding') && 
              !window.location.pathname.startsWith('/dashboard/notifications')) {
            router.push('/onboarding')
          }
        } else {
          logger.log('✅ Existing user, redirecting to dashboard')
          // Only redirect if not already on a dashboard page
          if (!window.location.pathname.startsWith('/dashboard')) {
            router.push('/dashboard')
          }
        }
        
        return { error: null }
      } else {
        logger.error('Signup failed:', response.message)
        setLoading(false) // Stop loading on error
        return { error: new Error(response.message || 'Signup failed') }
      }
    } catch (error) {
      logger.error('Signup error:', error)
      setLoading(false) // Stop loading on error
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      logger.log('Starting signin process...')
      
      const response = await apiClient.signIn({
        email,
        password,
      })

      logger.log('Signin response:', response)

      if (response.success && response.data) {
        const authData = response.data as any
        logger.log('Signin successful, setting user data:', authData)
        
        // Extract tokens from the new JWT structure
        const token = authData.accessToken || authData.token || authData.session?.access_token
        const refreshToken = authData.refreshToken || authData.tokens?.refreshToken
        
        if (token) {
          apiClient.setToken(token)
          logger.log('✅ JWT token set successfully')
          
          // Store refresh token if available
          if (refreshToken) {
            apiClient.setRefreshToken(refreshToken)
            logger.log('✅ Refresh token set successfully')
          }
          
          // Longer delay to ensure cookie is set and available to middleware
          await new Promise(resolve => setTimeout(resolve, 500))
        } else {
          logger.log('❌ No token found in response')
        }
        
        // Fetch customer information if we have a user_id
        if (authData.user.user_id) {
          logger.log('📡 Fetching customer information for signing in user:', authData.user.user_id)
          await enrichUserWithCustomerData(authData.user, 'signin')
        }

        // Set user data and loading state
        setUser(authData.user)
        setLoading(false)
        logger.log('✅ User set successfully:', authData.user)
        logger.log('🔍 User ID details:', {
          user_id: authData.user.user_id,
          id: authData.user.id,
          using_uuid: !!authData.user.user_id,
          customerGuid: authData.user.customerGuid
        })
        logger.log('✅ Auth state after signin:', { 
          user: !!authData.user, 
          isAuthenticated: !!authData.user,
          loading: false 
        })
        
        // Redirect to onboarding for users who haven't completed it
        if (!authData.user.onboarding_completed) {
          logger.log('🔄 User needs onboarding, redirecting to onboarding')
          // Only redirect if not already on an allowed path
          if (!window.location.pathname.startsWith('/onboarding') && 
              !window.location.pathname.startsWith('/dashboard/notifications')) {
            router.push('/onboarding')
          }
        } else {
          logger.log('✅ User onboarding complete, redirecting to dashboard')
          // Only redirect if not already on a dashboard page
          if (!window.location.pathname.startsWith('/dashboard')) {
            router.push('/dashboard')
          }
        }
        
        return { error: null }
      } else {
        logger.error('Signin failed:', response.message)
        setLoading(false) // Stop loading on error
        return { error: new Error(response.message || 'Sign in failed') }
      }
    } catch (error) {
      logger.error('Sign in error:', error)
      setLoading(false) // Stop loading on error
      return { error }
    }
  }

  const signInWithGoogleIdToken = async (idToken: string) => {
    try {
      setLoading(true)

      const redirectResult = await completeGoogleAuthExchange({ idToken }, setUser)
      navigateAfterGoogleAuth(router, redirectResult)

      return { error: null }
    } catch (error) {
      logger.error('Direct Google sign in error:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    return {
      error: new Error('Use the Google sign-in button'),
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      await apiClient.signOut()
      
      apiClient.setToken(null)
      apiClient.setRefreshToken(null)
      setUser(null)
      
      router.push('/auth/signin')
      
      return { error: null }
    } catch (error) {
      logger.error('Sign out error:', error)
      apiClient.setToken(null)
      apiClient.setRefreshToken(null)
      setUser(null)
      router.push('/auth/signin')
      
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const refreshToken = async () => {
    try {
      const newToken = await apiClient.refreshAccessToken()
      if (newToken) {
        // Token refreshed successfully, fetch updated user data
        await fetchUserData()
        return { error: null }
      }
      return { error: new Error('Token refresh failed') }
    } catch (error) {
      logger.error('Error refreshing token:', error)
      return { error }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGoogleIdToken,
    signOut,
    refreshToken,
    isAuthenticated,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}