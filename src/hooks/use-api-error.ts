// Custom hook for handling API errors with loading states

import { useState, useCallback } from 'react'
import { formatErrorForDisplay, isRetryableError, ApiError } from '@/lib/error-handler'

interface UseApiErrorOptions {
  onError?: (error: any) => void
  onRetry?: () => void
  userFriendly?: boolean
}

interface UseApiErrorReturn {
  error: any
  isLoading: boolean
  setError: (error: any) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  executeWithErrorHandling: <T>(
    apiCall: () => Promise<T>,
    options?: { onSuccess?: (data: T) => void; onError?: (error: any) => void }
  ) => Promise<T | null>
  canRetry: boolean
  retry: () => void
}

export function useApiError(options: UseApiErrorOptions = {}): UseApiErrorReturn {
  const { onError, onRetry, userFriendly = true } = options
  
  const [error, setErrorState] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const setError = useCallback((newError: any) => {
    setErrorState(newError)
    setIsLoading(false) // Stop loading when error occurs
    onError?.(newError)
  }, [onError])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    if (loading) {
      clearError() // Clear errors when starting new request
    }
  }, [clearError])

  const executeWithErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: { onSuccess?: (data: T) => void; onError?: (error: any) => void } = {}
  ): Promise<T | null> => {
    const { onSuccess, onError: onApiError } = options
    
    try {
      setLoading(true)
      const result = await apiCall()
      setLoading(false)
      onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      onApiError?.(err)
      return null
    }
  }, [setError, setLoading])

  const canRetry = error ? isRetryableError(error) : false

  const retry = useCallback(() => {
    if (canRetry && onRetry) {
      clearError()
      onRetry()
    }
  }, [canRetry, onRetry, clearError])

  return {
    error,
    isLoading,
    setError,
    clearError,
    setLoading,
    executeWithErrorHandling,
    canRetry,
    retry
  }
}

// Hook for form-specific error handling
export function useFormError() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const setFormError = useCallback((error: any) => {
    if (error && typeof error === 'object' && 'message' in error) {
      const apiError = error as ApiError
      
      // If it's a validation error with field details
      if (apiError.details && typeof apiError.details === 'object') {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.details).forEach(([field, message]) => {
          if (typeof message === 'string') {
            fieldErrors[field] = message
          }
        })
        setErrors(fieldErrors)
      } else {
        // General form error
        setErrors({ general: formatErrorForDisplay(error, { userFriendly: true }) })
      }
    } else {
      setErrors({ general: formatErrorForDisplay(error, { userFriendly: true }) })
    }
    setIsSubmitting(false)
  }, [])

  const startSubmission = useCallback(() => {
    setIsSubmitting(true)
    clearAllErrors()
  }, [clearAllErrors])

  const endSubmission = useCallback(() => {
    setIsSubmitting(false)
  }, [])

  return {
    errors,
    isSubmitting,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setFormError,
    startSubmission,
    endSubmission,
    hasErrors: Object.keys(errors).length > 0
  }
}
