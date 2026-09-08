'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react'
import { useAuth } from './auth-context'
import { apiClient } from '@/lib/api-client'
import { PersonaVerificationResult, PersonaConfig, PersonaClient } from '@/types/persona'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { getPersonaSdkEnvironment } from '@/lib/persona-environment'

declare global {
  interface Window {
    Persona?: {
      Client: new (config: PersonaConfig) => PersonaClient
    }
  }
}

type FrontendStatus = 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'

interface PersonaVerificationState {
  isLoading: boolean
  isVerifying: boolean
  status: FrontendStatus
  inquiryId: string | null
  personaClient: any
  error: string | null
}

interface PersonaContextType {
  verificationState: PersonaVerificationState
  setVerificationState: React.Dispatch<React.SetStateAction<PersonaVerificationState>>
  isPersonaLoaded: boolean
  personaLoadError: string | null
  startVerification: () => Promise<PersonaVerificationResult>
  retryPersonaLoad: () => void
  customerGuid: string | null
  setCustomerGuid: (guid: string | null) => void
  clearVerificationStatus: (userId: string) => void
  refreshVerificationStatus: () => Promise<void>
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined)

export const usePersona = () => {
  const context = useContext(PersonaContext)
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider')
  }
  return context
}

function mapKycStatus(status?: string): FrontendStatus {
  switch (status) {
    case 'verified':
      return 'completed'
    case 'expired':
    case 'rejected':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'pending':
      return 'pending'
    default:
      return 'idle'
  }
}

export const PersonaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [isPersonaLoaded, setIsPersonaLoaded] = useState(false)
  const [personaLoadError, setPersonaLoadError] = useState<string | null>(null)
  const [customerGuid, setCustomerGuid] = useState<string | null>(null)
  const [verificationState, setVerificationState] = useState<PersonaVerificationState>({
    isLoading: false,
    isVerifying: false,
    status: 'idle',
    inquiryId: null,
    personaClient: null,
    error: null,
  })
  const expiredInquiryIdsRef = useRef<Set<string>>(new Set())

  const getUserId = useCallback(() => {
    if (!user) return null
    return user.user_id || user.id
  }, [user])

  const saveVerificationStatus = useCallback((status: string, userId: string, guid?: string) => {
    if (typeof window === 'undefined') return
    if (status === 'completed') {
      localStorage.setItem(
        `verification_status_${userId}`,
        JSON.stringify({
          status: 'completed',
          verifiedAt: new Date().toISOString(),
          customerGuid: guid || null,
          userId,
        }),
      )
    } else if (status === 'failed' || status === 'cancelled') {
      localStorage.removeItem(`verification_status_${userId}`)
    }
  }, [])

  const applyKycData = useCallback(
    (data: Record<string, any> | undefined, userId: string) => {
      if (!data) return
      const frontendStatus = mapKycStatus(data.status)
      if (data.customer_guid) {
        setCustomerGuid(data.customer_guid)
      }
      setVerificationState((prev) => ({
        ...prev,
        status: frontendStatus,
        inquiryId: data.personaInquiryId ?? data.persona_inquiry_id ?? prev.inquiryId,
        isLoading: false,
        isVerifying: false,
        error: null,
      }))
      if (frontendStatus === 'completed') {
        saveVerificationStatus('completed', userId, data.customer_guid)
      } else if (frontendStatus === 'idle') {
        localStorage.removeItem(`verification_status_${userId}`)
      }
    },
    [saveVerificationStatus],
  )

  const refreshVerificationStatus = useCallback(async () => {
    const userId = getUserId()
    if (!userId) return
    try {
      const response = await apiClient.getKycStatus(true)
      if (response.success && response.data) {
        applyKycData(response.data as Record<string, any>, userId)
      }
    } catch (error) {
      logger.error('Failed to refresh KYC status:', error)
    }
  }, [getUserId, applyKycData])

  useEffect(() => {
    const userId = getUserId()
    if (!userId || typeof window === 'undefined') return

    const storedStatus = localStorage.getItem(`verification_status_${userId}`)
    if (storedStatus) {
      try {
        const verificationData = JSON.parse(storedStatus)
        if (verificationData.status === 'completed') {
          if (verificationData.customerGuid) {
            setCustomerGuid(verificationData.customerGuid)
          }
          setVerificationState((prev) => ({
            ...prev,
            status: 'completed',
            isLoading: false,
            isVerifying: false,
            error: null,
          }))
        }
      } catch {
        localStorage.removeItem(`verification_status_${userId}`)
      }
    }

    void (async () => {
      try {
        const response = await apiClient.getKycStatus(true)
        if (response.success && response.data) {
          applyKycData(response.data as Record<string, any>, userId)
        }
      } catch (error) {
        logger.warn('KYC status sync failed; keeping local state', error)
      }
    })()
  }, [user, getUserId, applyKycData])

  const clearVerificationStatus = useCallback((userId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`verification_status_${userId}`)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.Persona) {
      setIsPersonaLoaded(true)
      return
    }

    const existingScript = document.querySelector('script[id="persona-sdk"]')
    if (existingScript) {
      const check = setInterval(() => {
        if (window.Persona) {
          clearInterval(check)
          setIsPersonaLoaded(true)
        }
      }, 100)
      return () => clearInterval(check)
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.withpersona.com/dist/persona-v4.9.0.js'
    script.id = 'persona-sdk'
    script.async = true
    script.crossOrigin = 'anonymous'
    const timeoutId = window.setTimeout(() => {
      setPersonaLoadError('Persona SDK load timeout')
    }, 10000)
    script.onload = () => {
      window.clearTimeout(timeoutId)
      setIsPersonaLoaded(true)
      setPersonaLoadError(null)
    }
    script.onerror = () => {
      window.clearTimeout(timeoutId)
      setPersonaLoadError('Failed to load Persona SDK')
    }
    document.head.appendChild(script)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const retryPersonaLoad = useCallback(() => {
    setPersonaLoadError(null)
    setIsPersonaLoaded(false)
    const existingScript = document.querySelector('script[id="persona-sdk"]')
    if (existingScript) existingScript.remove()
    window.location.reload()
  }, [])

  const launchPersonaSDK = useCallback(
    async (
      personaInquiryId: string,
      customerGuidValue: string | undefined,
    ): Promise<PersonaVerificationResult> => {
      const personaEnvironment = getPersonaSdkEnvironment()

      setVerificationState((prev) => {
        try {
          const prevClient = prev.personaClient as { close?: () => void } | null
          prevClient?.close?.()
        } catch {
          // ignore
        }
        return { ...prev, personaClient: null, error: null }
      })

      setCustomerGuid(customerGuidValue || null)

      const personaConfig: PersonaConfig & { container?: string } = {
        inquiryId: personaInquiryId,
        container: '#persona-verification-container',
        onReady: () => {
          setVerificationState((prev) => ({
            ...prev,
            isLoading: false,
            status: 'pending',
          }))
        },
        onComplete: () => {
          setVerificationState((prev) => ({
            ...prev,
            isLoading: false,
            status: 'completed',
            error: null,
          }))
          const userId = getUserId()
          if (userId) {
            saveVerificationStatus('completed', userId, customerGuidValue)
          }
          void apiClient.getKycStatus(true)
          toast.success('Identity Verified Successfully!', {
            description: 'Your identity has been verified and you now have full access to all features.',
            duration: 5000,
          })
        },
        onCancel: () => {
          setVerificationState((prev) => ({
            ...prev,
            isLoading: false,
            status: 'cancelled',
            error: 'Verification was cancelled',
          }))
          const userId = getUserId()
          if (userId) saveVerificationStatus('cancelled', userId)
          toast.info('Verification Cancelled', {
            description: 'Identity verification was cancelled. You can try again anytime.',
            duration: 4000,
          })
        },
        onError: (error: any) => {
          const isSessionExpired = String(error?.message || '').toLowerCase().includes('session expired')
          if (isSessionExpired && personaInquiryId) {
            expiredInquiryIdsRef.current.add(personaInquiryId)
          }
          setVerificationState((prev) => ({
            ...prev,
            isLoading: false,
            status: isSessionExpired ? 'idle' : 'failed',
            error: isSessionExpired
              ? 'Previous verification session expired. Please try again to continue with a new session.'
              : (error.message || 'Verification failed'),
          }))
          const userId = getUserId()
          if (userId) saveVerificationStatus('failed', userId)
          toast.error(isSessionExpired ? 'Verification Session Expired' : 'Verification Failed', {
            description: isSessionExpired
              ? 'Your previous Persona session expired. Tap Try Again to continue with a fresh session.'
              : (error.message || 'Identity verification failed. Please try again.'),
            duration: 5000,
          })
        },
        environment: personaEnvironment,
      }

      const personaClient = new window.Persona!.Client(personaConfig)
      setVerificationState((prev) => ({
        ...prev,
        isLoading: false,
        inquiryId: personaInquiryId,
        personaClient,
        status: 'pending',
      }))

      if (typeof personaClient.start === 'function') {
        personaClient.start()
      } else if (typeof personaClient.open === 'function') {
        personaClient.open()
      } else {
        throw new Error('Persona client does not have start or open method')
      }

      return {
        success: true,
        inquiryId: personaInquiryId,
        status: 'pending',
      }
    },
    [getUserId, saveVerificationStatus],
  )

  const startVerification = useCallback(async (): Promise<PersonaVerificationResult> => {
    if (!isAuthenticated || !user) {
      return { success: false, inquiryId: '', status: 'failed', error: 'User not authenticated' }
    }
    if (!isPersonaLoaded) {
      return { success: false, inquiryId: '', status: 'failed', error: 'Persona SDK is not loaded yet' }
    }
    const userId = getUserId()
    if (!userId) {
      return { success: false, inquiryId: '', status: 'failed', error: 'User ID not available' }
    }

    try {
      setVerificationState((prev) => ({ ...prev, isLoading: true, error: null }))

      const statusResponse = await apiClient.getKycStatus(true)
      const statusData = (statusResponse.data || {}) as Record<string, any>
      applyKycData(statusData, userId)

      if (statusData.is_verified || statusData.status === 'verified') {
        return {
          success: true,
          inquiryId: statusData.personaInquiryId || '',
          status: 'completed',
        }
      }

      const existingInquiry = statusData.personaInquiryId || statusData.persona_inquiry_id
      const inquiryUsable =
        Boolean(existingInquiry) &&
        !expiredInquiryIdsRef.current.has(existingInquiry) &&
        (statusData.can_resume || statusData.status === 'pending' || statusData.status === 'not_started')

      if (inquiryUsable) {
        return await launchPersonaSDK(existingInquiry, statusData.customer_guid)
      }

      const startResponse = await apiClient.startKycVerification(userId, {
        productIntent: 'send_and_invest',
      })
      const startData = (startResponse.data || {}) as Record<string, any>
      const inquiryId = startData.personaInquiryId || startData.persona_inquiry_id
      if (!inquiryId) {
        throw new Error('No Persona inquiry ID available to start verification')
      }
      if (startData.customer_guid) {
        setCustomerGuid(startData.customer_guid)
      }
      return await launchPersonaSDK(inquiryId, startData.customer_guid)
    } catch (error: any) {
      logger.error('Verification failed:', error)
      setVerificationState((prev) => ({
        ...prev,
        isLoading: false,
        status: 'failed',
        error: error.message || 'Verification failed',
      }))
      return {
        success: false,
        inquiryId: '',
        status: 'failed',
        error: error.message || 'Verification failed',
      }
    }
  }, [
    isAuthenticated,
    user,
    isPersonaLoaded,
    getUserId,
    applyKycData,
    launchPersonaSDK,
  ])

  const value: PersonaContextType = {
    verificationState,
    setVerificationState,
    isPersonaLoaded,
    personaLoadError,
    startVerification,
    retryPersonaLoad,
    customerGuid,
    setCustomerGuid,
    clearVerificationStatus,
    refreshVerificationStatus,
  }

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
}
