'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PhoneInput } from '@/components/ui/phone-input'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function CompleteProfilePage() {
  const { user, loading: authLoading, setUser } = useAuth()
  const router = useRouter()

  const [phone, setPhone] = useState('')
  const [phoneLocalPart, setPhoneLocalPart] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false)
  const [isVerifyingPhoneCode, setIsVerifyingPhoneCode] = useState(false)
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null)
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [hasRequestedPhoneCode, setHasRequestedPhoneCode] = useState(false)
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false)
  const autoRequestAttemptedRef = useRef(false)
  const [isAutoSavingPhone, setIsAutoSavingPhone] = useState(false)
  const [hasSavedPhone, setHasSavedPhone] = useState(false)

  const normalizePhone = (value: string) => {
    let normalized = value.trim()
    normalized = normalized.replace(/[\s\-\(\)]/g, '')

    if (!normalized) {
      return ''
    }

    if (!normalized.startsWith('+')) {
      normalized = `+${normalized.replace(/^\+*/, '')}`
    }

    return normalized
  }

  const isValidPhone = (value: string) => {
    const cleaned = normalizePhone(value)
    const usaPhoneRegex = /^\+1\d{10}$/
    return usaPhoneRegex.test(cleaned)
  }

  const formattedExamples = useMemo(
    () => ['+12025550123', '+13125550123', '+14085550123'],
    []
  )

  const normalizedPhone = useMemo(() => {
    const targetPhone = phone || (phoneLocalPart ? `+${phoneLocalPart}` : '')
    return normalizePhone(targetPhone)
  }, [phone, phoneLocalPart])

  const hasValidPhone = useMemo(() => {
    if (!normalizedPhone) return false
    return isValidPhone(normalizedPhone)
  }, [normalizedPhone])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.replace('/auth/signin')
      return
    }

    if (user.phone && user.phone.trim() !== '') {
      logger.log('✅ Phone number already present, redirecting away from complete-profile')
      if (!user.onboarding_completed) {
        router.replace('/onboarding')
      } else {
        router.replace('/dashboard')
      }
      return
    }

    if (!phone && user.phone) {
      setPhone(user.phone)
    }
  }, [user, authLoading, router, phone])

  useEffect(() => {
    if (resendCountdown <= 0) return
    const intervalId = window.setInterval(() => {
      setResendCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [resendCountdown])

  const handlePhoneChange = (localNumber: string, countryCode: string, fullNumber: string) => {
    setPhoneLocalPart(localNumber)
    setPhone(fullNumber)
    if (phoneError) setPhoneError(null)
    if (error) setError(null)
    setIsPhoneVerified(false)
    setPhoneVerificationToken(null)
    setPhoneVerificationCode('')
    setPhoneVerificationMessage(null)
    setPhoneVerificationError(null)
    setHasRequestedPhoneCode(false)
    setResendCountdown(0)
    setShowPhoneVerificationModal(false)
    autoRequestAttemptedRef.current = false
    setHasSavedPhone(false)
  }

  const persistPhoneNumber = useCallback(async (confirmedPhone: string, verificationToken: string) => {
    logger.log('💾 [PERSIST] Starting phone number persistence', {
      phone: confirmedPhone,
      hasToken: !!verificationToken,
      isAutoSavingPhone,
      hasSavedPhone,
      userId: user?.id
    })

    if (isAutoSavingPhone) {
      logger.log('⚠️ [PERSIST] Skipping - already saving in progress')
      return
    }
    
    if (hasSavedPhone) {
      logger.log('⚠️ [PERSIST] Phone already saved, forcing redirect anyway')
      // Even if already saved, ensure we redirect
      const userData = user as any
      const isOnboardingComplete = userData?.onboarding_completed === true || 
                                   userData?.borabond_onboarding_completed === true
      logger.log('🔍 [PERSIST] Onboarding status check', {
        onboarding_completed: userData?.onboarding_completed,
        borabond_onboarding_completed: userData?.borabond_onboarding_completed,
        isOnboardingComplete
      })
      
      if (!isOnboardingComplete) {
        logger.log('🚀 [PERSIST] Redirecting to /onboarding (already saved)')
        router.replace('/onboarding')
        setTimeout(() => {
          logger.log('🔄 [PERSIST] Fallback redirect to /onboarding')
          window.location.href = '/onboarding'
        }, 500)
      } else {
        logger.log('🚀 [PERSIST] Redirecting to /dashboard (already saved)')
        router.replace('/dashboard')
        setTimeout(() => {
          logger.log('🔄 [PERSIST] Fallback redirect to /dashboard')
          window.location.href = '/dashboard'
        }, 500)
      }
      return
    }

    if (!user) {
      logger.error('❌ [PERSIST] No user found')
      setError('You need to be signed in to update your phone number.')
      router.replace('/auth/signin')
      return
    }

    if (!hasValidPhone) {
      logger.warn('⚠️ [PERSIST] Invalid phone number')
      setPhoneError('Enter a valid US phone number, for example +12025550123.')
      return
    }

    logger.log('🔄 [PERSIST] Setting state - starting save process')
    setIsAutoSavingPhone(true)
    setError(null)
    setSuccessMessage(null)

    try {
      logger.log('📱 [PERSIST] Calling API to save phone number', { 
        userId: user.id, 
        phone: confirmedPhone, 
        hasVerificationToken: !!verificationToken 
      })
      const response = await apiClient.addPhoneNumber(confirmedPhone, verificationToken)
      logger.log('📬 [PERSIST] API response received', { 
        success: response.success, 
        hasData: !!response.data, 
        hasUser: !!response.data?.user,
        message: response.message 
      })

      const responseUser = response.data?.user

      if (response.success && responseUser) {
        logger.log('✅ [PERSIST] API call successful, updating user state', {
          hasResponseUser: !!responseUser,
          userPhone: responseUser.phone
        })

        const updatedUser = {
          ...user,
          ...responseUser,
          phone: responseUser.phone ?? confirmedPhone,
        }

        logger.log('🔄 [PERSIST] Updating user context', {
          userId: updatedUser.id,
          phone: updatedUser.phone
        })
        setUser(updatedUser as any)
        setSuccessMessage('Phone number saved automatically.')
        setHasSavedPhone(true)

        logger.log('✅ [PERSIST] Phone number auto-saved, checking onboarding status', {
          onboarding_completed: updatedUser.onboarding_completed,
          borabond_onboarding_completed: updatedUser.borabond_onboarding_completed,
          user_id: updatedUser.id
        })

        // For new customers, always redirect to onboarding unless explicitly completed
        const isOnboardingComplete = updatedUser.onboarding_completed === true || 
                                     updatedUser.borabond_onboarding_completed === true
        
        logger.log('🔍 [PERSIST] Onboarding check result', { 
          isOnboardingComplete,
          onboarding_completed: updatedUser.onboarding_completed,
          borabond_onboarding_completed: updatedUser.borabond_onboarding_completed
        })
        
        // Redirect immediately - don't wait for state updates
        if (!isOnboardingComplete) {
          logger.log('🚀 [PERSIST] Redirecting new customer to /onboarding')
          logger.log('📍 [PERSIST] Current URL:', window.location.href)
          // Redirect immediately and also set a fallback
          router.replace('/onboarding')
          logger.log('✅ [PERSIST] router.replace(/onboarding) called')
          // Fallback redirect in case the first one doesn't work
          setTimeout(() => {
            logger.log('🔄 [PERSIST] Executing fallback redirect to /onboarding')
            logger.log('📍 [PERSIST] Current URL before fallback:', window.location.href)
            window.location.href = '/onboarding'
          }, 500)
        } else {
          logger.log('✅ [PERSIST] Onboarding already completed, redirecting to /dashboard')
          logger.log('📍 [PERSIST] Current URL:', window.location.href)
          router.replace('/dashboard')
          logger.log('✅ [PERSIST] router.replace(/dashboard) called')
          // Fallback redirect in case the first one doesn't work
          setTimeout(() => {
            logger.log('🔄 [PERSIST] Executing fallback redirect to /dashboard')
            logger.log('📍 [PERSIST] Current URL before fallback:', window.location.href)
            window.location.href = '/dashboard'
          }, 500)
        }
      } else {
        const errorMsg = response.message || 'Failed to update phone number. Please try again.'
        logger.error('❌ [PERSIST] Auto-save failed', { 
          message: errorMsg, 
          response,
          success: response.success,
          hasUser: !!responseUser
        })
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    } catch (err: unknown) {
      logger.error('❌ [PERSIST] Exception during phone save', err)
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to update phone number. Please try again.'
      logger.error('❌ [PERSIST] Error message:', message)
      setError(message)
      throw err // Re-throw so the caller can handle it
    } finally {
      logger.log('🏁 [PERSIST] Persistence process completed, resetting isAutoSavingPhone')
      setIsAutoSavingPhone(false)
    }
  }, [apiClient, hasSavedPhone, hasValidPhone, router, setUser, user, isAutoSavingPhone])

  const handleSendPhoneVerificationCode = useCallback(async () => {
    setPhoneVerificationError(null)
    setPhoneVerificationMessage(null)
    setSuccessMessage(null)

    if (!normalizedPhone) {
      setPhoneError('Please enter your phone number.')
      return
    }

    if (!hasValidPhone) {
      setPhoneError('Enter a valid US phone number, for example +12025550123.')
      return
    }

    setIsSendingPhoneCode(true)
    autoRequestAttemptedRef.current = true
    setIsPhoneVerified(false)
    setPhoneVerificationToken(null)

    try {
      logger.log('📱 Sending phone verification code', { phone: normalizedPhone, hasValidPhone })
      const response = await apiClient.sendPhoneVerificationCode(normalizedPhone)
      logger.log('📬 Send code response', { success: response.success, message: response.message, hasData: !!response.data })
      
      if (response.success) {
        const devCode = (response as any)?.devCode
        const successText = devCode
          ? `${response.message} (Code: ${devCode})`
          : response.message || 'Verification code sent.'

        setPhoneVerificationMessage(successText)
        setPhoneVerificationCode('')
        setHasRequestedPhoneCode(true)
        setResendCountdown(60)
        setShowPhoneVerificationModal(true)
      } else {
        const errorMsg = response.message || response.error || 'Failed to send verification code.'
        logger.error('❌ Send code failed', { message: errorMsg, response })
        setPhoneVerificationError(errorMsg)
      }
    } catch (err) {
      logger.error('❌ Failed to send phone verification code', err)
      
      // Extract error message from various error formats
      let errorMessage = 'Failed to send verification code. Please check your connection and try again.'
      
      if (err && typeof err === 'object') {
        // Check for ApiError format (from api-client)
        if ('message' in err) {
          errorMessage = String((err as { message?: string }).message)
        } 
        // Check for details.message (nested error)
        else if ('details' in err && err.details && typeof err.details === 'object' && 'message' in err.details) {
          errorMessage = String((err.details as { message?: string }).message)
        }
        // Check for error property
        else if ('error' in err) {
          errorMessage = String((err as { error?: string }).error)
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      logger.error('❌ Error details', { errorMessage, err })
      setPhoneVerificationError(errorMessage)
    } finally {
      setIsSendingPhoneCode(false)
    }
  }, [hasValidPhone, normalizedPhone])

  useEffect(() => {
    if (
      hasValidPhone &&
      !hasRequestedPhoneCode &&
      !isPhoneVerified &&
      !isSendingPhoneCode &&
      !autoRequestAttemptedRef.current
    ) {
      handleSendPhoneVerificationCode()
    }
  }, [
    hasValidPhone,
    hasRequestedPhoneCode,
    isPhoneVerified,
    isSendingPhoneCode,
    handleSendPhoneVerificationCode,
  ])

  const handleVerifyPhoneCode = useCallback(async () => {
    logger.log('🔐 [VERIFY] Starting phone verification', {
      codeLength: phoneVerificationCode.trim().length,
      phone: normalizedPhone,
      hasValidPhone
    })

    if (phoneVerificationCode.trim().length !== 6) {
      logger.warn('⚠️ [VERIFY] Code length invalid')
      setPhoneVerificationError('Enter the 6-digit verification code we sent to your phone.')
      return
    }

    if (!normalizedPhone || !hasValidPhone) {
      logger.warn('⚠️ [VERIFY] Phone number invalid')
      setPhoneError('Enter a valid US phone number before verifying.')
      return
    }

    setIsVerifyingPhoneCode(true)
    setPhoneVerificationError(null)

    try {
      const trimmedCode = phoneVerificationCode.trim()
      logger.log('📞 [VERIFY] Calling API to verify code', { 
        phone: normalizedPhone,
        code: trimmedCode,
        codeLength: trimmedCode.length,
        hasValidPhone
      })
      const response = await apiClient.verifyPhoneVerificationCode(
        normalizedPhone,
        trimmedCode
      )
      const responseAny = response as any
      logger.log('📬 [VERIFY] API response received', {
        success: response.success,
        hasToken: !!(responseAny.verificationToken || responseAny.data?.verificationToken),
        message: response.message,
        fullResponse: responseAny
      })

      // Backend returns verificationToken at top level, but check both locations for compatibility
      const verificationToken = responseAny.verificationToken || responseAny.data?.verificationToken

      if (response.success && verificationToken) {
        logger.log('✅ [VERIFY] Verification successful!', { hasToken: !!verificationToken })
        setIsPhoneVerified(true)
        setPhoneVerificationToken(verificationToken)
        setPhoneVerificationMessage('Phone number verified.')
        setPhoneVerificationError(null) // Clear any previous errors
        setPhoneVerificationCode('')
        setShowPhoneVerificationModal(false)
        
        logger.log('💾 [VERIFY] Starting phone number persistence', {
          phone: normalizedPhone,
          hasToken: !!verificationToken
        })
        
        // Immediately persist and redirect
        try {
          await persistPhoneNumber(normalizedPhone, verificationToken)
          logger.log('✅ [VERIFY] Phone number persisted successfully')
        } catch (persistErr) {
          // Handle persist errors separately so they don't override verification success
          logger.error('❌ [VERIFY] Failed to persist phone number after verification', persistErr)
          setError('Phone verified but failed to save. Please try again.')
          // Still keep verification as successful
          // Even if persist fails, try to redirect as a fallback
          logger.log('🔄 [VERIFY] Attempting fallback redirect after persist failure')
          setTimeout(() => {
            logger.log('🚀 [VERIFY] Executing fallback redirect to /onboarding')
            router.replace('/onboarding')
          }, 1000)
        }
      } else {
        logger.error('❌ [VERIFY] Verification failed', {
          success: response.success,
          hasToken: !!verificationToken,
          message: response.message,
          error: response.error,
          fullResponse: response
        })
        const errorMsg = response.message || response.error || 'Invalid verification code.'
        setPhoneVerificationError(errorMsg)
      }
    } catch (err) {
      logger.error('❌ [VERIFY] Exception during verification', err)
      
      // Extract error message from various error formats
      let errorMessage = 'Failed to verify phone number. Please try again.'
      
      if (err && typeof err === 'object') {
        // Check for ApiError format (from api-client)
        if ('message' in err) {
          errorMessage = String((err as { message?: string }).message)
        } 
        // Check for details.message (nested error)
        else if ('details' in err && err.details && typeof err.details === 'object' && 'message' in err.details) {
          errorMessage = String((err.details as { message?: string }).message)
        }
        // Check for error property
        else if ('error' in err) {
          errorMessage = String((err as { error?: string }).error)
        }
        // Check for status code
        if ('status' in err) {
          logger.error('❌ [VERIFY] HTTP Status:', (err as { status?: number }).status)
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      logger.error('❌ [VERIFY] Error details', { 
        errorMessage, 
        err,
        errorType: typeof err,
        errorKeys: err && typeof err === 'object' ? Object.keys(err) : []
      })
      setPhoneVerificationError(errorMessage)
    } finally {
      setIsVerifyingPhoneCode(false)
      logger.log('🏁 [VERIFY] Verification process completed')
    }
  }, [hasValidPhone, normalizedPhone, phoneVerificationCode, persistPhoneNumber])

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    logger.log('🔢 [AUTO-VERIFY] Checking conditions', {
      codeLength: phoneVerificationCode.length,
      hasValidPhone,
      hasRequestedPhoneCode,
      isPhoneVerified,
      isVerifyingPhoneCode,
      hasError: !!phoneVerificationError
    })

    if (
      phoneVerificationCode.length === 6 &&
      hasValidPhone &&
      hasRequestedPhoneCode &&
      !isPhoneVerified &&
      !isVerifyingPhoneCode &&
      !phoneVerificationError
    ) {
      logger.log('🔢 [AUTO-VERIFY] All conditions met - triggering auto-verification', {
        code: phoneVerificationCode
      })
      handleVerifyPhoneCode()
    } else if (phoneVerificationCode.length === 6) {
      logger.log('⚠️ [AUTO-VERIFY] 6 digits entered but conditions not met', {
        hasValidPhone,
        hasRequestedPhoneCode,
        isPhoneVerified,
        isVerifyingPhoneCode,
        hasError: !!phoneVerificationError
      })
    }
  }, [
    phoneVerificationCode,
    hasValidPhone,
    hasRequestedPhoneCode,
    isPhoneVerified,
    isVerifyingPhoneCode,
    phoneVerificationError,
    handleVerifyPhoneCode,
  ])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-gray-600">Preparing your account...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <Card className="w-full max-w-xl mx-4 shadow-xl border border-blue-100">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl font-semibold text-gray-900">Add Your Phone Number</CardTitle>
              <CardDescription className="text-gray-600">
                We use your phone number to secure your account and send important updates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Why we need this</AlertTitle>
            <AlertDescription>
              Your phone number helps us confirm transactions, protect your account, and reach you when actions are needed.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save phone number</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertTitle>Phone number updated</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-5"
            onSubmit={event => {
              event.preventDefault()
            }}
          >
            <div className="space-y-2">
              <PhoneInput
                id="phone"
                label="Phone number"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="202 555 0123"
                required
                error={phoneError || undefined}
                allowedCountries={['US']}
                helpText="Please enter a valid US phone number"
              />
           
            </div>

            <div className="space-y-3 rounded-xl border border-blue-100 bg-white/70 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Secure your account via SMS</p>
                  <p className="text-sm text-gray-600">
                  We will send a 6 digit code to your number to confirm it’s you.
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 flex flex-col gap-1">
                {!hasValidPhone && (
                  <></>
                )}
                {hasValidPhone && !hasRequestedPhoneCode && (
                  <span className="inline-flex items-center gap-2 text-green-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending verification code…
                  </span>
                )}
                {hasValidPhone && hasRequestedPhoneCode && (
                  <>We sent a 6-digit code via SMS. Enter it in the verification modal to proceed.</>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="sm:flex-1"
                  onClick={() => setShowPhoneVerificationModal(true)}
                  disabled={!hasRequestedPhoneCode || isPhoneVerified}
                >
                  Enter Verification Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:flex-1"
                  onClick={handleSendPhoneVerificationCode}
                  disabled={
                    !hasValidPhone ||
                    isSendingPhoneCode ||
                    resendCountdown > 0 ||
                    isAutoSavingPhone
                  }
                >
                  {isSendingPhoneCode ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : resendCountdown > 0 ? (
                    `Resend in ${resendCountdown}s`
                  ) : (
                    hasRequestedPhoneCode ? 'Resend Code' : 'Send Code'
                  )}
                </Button>
              </div>
              {phoneVerificationError && (
                <p className="text-sm text-red-500">{phoneVerificationError}</p>
              )}
              {phoneVerificationMessage && (
                <p className={`text-sm font-medium ${
                  isPhoneVerified || phoneVerificationMessage.includes('verified') 
                    ? 'text-green-600' 
                    : 'text-gray-600'
                }`}>
                  {phoneVerificationMessage}
                </p>
              )}
            </div>

            {isPhoneVerified && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-medium">Phone number verified</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
                  {isAutoSavingPhone ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving your phone number automatically...
                    </span>
                  ) : hasSavedPhone ? (
                    <span className="flex items-center gap-2 text-green-700">
                      <ShieldCheck className="h-4 w-4" />
                      Phone number saved. Redirecting you now.
                    </span>
                  ) : (
                    'Hang tight—your verified phone number is being saved in the background.'
                  )}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={showPhoneVerificationModal}
        onOpenChange={open => {
          if (!open) {
            setShowPhoneVerificationModal(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Enter verification code
            </DialogTitle>
            <DialogDescription>
              Type the 6-digit code we sent to {normalizedPhone || 'your phone number'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              id="modal-phone-verification-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={phoneVerificationCode}
              onChange={event => {
                setPhoneVerificationCode(event.target.value.replace(/[^\d]/g, ''))
                if (phoneVerificationError) setPhoneVerificationError(null)
              }}
              className="text-center text-lg tracking-[0.5em]"
            />
            {phoneVerificationError && (
              <p className="text-sm text-red-500">{phoneVerificationError}</p>
            )}
            {phoneVerificationMessage && (
              <p className={`text-sm font-medium ${
                isPhoneVerified || phoneVerificationMessage.includes('verified') 
                  ? 'text-green-600' 
                  : 'text-gray-600'
              }`}>
                {phoneVerificationMessage}
              </p>
            )}
          </div>

          <DialogFooter className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPhoneVerificationModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerifyPhoneCode}
              disabled={
                isVerifyingPhoneCode ||
                phoneVerificationCode.trim().length !== 6 ||
                !hasRequestedPhoneCode
              }
            >
              {isVerifyingPhoneCode ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendPhoneVerificationCode}
              disabled={
                !hasValidPhone ||
                isSendingPhoneCode ||
                resendCountdown > 0
              }
            >
              {isSendingPhoneCode ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : resendCountdown > 0 ? (
                `Resend in ${resendCountdown}s`
              ) : (
                'Resend Code'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

