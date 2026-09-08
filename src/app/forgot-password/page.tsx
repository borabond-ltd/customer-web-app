'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OptimizedInput } from '@/components/optimized-input'
import { OptimizedButton } from '@/components/optimized-button'
import { ErrorDisplay } from '@/components/ui/error-display'
import { showErrorToast, showSuccessToast } from '@/lib/toast-notifications'
import { 
  Loader2, Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Sparkles 
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

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

// Optimized form validation hook
const useFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [])
  
  const validateForm = useCallback((email: string) => {
    const newErrors: Record<string, string> = {}
    
    if (!email || !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validateEmail])
  
  return { errors, validateForm, clearErrors: () => setErrors({}) }
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [shakeError, setShakeError] = useState(false)
  
  const router = useRouter()
  const { errors, validateForm, clearErrors } = useFormValidation()
  
  // Enhanced error handling with micro-animations
  const showError = useCallback((message: string) => {
    setError(message)
    setShakeError(true)
    clearErrors()
    setTimeout(() => setShakeError(false), 500)
  }, [clearErrors])
  
  const clearMessages = useCallback(() => {
    setError(null)
    setShakeError(false)
    clearErrors()
  }, [clearErrors])
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(email)) {
      showError('Please enter a valid email address')
      return
    }
    
    setIsLoading(true)
    clearMessages()
    
    try {
      const response = await apiClient.forgotPassword(email.trim())
      
      if (response.success) {
        setSuccess(true)
        showSuccessToast('Password reset email sent! Check your inbox.')
      } else {
        showError(response.message || 'Failed to send reset email')
        showErrorToast(response.message || 'Failed to send reset email')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'An error occurred while sending the reset email'
      showError(errorMessage)
      showErrorToast(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [email, validateForm, showError, clearMessages])
  
  // Handle email input change
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) setError(null)
  }, [error])
  
  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-green-50 to-gray-100 dark:from-gray-900 dark:via-green-950 dark:to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <CheckCircle className="h-8 w-8 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                We've sent a password reset link to your email address
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center space-y-4"
              >
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    <strong>Next steps:</strong>
                  </p>
                  <ul className="text-green-700 dark:text-green-300 text-sm mt-2 space-y-1 text-left">
                    <li>• Check your email inbox (and spam folder)</li>
                    <li>• Click the reset link in the email</li>
                    <li>• Create a new password</li>
                    <li>• Sign in with your new password</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    <strong>⚠️ Important:</strong> The reset link will expire in 1 hour for security reasons.
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <OptimizedButton
                  onClick={() => setSuccess(false)}
                  variant="outline"
                  fullWidth
                  icon={ArrowLeft}
                >
                  Try Different Email
                </OptimizedButton>
                
                <div className="text-center">
                  <Link 
                    href="/auth/signin"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }
  
  return (
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Shield className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {/* Error Messages */}
            <AnimatePresence mode="wait">
              {error && (
                <ErrorDisplay
                  error={error}
                  onDismiss={() => setError(null)}
                  userFriendly={true}
                  size="sm"
                  variant="inline"
                  showCopyButton={false}
                  showReportButton={false}
                />
              )}
            </AnimatePresence>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <OptimizedInput
                id="forgot-password-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                error={errors.email}
                icon={Mail}
                placeholder="Enter your email address"
                required
                autoFocus
              />
              
              <OptimizedButton
                type="submit"
                loading={isLoading}
                disabled={Object.keys(errors).length > 0 || !email.trim()}
                fullWidth
                gradient
                icon={Mail}
              >
                {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
              </OptimizedButton>
            </form>
            
            <div className="text-center space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Remember your password?{' '}
                <Link 
                  href="/auth/signin"
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium"
                >
                  Sign in instead
                </Link>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Don't have an account?{' '}
                <Link 
                  href="/auth/signin"
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                >
                  Create one here
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}