'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OptimizedInput } from '@/components/optimized-input'
import { OptimizedButton } from '@/components/optimized-button'
import { ErrorDisplay } from '@/components/ui/error-display'
import { showErrorToast, showSuccessToast } from '@/lib/toast-notifications'
import { 
  Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield, Sparkles, ArrowLeft 
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
  
  const validatePassword = useCallback((password: string) => {
    return password.length >= 6
  }, [])
  
  const validateForm = useCallback((password: string, confirmPassword: string) => {
    const newErrors: Record<string, string> = {}
    
    if (!password || !validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters long'
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validatePassword])
  
  return { errors, validateForm, clearErrors: () => setErrors({}) }
}

// Main Reset Password Page Component
function ResetPasswordPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { errors, validateForm, clearErrors } = useFormValidation()
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  
  // Get token from URL params
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError('Invalid or missing reset token')
    }
  }, [searchParams])
  
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
  
  // Handle form input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }, [error])
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      showError('Invalid or missing reset token')
      return
    }
    
    if (!validateForm(formData.password, formData.confirmPassword)) {
      showError('Please fix the form errors before submitting')
      return
    }
    
    setIsLoading(true)
    clearMessages()
    
    try {
      const response = await apiClient.resetPassword(token, formData.password)
      
      if (response.success) {
        setSuccess(true)
        showSuccessToast('Password reset successfully! You can now sign in.')
        
        // Redirect to sign in page after a delay
        setTimeout(() => {
          router.push('/auth/signin?message=password-reset-success')
        }, 2000)
      } else {
        showError(response.message || 'Failed to reset password')
        showErrorToast(response.message || 'Failed to reset password')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'An error occurred while resetting your password'
      showError(errorMessage)
      showErrorToast(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [token, formData, validateForm, showError, clearMessages, router])
  
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
                Password Reset Successful!
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your password has been updated successfully
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
                    You can now sign in with your new password. Redirecting you to the sign-in page...
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center"
              >
                <Link 
                  href="/auth/signin?message=password-reset-success"
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium"
                >
                  Go to Sign In Page
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }
  
  // Error state for invalid token
  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-red-50 to-gray-100 dark:from-gray-900 dark:via-red-950 dark:to-gray-800 p-4">
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
                className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <AlertCircle className="h-8 w-8 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                This password reset link is invalid or has expired
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center space-y-4"
              >
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    The password reset link you clicked is either invalid or has expired. 
                    Please request a new password reset link.
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Link href="/forgot-password">
                  <OptimizedButton
                    fullWidth
                    gradient
                    icon={ArrowLeft}
                  >
                    Request New Reset Link
                  </OptimizedButton>
                </Link>
                
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
              Create New Password
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Enter your new password below
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
                id="reset-password"
                label="New Password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('password', e.target.value)
                }
                error={errors.password}
                icon={Lock}
                placeholder="Enter your new password"
                showPasswordToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                required
                autoFocus
              />
              
              <OptimizedInput
                id="confirm-password"
                label="Confirm New Password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('confirmPassword', e.target.value)
                }
                error={errors.confirmPassword}
                icon={Lock}
                placeholder="Confirm your new password"
                showPasswordToggle
                showPassword={showConfirmPassword}
                onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                required
              />
              
              <OptimizedButton
                type="submit"
                loading={isLoading}
                disabled={Object.keys(errors).length > 0 || !formData.password || !formData.confirmPassword}
                fullWidth
                gradient
                icon={Shield}
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
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
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Main export with Suspense for search params
export default function ResetPasswordPage() {
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
      <ResetPasswordPageContent />
    </Suspense>
  )
}