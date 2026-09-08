// Professional toast notification system for errors and other messages

import { toast } from 'sonner'
import { formatErrorForDisplay, getErrorSeverity, isRetryableError, ApiError } from './error-handler'

interface ToastOptions {
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  onAutoClose?: () => void
}

/**
 * Show error toast with professional styling and actions
 */
export function showErrorToast(
  error: any, 
  options: ToastOptions = {}
) {
  const { duration = 5000, action, onDismiss, onAutoClose } = options
  
  const errorMessage = formatErrorForDisplay(error, { userFriendly: true })
  const severity = getErrorSeverity(error)
  const canRetry = isRetryableError(error)

  // Determine toast duration based on severity
  const toastDuration = severity === 'high' ? 8000 : duration

  // Create action button if retry is available
  const toastAction = canRetry ? {
    label: 'Retry',
    onClick: () => {
      // This would be handled by the component that called this function
      toast.dismiss()
    }
  } : action

  return toast.error(errorMessage, {
    duration: toastDuration,
    action: toastAction,
    onDismiss,
    onAutoClose,
    description: severity === 'high' ? 'This error requires attention' : undefined,
    className: 'border-red-200 bg-red-50 dark:bg-red-950/20',
  })
}

/**
 * Show success toast
 */
export function showSuccessToast(
  message: string,
  options: ToastOptions = {}
) {
  const { duration = 3000, action, onDismiss, onAutoClose } = options

  return toast.success(message, {
    duration,
    action,
    onDismiss,
    onAutoClose,
    className: 'border-green-200 bg-green-50 dark:bg-green-950/20',
  })
}

/**
 * Show info toast
 */
export function showInfoToast(
  message: string,
  options: ToastOptions = {}
) {
  const { duration = 4000, action, onDismiss, onAutoClose } = options

  return toast.info(message, {
    duration,
    action,
    onDismiss,
    onAutoClose,
    className: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20',
  })
}

/**
 * Show warning toast
 */
export function showWarningToast(
  message: string,
  options: ToastOptions = {}
) {
  const { duration = 5000, action, onDismiss, onAutoClose } = options

  return toast.warning(message, {
    duration,
    action,
    onDismiss,
    onAutoClose,
    className: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20',
  })
}

/**
 * Show loading toast
 */
export function showLoadingToast(
  message: string,
  options: { onDismiss?: () => void } = {}
) {
  const { onDismiss } = options

  return toast.loading(message, {
    duration: Infinity, // Loading toasts don't auto-dismiss
    onDismiss,
    className: 'border-gray-200 bg-gray-50 dark:bg-gray-950/20',
  })
}

/**
 * Dismiss specific toast
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId)
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss()
}

/**
 * Promise-based toast for async operations
 */
export function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  },
  options: ToastOptions = {}
) {
  const { onDismiss, onAutoClose } = options

  return toast.promise(promise, {
    loading: messages.loading,
    success: (data) => {
      const message = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success
      return message
    },
    error: (error) => {
      const message = typeof messages.error === 'function' 
        ? messages.error(error) 
        : messages.error
      return message
    },
  })
}

/**
 * Show network error toast with retry option
 */
export function showNetworkErrorToast(
  onRetry?: () => void,
  options: ToastOptions = {}
) {
  const networkError = {
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    code: 'NETWORK_ERROR'
  }

  return showErrorToast(networkError, {
    ...options,
    action: onRetry ? {
      label: 'Retry',
      onClick: onRetry
    } : undefined,
    duration: 8000
  })
}

/**
 * Show authentication error toast
 */
export function showAuthErrorToast(
  message: string = 'Your session has expired. Please sign in again.',
  options: ToastOptions = {}
) {
  const authError = {
    message,
    code: 'AUTHENTICATION_ERROR'
  }

  return showErrorToast(authError, {
    ...options,
    duration: 6000
  })
}

/**
 * Show validation error toast
 */
export function showValidationErrorToast(
  message: string = 'Please check your input and try again.',
  options: ToastOptions = {}
) {
  const validationError = {
    message,
    code: 'VALIDATION_ERROR'
  }

  return showErrorToast(validationError, {
    ...options,
    duration: 4000
  })
}
