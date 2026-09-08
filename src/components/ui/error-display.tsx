'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, XCircle, Wifi, Server, Shield, Copy, Check, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatErrorForDisplay, getErrorSeverity, isRetryableError, ApiError } from '@/lib/error-handler'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface ErrorDisplayProps {
  error: any
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  userFriendly?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'inline' | 'toast' | 'modal' | 'banner'
  showCopyButton?: boolean
  showReportButton?: boolean
  autoDismiss?: boolean
  dismissDelay?: number
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  userFriendly = true,
  className = '',
  size = 'md',
  variant = 'inline',
  showCopyButton = false,
  showReportButton = false,
  autoDismiss = false,
  dismissDelay = 5000
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Auto-dismiss functionality
  React.useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Wait for animation to complete
      }, dismissDelay)
      return () => clearTimeout(timer)
    }
  }, [autoDismiss, onDismiss, dismissDelay])

  if (!error || !isVisible) return null

  const errorMessage = formatErrorForDisplay(error, { showDetails, userFriendly })
  const severity = getErrorSeverity(error)
  const canRetry = isRetryableError(error) && onRetry

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const getErrorIcon = () => {
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as ApiError
      switch (apiError.code) {
        case 'NETWORK_ERROR':
          return <Wifi className={`${iconSize[size]} text-red-600 dark:text-red-400`} />
        case 'SERVER_ERROR':
          return <Server className={`${iconSize[size]} text-red-600 dark:text-red-400`} />
        case 'AUTHENTICATION_ERROR':
        case 'AUTHORIZATION_ERROR':
          return <Shield className={`${iconSize[size]} text-red-600 dark:text-red-400`} />
        default:
          return <AlertCircle className={`${iconSize[size]} text-red-600 dark:text-red-400`} />
      }
    }
    return <XCircle className={`${iconSize[size]} text-red-600 dark:text-red-400`} />
  }

  const getErrorVariant = () => {
    switch (severity) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'default'
      default:
        return 'default'
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'toast':
        return 'fixed top-4 right-4 z-50 max-w-sm shadow-lg'
      case 'banner':
        return 'w-full border-l-0 border-r-0 rounded-none'
      case 'modal':
        return 'max-w-md mx-auto shadow-2xl'
      default:
        return ''
    }
  }

  const copyErrorDetails = async () => {
    const errorDetails = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...(error && typeof error === 'object' ? error : {})
    }
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      setCopied(true)
      toast.success('Error details copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy error details')
    }
  }

  const reportError = () => {
    // In a real app, this would send the error to your error reporting service
    toast.info('Error reported to our team. Thank you for your feedback!')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ 
          opacity: 0, 
          y: variant === 'toast' ? -20 : -10, 
          scale: variant === 'modal' ? 0.9 : 0.95 
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ 
          opacity: 0, 
          y: variant === 'toast' ? -20 : -10, 
          scale: variant === 'modal' ? 0.9 : 0.95 
        }}
        transition={{ 
          duration: 0.3,
          type: 'spring',
          stiffness: 300,
          damping: 30
        }}
        className={`${className} ${getVariantStyles()}`}
      >
        <div className={`
          relative overflow-hidden rounded-xl border-2
          ${variant === 'toast' ? 'bg-white/95 backdrop-blur-md border-red-200 shadow-xl' : ''}
          ${variant === 'banner' ? 'bg-red-50 border-l-4 border-l-red-500 border-t border-b border-r border-red-200' : ''}
          ${variant === 'modal' ? 'bg-white border-red-200 shadow-2xl' : ''}
          ${variant === 'inline' ? 'bg-red-50/80 border-red-200 shadow-sm' : ''}
          dark:bg-red-950/10 dark:border-red-800/30
        `}>
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20 dark:to-transparent pointer-events-none" />
          
          <div className="relative p-3">
            <div className="flex items-start gap-3">
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
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  {getErrorIcon()}
                </div>
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className={`text-red-800 dark:text-red-200 ${sizeClasses[size]} font-medium leading-relaxed`}>
                  {errorMessage}
                </div>
                
                {/* Action buttons - only show if any are enabled */}
                {(canRetry || showCopyButton || showReportButton || onDismiss) && (
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="h-8 px-4 text-xs font-medium border-red-300 text-red-700 bg-white hover:bg-red-50 hover:border-red-400 dark:border-red-600 dark:text-red-300 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-all duration-200 shadow-sm"
                      >
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        {errorMessage.includes('already exists') ? 'Sign In Instead' : 
                         errorMessage.includes('No account found') ? 'Sign Up Instead' : 
                         errorMessage.includes('Incorrect password') ? 'Try Again' : 'Try Again'}
                      </Button>
                    )}
                    
                    {showCopyButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyErrorDetails}
                        className="h-8 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 mr-1.5" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1.5" />
                        )}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                    
                    {showReportButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reportError}
                        className="h-8 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        Report
                      </Button>
                    )}
                    
                    {onDismiss && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsVisible(false)
                          setTimeout(onDismiss, 300)
                        }}
                        className="h-8 px-3 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function ErrorBoundary({ 
  children, 
  fallback: FallbackComponent,
  onError 
}: ErrorBoundaryProps) {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message)
      setError(error)
      onError?.(error, { componentStack: event.filename || '' })
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [onError])

  const reset = () => setError(null)

  if (error) {
    if (FallbackComponent) {
      return <FallbackComponent error={error} reset={reset} />
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorDisplay
            error={error}
            onRetry={reset}
            userFriendly={true}
            size="lg"
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

