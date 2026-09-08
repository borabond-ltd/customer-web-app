'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OptimizedInput } from '@/components/optimized-input'
import { OptimizedButton } from '@/components/optimized-button'
import { GoogleSignInButton } from '@/components/google-signin-button'
import { PhoneInput } from '@/components/ui/phone-input'
import { PerformanceMonitor } from '@/components/performance-monitor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorDisplay } from '@/components/ui/error-display'
import { showErrorToast, showSuccessToast } from '@/lib/toast-notifications'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { 
  Loader2, Mail, Lock, User, Phone, Chrome, CheckCircle, XCircle, AlertCircle, 
  LogIn, Eye, EyeOff, Zap, Shield, ArrowRight, Sparkles 
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
// Custom debounce function for better performance
const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Performance-optimized transition component
const RedirectTransition = ({ isActive, message }: { isActive: boolean; message: string }) => {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: 'spring', 
              damping: 20, 
              stiffness: 100,
              duration: prefersReducedMotion ? 0.1 : 0.5
            }}
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 flex flex-col items-center max-w-md text-center shadow-2xl border border-green-500/20"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { rotate: 360 }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
              className="mb-4"
            >
              <Sparkles className="h-12 w-12 text-green-100" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
              {message}
            </h2>
            <p className="text-green-100 text-sm">Redirecting you securely...</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Optimized form validation hook
const useFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [])
  
  const validatePassword = useCallback((password: string) => {
    return password.length >= 6
  }, [])
  
  const validateForm = useCallback((formData: { email: string; password: string; name?: string; phone?: string; phoneNumber?: string; firstName?: string; lastName?: string; confirmPassword?: string }, isSignUp: boolean = false) => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password || !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (isSignUp) {
      if (!formData.firstName?.trim()) {
        newErrors.firstName = 'First name is required'
      }
      if (!formData.lastName?.trim()) {
        newErrors.lastName = 'Last name is required'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
      const phoneValue = (formData.phone || formData.phoneNumber || '').trim()
      if (!phoneValue) {
        newErrors.phoneNumber = 'Phone number is required'
      } else {
        let normalized = phoneValue.trim()
        normalized = normalized.replace(/[\s\-\(\)]/g, '')
        if (!normalized.startsWith('+')) {
          normalized = `+${normalized.replace(/^\+*/, '')}`
        }
        // Only accept +1 (USA) numbers with 10 digits after country code
        const usaPhoneRegex = /^\+1\d{10}$/
        if (!usaPhoneRegex.test(normalized)) {
          newErrors.phoneNumber = 'Enter a valid US phone number, for example 2025550123'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validateEmail, validatePassword])
  
  return { errors, validateForm, clearErrors: () => setErrors({}) }
}

// Main Auth Page Component
function AuthPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [shakeError, setShakeError] = useState(false)
  const [showRedirectAnimation, setShowRedirectAnimation] = useState(false)
  const [redirectMessage, setRedirectMessage] = useState('Signing in...')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('signin')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, signUp, signIn, signInWithGoogleIdToken, isAuthenticated } = useAuth()
  const { errors, validateForm, clearErrors } = useFormValidation()
  
  // Get the redirect URL from query params
  const redirectTo = useMemo(() => searchParams.get('redirect') || '/dashboard', [searchParams])
  
  // Check for password reset success message
  const resetSuccessMessage = searchParams.get('message') === 'password-reset-success'
  
  // Form states with optimized updates
  const [signUpForm, setSignUpForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  })
  
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  })

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
  
  // Debounced form validation
  const debouncedValidateSignUp = useMemo(
    () => debounce(() => validateForm(signUpForm, true), 300),
    [signUpForm, validateForm]
  )
  
  const debouncedValidateSignIn = useMemo(
    () => debounce(() => validateForm(signInForm, false), 300),
    [signInForm, validateForm]
  )

  const normalizePhone = useCallback((value: string) => {
    if (!value) return ''
    let normalized = value.trim()
    normalized = normalized.replace(/[\s\-\(\)]/g, '')
    
    if (!normalized) return ''
    
    if (!normalized.startsWith('+')) {
      normalized = `+${normalized.replace(/^\+*/, '')}`
    }
    
    return normalized
  }, [])

  const isValidPhoneNumber = useCallback((value: string) => {
    const cleaned = normalizePhone(value)
    // Only accept +1 (USA) numbers with 10 digits after country code
    const usaPhoneRegex = /^\+1\d{10}$/
    return usaPhoneRegex.test(cleaned)
  }, [normalizePhone])

  const hasValidPhone = useMemo(() => isValidPhoneNumber(signUpForm.phoneNumber), [isValidPhoneNumber, signUpForm.phoneNumber])

  useEffect(() => {
    if (resendCountdown <= 0) return
    const intervalId = window.setInterval(() => {
      setResendCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [resendCountdown])
  
  // Optimized redirect effect
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setRedirectMessage('Welcome back! Signing you in...')
      setShowRedirectAnimation(true)
      
      const redirectTimer = setTimeout(() => {
        router.push(redirectTo)
      }, 800) // Reduced from 1000ms for faster UX
      
      return () => clearTimeout(redirectTimer)
    }
  }, [isAuthenticated, loading, router, redirectTo])
  
  // Auto-validate forms on change
  useEffect(() => {
    if (signUpForm.email || signUpForm.password || signUpForm.firstName || signUpForm.lastName) {
      debouncedValidateSignUp()
    }
  }, [signUpForm, debouncedValidateSignUp])
  
  useEffect(() => {
    if (signInForm.email || signInForm.password) {
      debouncedValidateSignIn()
    }
  }, [signInForm, debouncedValidateSignIn])
  
  // Optimized form handlers
  const handleSignUpFormChange = useCallback((field: string, value: string) => {
    setSignUpForm(prev => ({ ...prev, [field]: value }))
    if (field === 'phoneNumber') {
      setIsPhoneVerified(false)
      setPhoneVerificationToken(null)
      setPhoneVerificationCode('')
      setPhoneVerificationMessage(null)
      setPhoneVerificationError(null)
      setHasRequestedPhoneCode(false)
      setResendCountdown(0)
      setShowPhoneVerificationModal(false)
    }
    if (error) setError(null)
  }, [error])
  
  const handleSignInFormChange = useCallback((field: string, value: string) => {
    setSignInForm(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }, [error])
  
  // Enhanced error handling with micro-animations
  const showError = useCallback((message: string) => {
    setError(message)
    setSuccess(null)
    setShakeError(true)
    clearErrors()
    setTimeout(() => setShakeError(false), 500)
  }, [clearErrors])
  
  const showSuccess = useCallback((message: string) => {
    setSuccess(message)
    setError(null)
    clearErrors()
  }, [clearErrors])
  
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
    setShakeError(false)
    clearErrors()
  }, [clearErrors])

  const handleSendPhoneVerificationCode = useCallback(async () => {
    const normalizedPhone = normalizePhone(signUpForm.phoneNumber)

    if (!isValidPhoneNumber(signUpForm.phoneNumber)) {
      setPhoneVerificationError('Enter a valid US phone number, for example +12025550123.')
      setPhoneVerificationMessage(null)
      return
    }

    setIsSendingPhoneCode(true)
    setPhoneVerificationError(null)
    setPhoneVerificationMessage(null)
    setIsPhoneVerified(false)
    setPhoneVerificationToken(null)

    try {
      const response = await apiClient.sendPhoneVerificationCode(normalizedPhone)
      if (response.success) {
        const devCode = (response as any).devCode
        const successText = devCode
          ? `${response.message} (Code: ${devCode})`
          : response.message || 'Verification code sent.'

        setPhoneVerificationMessage(successText)
        setPhoneVerificationCode('')
        setResendCountdown(60)
        setHasRequestedPhoneCode(true)
        setShowPhoneVerificationModal(true)
      } else {
        setPhoneVerificationError(response.message || 'Failed to send verification code.')
      }
    } catch (err: any) {
      setPhoneVerificationError(err?.message || 'Failed to send verification code.')
    } finally {
      setIsSendingPhoneCode(false)
    }
  }, [normalizePhone, isValidPhoneNumber, signUpForm.phoneNumber])

  useEffect(() => {
    if (
      hasValidPhone &&
      !hasRequestedPhoneCode &&
      !isPhoneVerified &&
      !isSendingPhoneCode
    ) {
      handleSendPhoneVerificationCode()
    }
  }, [
    hasValidPhone,
    hasRequestedPhoneCode,
    isPhoneVerified,
    isSendingPhoneCode,
    handleSendPhoneVerificationCode
  ])

  const handleVerifyPhoneCode = useCallback(async () => {
    logger.log('🔐 [VERIFY] Starting phone verification', {
      codeLength: phoneVerificationCode.trim().length,
      phone: signUpForm.phoneNumber,
      hasValidPhone
    })

    if (phoneVerificationCode.trim().length !== 6) {
      logger.warn('⚠️ [VERIFY] Code length invalid')
      setPhoneVerificationError('Enter the 6-digit verification code we sent to your phone.')
      return
    }

    if (!isValidPhoneNumber(signUpForm.phoneNumber)) {
      logger.warn('⚠️ [VERIFY] Phone number invalid')
      setPhoneVerificationError('Enter a valid US phone number before verifying.')
      return
    }

    const normalizedPhone = normalizePhone(signUpForm.phoneNumber)

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
      
      const response = await apiClient.verifyPhoneVerificationCode(normalizedPhone, trimmedCode)
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
      } else {
        logger.error('❌ [VERIFY] Verification failed', {
          success: response.success,
          hasToken: !!verificationToken,
          message: response.message,
          error: responseAny.error,
          fullResponse: responseAny
        })
        const errorMsg = response.message || responseAny.error || 'Invalid verification code.'
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
  }, [normalizePhone, isValidPhoneNumber, phoneVerificationCode, signUpForm.phoneNumber])

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
  
  // Optimized form submission handlers
  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(signUpForm, true)) {
      showError('Please fix the form errors before submitting')
      return
    }
    
    const normalizedPhone = normalizePhone(signUpForm.phoneNumber)

    if (!isValidPhoneNumber(signUpForm.phoneNumber)) {
      showError('Enter a valid US phone number before signing up.')
      return
    }

    if (!isPhoneVerified || !phoneVerificationToken) {
      showError('Please verify your phone number before creating your account.')
      return
    }

    setIsLoading(true)
    clearMessages()
    
    try {
      const { error } = await signUp(
        signUpForm.email,
        signUpForm.password,
        `${signUpForm.firstName} ${signUpForm.lastName}`.trim(),
        normalizedPhone,
        phoneVerificationToken
      )
      
      if (error) {
        // Show the specific error message from our improved backend
        showError(error.message || 'Failed to create account')
        // Also show toast notification for better UX
        showErrorToast(error, {
          duration: 6000,
          onDismiss: () => setError(null)
        })
      } else {
        showSuccess('Account created successfully! Redirecting...')
        showSuccessToast('Account created successfully! Welcome to Borabond!')
      }
    } catch (err) {
      showError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [
    signUpForm,
    validateForm,
    signUp,
    showError,
    showSuccess,
    clearMessages,
    normalizePhone,
    isValidPhoneNumber,
    isPhoneVerified,
    phoneVerificationToken
  ])
  
  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(signInForm, false)) {
      showError('Please fix the form errors before submitting')
      return
    }
    
    setIsLoading(true)
    clearMessages()
    
    try {
      const { error } = await signIn(signInForm.email, signInForm.password)
      
      if (error) {
        // Show the specific error message from our improved backend
        showError(error.message || 'Failed to sign in')
        // Also show toast notification for better UX
        showErrorToast(error, {
          duration: 5000,
          onDismiss: () => setError(null)
        })
      } else {
        showSuccess('Signing you in...')
        showSuccessToast('Welcome back! Signing you in...')
      }
    } catch (err) {
      showError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [signInForm, validateForm, signIn, showError, showSuccess, clearMessages])
  
  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setIsLoading(true)
    clearMessages()

    try {
      const { error } = await signInWithGoogleIdToken(idToken)
      if (error) {
        showError(error instanceof Error ? error.message : 'Failed to sign in with Google')
        showErrorToast(error, {
          duration: 5000,
          onDismiss: () => setError(null)
        })
      }
    } catch (err) {
      showError('An unexpected error occurred')
      showErrorToast(err, {
        duration: 5000,
        onDismiss: () => setError(null)
      })
    } finally {
      setIsLoading(false)
    }
  }, [signInWithGoogleIdToken, showError, clearMessages])
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mb-4"
          >
            <Shield className="h-12 w-12 text-green-600 mx-auto" />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400">Loading authentication...</p>
        </motion.div>
      </div>
    )
  }
  
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-green-50 to-gray-100 dark:from-gray-900 dark:via-green-950 dark:to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md mx-auto"
        >
          <Card className={`
            shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
            ${shakeError ? 'animate-pulse' : ''}
          `}>
            <CardHeader className="text-center pb-4">
              {/* <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-3 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Zap className="h-8 w-8 text-white" />
              </motion.div> */}
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1">
                Welcome to Borabond
              </CardTitle>
              {/* <CardDescription className="text-gray-600 dark:text-gray-400">
                Choose your preferred sign-in method
              </CardDescription> */}
            </CardHeader>
            
            <CardContent className="space-y-5">
                                       {/* Error/Success Messages */}
                         <AnimatePresence mode="wait">
                           {resetSuccessMessage && (
                             <motion.div
                               initial={{ opacity: 0, y: -10, scale: 0.95 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, y: -10, scale: 0.95 }}
                               transition={{ duration: 0.2 }}
                             >
                               <div className="relative overflow-hidden rounded-xl border-2 bg-green-50/80 border-green-200 shadow-sm dark:bg-green-950/10 dark:border-green-800/30">
                                 {/* Subtle gradient overlay */}
                                 <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent pointer-events-none" />
                                 
                                 <div className="relative p-4">
                                   <div className="flex items-start gap-4">
                                     <motion.div 
                                       className="flex-shrink-0 mt-1"
                                       animate={{ 
                                         scale: [1, 1.1, 1],
                                         rotate: [0, -5, 5, 0] 
                                       }}
                                       transition={{ 
                                         duration: 0.6, 
                                         delay: 0.1,
                                         ease: "easeInOut"
                                       }}
                                     >
                                       <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                         <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                       </div>
                                     </motion.div>
                                     
                                     <div className="flex-1 min-w-0">
                                       <div className="text-green-800 dark:text-green-200 text-base font-medium leading-relaxed">
                                         Password reset successful! You can now sign in with your new password.
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </motion.div>
                           )}
                           
                           {error && (
                  <ErrorDisplay
                    error={error}
                    onDismiss={() => setError(null)}
                    userFriendly={true}
                    size="sm"
                    variant="inline"
                    showCopyButton={false}
                    showReportButton={false}
                    onRetry={error ? () => {
                      if (error.includes('already exists')) {
                        // Switch to sign in tab if it's a duplicate email error
                        setActiveTab('signin')
                        setError(null)
                        setSignInForm(prev => ({
                          ...prev,
                          email: signUpForm.email // Pre-fill the email
                        }))
                      } else if (error.includes('No account found')) {
                        // Switch to sign up tab if user doesn't have an account
                        setActiveTab('signup')
                        setError(null)
                        setSignUpForm(prev => ({
                          ...prev,
                          email: signInForm.email // Pre-fill the email
                        }))
                      }
                    } : undefined}
                  />
                )}
                
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative overflow-hidden rounded-xl border-2 bg-green-50/80 border-green-200 shadow-sm dark:bg-green-950/10 dark:border-green-800/30">
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent pointer-events-none" />
                      
                      <div className="relative p-4">
                        <div className="flex items-start gap-4">
                          <motion.div 
                            className="flex-shrink-0 mt-1"
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, -5, 5, 0] 
                            }}
                            transition={{ 
                              duration: 0.6, 
                              delay: 0.1,
                              ease: "easeInOut"
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                          </motion.div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-green-800 dark:text-green-200 text-base font-medium leading-relaxed">
                              {success}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Google Sign In - Priority Position */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="space-y-3"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Quick Sign In
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get started instantly with your Google account
                  </p>
                </div>
                
                <GoogleSignInButton
                  onGoogleCredential={handleGoogleCredential}
                  loading={isLoading}
                  size="lg"
                  showBenefits={false}
                />
              </motion.div>
              
              {/* Compact Divider */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-gray-900 px-4 py-1 text-xs text-gray-500 dark:text-gray-400 font-medium rounded-full border border-gray-200 dark:border-gray-700"
                  >
                    Or continue with email
                  </motion.span>
                </div>
              </motion.div>
              
              {/* Email/Password Forms */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 h-10">
                    <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-3 mt-4">
                    <form onSubmit={handleSignIn} className="space-y-3">
                      <OptimizedInput
                        id="signin-email"
                        label="Email"
                        type="email"
                        value={signInForm.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleSignInFormChange('email', e.target.value)
                        }
                        error={errors.email}
                        icon={Mail}
                        placeholder="Enter your email"
                        required
                      />
                      
                      <OptimizedInput
                        id="signin-password"
                        label="Password"
                        value={signInForm.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleSignInFormChange('password', e.target.value)
                        }
                        error={errors.password}
                        icon={Lock}
                        placeholder="Enter your password"
                        showPasswordToggle
                        showPassword={showPassword}
                        onTogglePassword={() => setShowPassword(!showPassword)}
                        required
                      />
                      
                      <OptimizedButton
                        type="submit"
                        loading={isLoading}
                        disabled={Object.keys(errors).length > 0}
                        fullWidth
                        gradient
                        icon={LogIn}
                      >
                        Sign In
                      </OptimizedButton>
                      
                      {/* Forgot Password Link */}
                      <div className="text-center pt-2">
                        <Link 
                          href="/forgot-password"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          Forgot your password?
                        </Link>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-3 mt-4">
                    <form onSubmit={handleSignUp} className="space-y-3">
                      {/* First Name and Last Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <OptimizedInput
                          id="signup-firstname"
                          label="First Name"
                          value={signUpForm.firstName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            handleSignUpFormChange('firstName', e.target.value)
                          }
                          error={errors.firstName}
                          icon={User}
                          placeholder="Enter your first name"
                          required
                        />
                        
                        <OptimizedInput
                          id="signup-lastname"
                          label="Last Name"
                          value={signUpForm.lastName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            handleSignUpFormChange('lastName', e.target.value)
                          }
                          error={errors.lastName}
                          icon={User}
                          placeholder="Enter your last name"
                          required
                        />
                      </div>
                      
                      {/* Email Address */}
                      <OptimizedInput
                        id="signup-email"
                        label="Email Address"
                        type="email"
                        value={signUpForm.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleSignUpFormChange('email', e.target.value)
                        }
                        error={errors.email}
                        icon={Mail}
                        placeholder="Enter your email address"
                        required
                      />
                      
                      {/* Phone Number */}
                      <PhoneInput
                        id="signup-phone"
                        label="Phone Number"
                        value={signUpForm.phoneNumber}
                        onChange={(localNumber: string, countryCode: string, fullNumber: string) => {
                          handleSignUpFormChange('phoneNumber', fullNumber)
                        }}
                        placeholder="202 555 0123"
                        required
                        error={errors.phoneNumber}
                        allowedCountries={['US']}
                        hideHelpText={true}
                      />
                  

                      {/* Phone Verification Trigger */}
                      {!isPhoneVerified && (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/30 p-4 space-y-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Secure your account via SMS
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                              We will send a 6 digit code to your number to confirm it’s you.
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {!hasValidPhone && (
                              <></>
                            )}
                            {hasValidPhone && !hasRequestedPhoneCode && (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                Sending verification code…
                              </>
                            )}
                            {hasValidPhone && hasRequestedPhoneCode && (
                              <>We sent a 6-digit code via SMS. Enter it in the verification modal to continue.</>
                            )}
                          </div>
                          {hasValidPhone && hasRequestedPhoneCode && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <OptimizedButton
                                type="button"
                                gradient
                                icon={Shield}
                                onClick={() => setShowPhoneVerificationModal(true)}
                              >
                                Enter Verification Code
                              </OptimizedButton>
                              <OptimizedButton
                                type="button"
                                gradient
                                loading={isSendingPhoneCode}
                                disabled={isSendingPhoneCode || resendCountdown > 0}
                                onClick={handleSendPhoneVerificationCode}
                              >
                                {resendCountdown > 0
                                  ? `Resend in ${resendCountdown}s`
                                  : 'Resend Code'}
                              </OptimizedButton>
                            </div>
                          )}
                        </div>
                      )}

                      {isPhoneVerified && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800/30"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                            Phone number verified
                          </p>
                        </motion.div>
                      )}
                      
                      {/* Password and Confirm Password - only after phone is verified */}
                      {!isPhoneVerified && (
                        <p className="text-xs text-center text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md py-2 px-3">
                          Verify your phone number first, then you’ll be able to create a password and finish signup.
                        </p>
                      )}

                      {isPhoneVerified && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <OptimizedInput
                              id="signup-password"
                              label="Password"
                              value={signUpForm.password}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                handleSignUpFormChange('password', e.target.value)
                              }
                              error={errors.password}
                              icon={Lock}
                              placeholder="Create a password"
                              showPasswordToggle
                              showPassword={showPassword}
                              onTogglePassword={() => setShowPassword(!showPassword)}
                              helperText="Must be at least 6 characters"
                              required
                            />
                            
                            <OptimizedInput
                              id="signup-confirm-password"
                              label="Confirm Password"
                              value={signUpForm.confirmPassword}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                handleSignUpFormChange('confirmPassword', e.target.value)
                              }
                              error={errors.confirmPassword}
                              icon={Lock}
                              placeholder="Confirm your password"
                              showPasswordToggle
                              showPassword={showConfirmPassword}
                              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                              required
                            />
                          </div>
                          
                          <OptimizedButton
                            type="submit"
                            loading={isLoading}
                            disabled={Object.keys(errors).length > 0 || !phoneVerificationToken}
                            fullWidth
                            gradient
                            icon={ArrowRight}
                          >
                            Create Account
                          </OptimizedButton>
                        </>
                      )}
                    </form>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <RedirectTransition isActive={showRedirectAnimation} message={redirectMessage} />
      <PerformanceMonitor />

      {/* Phone verification modal */}
      <Dialog
        open={showPhoneVerificationModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowPhoneVerificationModal(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Verify your phone number
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit verification code we sent via SMS to your phone number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <OptimizedInput
              id="phone-verification-code"
              label="Verification Code"
              value={phoneVerificationCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPhoneVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                if (phoneVerificationError) setPhoneVerificationError(null)
              }}
              placeholder="Enter 6-digit code"
              icon={Shield}
              maxLength={6}
              required
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

          <DialogFooter className="grid w-full gap-2 sm:grid-cols-3">
            <OptimizedButton
              type="button"
              variant="outline"
              onClick={() => setShowPhoneVerificationModal(false)}
              className="w-full border-gray-200 bg-white/90 text-gray-800 hover:bg-white dark:bg-gray-900/70 dark:text-gray-100"
            >
              Cancel
            </OptimizedButton>
            <OptimizedButton
              type="button"
              loading={isVerifyingPhoneCode}
              disabled={phoneVerificationCode.length !== 6}
              onClick={handleVerifyPhoneCode}
              gradient
              className="w-full"
            >
              Verify Code
            </OptimizedButton>
            <OptimizedButton
              type="button"
              gradient
              loading={isSendingPhoneCode}
              disabled={isSendingPhoneCode || resendCountdown > 0}
              onClick={handleSendPhoneVerificationCode}
              className="w-full"
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
            </OptimizedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Main export with Suspense for search params
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mb-4"
          >
            <Shield className="h-12 w-12 text-green-600 mx-auto" />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </motion.div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}