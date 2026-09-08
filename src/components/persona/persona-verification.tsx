'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Loader2, Shield, User, Camera } from 'lucide-react'
import { usePersona } from '@/contexts/persona-context'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

import { logger } from '@/lib/logger'
interface PersonaVerificationProps {
  onComplete?: (result: any) => void
  onCancel?: () => void
  className?: string
}

export function PersonaVerification({ 
  onComplete, 
  onCancel, 
  className = '' 
}: PersonaVerificationProps) {
  const { user } = useAuth()
  const { 
    verificationState, 
    setVerificationState,
    isPersonaLoaded, 
    personaLoadError,
    startVerification, 
    retryPersonaLoad
  } = usePersona()
  
  const [isStarting, setIsStarting] = useState(false)

  // Debug logging
  useEffect(() => {
    logger.log('🔍 PersonaVerification component state:', {
      isPersonaLoaded,
      personaLoadError,
      verificationState,
      isStarting
    })
  }, [isPersonaLoaded, personaLoadError, verificationState, isStarting])

  const handleStartVerification = async () => {
    setIsStarting(true)
    try {
      logger.log('🚀 Starting verification process...')
      const result = await startVerification()
      logger.log('🔍 Verification result:', result)
      
      if (result.success) {
        if (result.status === 'completed') {
          // Customer is already verified
          logger.log('✅ Customer is already verified')
          onComplete?.(result)
        } else {
          // Verification started successfully - Persona SDK is now running
          // Don't call onComplete here, wait for Persona SDK to complete
          logger.log('✅ Verification started successfully, Persona SDK is running:', result.inquiryId)
          // The onComplete will be called by the Persona SDK callbacks in persona-context.tsx
        }
      } else {
        logger.error('❌ Failed to start verification:', result.error)
        onComplete?.(result)
      }
    } catch (error: any) {
      logger.error('❌ Error starting verification:', error)
      
      // Handle specific error cases
      if (error.message?.includes('already verified')) {
        onComplete?.({ success: true, status: 'completed', message: 'Customer is already verified' })
      } else if (error.message?.includes('failed')) {
        onComplete?.({ success: false, error: error.message, canRetry: true })
      } else if (error.message?.includes('not accessible')) {
        onComplete?.({ success: false, error: error.message, canRetry: true, retryMessage: 'Try again in a few moments' })
      } else {
        onComplete?.({ success: false, error: error.message })
      }
    } finally {
      setIsStarting(false)
    }
  }

  const handleCancel = () => {
    // Reset verification state
    setVerificationState({
      isLoading: false,
      isVerifying: false,
      status: 'idle',
      error: null,
      inquiryId: null,
      personaClient: null,
    })
    onCancel?.()
  }

  const handleReset = () => {
    // Reset verification state
    setVerificationState({
      isLoading: false,
      isVerifying: false,
      status: 'idle',
      error: null,
      inquiryId: null,
      personaClient: null,
    })
  }

  // Handle completion callback
  useEffect(() => {
    if (verificationState.status === 'completed' && verificationState.inquiryId) {
      onComplete?.({ success: true, inquiryId: verificationState.inquiryId, status: 'completed' })
    }
  }, [verificationState.status, verificationState.inquiryId, onComplete])

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'cancelled':
        return <XCircle className="h-6 w-6 text-orange-600" />
      case 'pending':
        return <Skeleton className="h-6 w-6 rounded-full" />
      default:
        return <Shield className="h-6 w-6 text-gray-600" />
    }
  }

  const getStatusMessage = () => {
    switch (verificationState.status) {
      case 'completed':
        return 'Identity verification completed successfully!'
      case 'failed':
        return verificationState.error || 'Identity verification failed'
      case 'cancelled':
        return 'Identity verification was cancelled'
      case 'pending':
        return 'Identity verification in progress...'
      default:
        return 'Ready to verify your identity'
    }
  }

  const getStatusColor = () => {
    switch (verificationState.status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'cancelled':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (!isPersonaLoaded) {
    return (
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
        {personaLoadError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verification System Error
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                {personaLoadError}
              </p>
              <Button
                onClick={retryPersonaLoad}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Status Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>

            {/* Main Content Skeleton */}
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-80" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Info Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice Skeleton */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 mt-0.5" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Identity Verification</CardTitle>
              <CardDescription>
                Secure verification powered by Persona
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <p className="font-medium">{getStatusMessage()}</p>
            {verificationState.inquiryId && (
              <p className="text-sm mt-1 opacity-75">
                Inquiry ID: {verificationState.inquiryId}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {verificationState.error && verificationState.status === 'failed' && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {verificationState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Persona SDK Container */}
      {verificationState.status === 'pending' && verificationState.inquiryId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Complete Your Verification
            </CardTitle>
            <CardDescription>
              Please complete the identity verification process below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              id="persona-verification-container" 
              className="min-h-[400px] w-full border rounded-lg bg-gray-50 flex items-center justify-center"
            >
              <div className="w-full max-w-md p-6 space-y-4">
                <div className="text-center mb-6">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-4 w-48 mx-auto" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Info */}
      {user && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Verification Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="text-sm font-medium">{user.full_name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={verificationState.status === 'completed' ? 'default' : 'secondary'}>
                  {verificationState.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {verificationState.status === 'idle' && (
          <Button
            onClick={handleStartVerification}
            disabled={isStarting || verificationState.isLoading}
            className="flex-1"
            size="lg"
          >
            {isStarting || verificationState.isLoading ? (
              <div className="flex items-center">
                <Skeleton className="mr-2 h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Identity Verification
              </>
            )}
          </Button>
        )}

        {verificationState.status === 'pending' && verificationState.isVerifying && (
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Cancel Verification
          </Button>
        )}

        {(verificationState.status === 'failed' || verificationState.status === 'cancelled') && (
          <>
            <Button
              onClick={handleStartVerification}
              disabled={isStarting || verificationState.isLoading}
              className="flex-1"
              size="lg"
            >
              {isStarting ? (
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ) : (
                'Try Again'
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Reset
            </Button>
          </>
        )}

        {verificationState.status === 'completed' && (
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Start New Verification
          </Button>
        )}
      </div>

      {/* Security Notice */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-1">
                Secure & Private
              </h4>
              <p className="text-xs text-gray-600">
                Your identity verification is processed securely by Persona. 
                We never store your personal documents or biometric data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
