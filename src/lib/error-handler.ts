// Error handling utilities for the frontend application
import { logger } from './logger'

export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

export interface ErrorDisplayOptions {
  showDetails?: boolean
  userFriendly?: boolean
  logToConsole?: boolean
}

/**
 * Formats an error for display to users
 */
export function formatErrorForDisplay(
  error: any, 
  options: ErrorDisplayOptions = {}
): string {
  const { showDetails = false, userFriendly = true, logToConsole = true } = options

  if (logToConsole) {
    logger.error('Error occurred:', error)
  }

  // Handle API errors
  if (error && typeof error === 'object' && 'message' in error) {
    const apiError = error as ApiError
    
    // User-friendly error messages
    if (userFriendly) {
      // Handle specific error messages for better UX
      const message = apiError.message || ''
      
      // Duplicate email error (signup)
      if (message.includes('already been registered') || message.includes('already exists')) {
        return 'An account with this email address already exists. Please try signing in instead, or use a different email address.'
      }
      
      // User not found error (login)
      if (message.includes('No account found with this email address')) {
        return 'No account found with this email address. Please check your email or sign up for a new account.'
      }
      
      // Incorrect password error (login)
      if (message.includes('Incorrect password') || message.includes('Invalid email or password')) {
        return 'Incorrect password. Please check your password and try again.'
      }
      
      // Account deactivated error
      if (message.includes('Account is deactivated')) {
        return 'Your account has been deactivated. Please contact support for assistance.'
      }
      
      // Weak password error (signup)
      if (message.includes('Password should be at least')) {
        return 'Password must be at least 6 characters long. Please choose a stronger password.'
      }
      
      // Invalid email error
      if (message.includes('Invalid email')) {
        return 'Please enter a valid email address.'
      }
      
      switch (apiError.code) {
        case 'NETWORK_ERROR':
          return 'Unable to connect to the server. Please check your internet connection and try again.'
        
        case 'SERVER_ERROR':
          return 'The server is experiencing issues. Please try again in a few moments.'
        
        case 'CLIENT_ERROR':
          return apiError.message || 'There was an issue with your request. Please check your input and try again.'
        
        default:
          return apiError.message || 'An unexpected error occurred. Please try again.'
      }
    }
    
    // Developer-friendly error messages
    if (showDetails) {
      return `${apiError.message}${apiError.status ? ` (Status: ${apiError.status})` : ''}`
    }
    
    return apiError.message || 'An error occurred'
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Handle Error objects
  if (error instanceof Error) {
    return userFriendly 
      ? 'An unexpected error occurred. Please try again.'
      : error.message
  }

  // Fallback
  return userFriendly 
    ? 'An unexpected error occurred. Please try again.'
    : 'Unknown error occurred'
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as ApiError
    return apiError.code === 'NETWORK_ERROR' || 
           (apiError.status !== undefined && apiError.status >= 500)
  }
  return false
}

/**
 * Gets error severity level
 */
export function getErrorSeverity(error: any): 'low' | 'medium' | 'high' {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status as number
    if (status >= 500) return 'high'
    if (status >= 400) return 'medium'
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code as string
    if (code === 'NETWORK_ERROR') return 'high'
    if (code === 'SERVER_ERROR') return 'high'
  }
  
  return 'low'
}

/**
 * Creates a standardized error object
 */
export function createError(
  message: string, 
  status?: number, 
  code?: string, 
  details?: any
): ApiError {
  return {
    message,
    status,
    code,
    details
  }
}

/**
 * Error codes for common scenarios
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
} as const

/**
 * User-friendly error messages for common scenarios
 */
export const USER_FRIENDLY_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  SERVER_ERROR: 'The server is experiencing issues. Please try again in a few moments.',
  AUTHENTICATION_ERROR: 'Your session has expired. Please sign in again.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.'
} as const
