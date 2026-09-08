'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePersona } from '@/contexts/persona-context'
import { PersonaVerification } from '@/components/persona/persona-verification'
import { VerificationSuccess } from '@/components/verification/verification-success'
import { CompactVerificationStatusBadge } from '@/components/verification/verification-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import ProtectedRoute from '@/components/protected-route'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
export default function VerifyIdentityPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { verificationState, refreshVerificationStatus } = usePersona()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [isAuthenticated, authLoading, router])

  // Load verification status on page load
  useEffect(() => {
    if (isAuthenticated && user && verificationState.status === 'idle') {
      logger.log('🔄 Main verify-identity: Loading verification status on page load')
      refreshVerificationStatus()
    }
  }, [isAuthenticated, user, verificationState.status, refreshVerificationStatus])

  const handleVerificationComplete = (result: any) => {
    logger.log('✅ Verification completed:', result)
    
    if (result.success) {
      if (result.status === 'completed') {
        // Customer is already verified
        toast.success(result.message || 'Your identity is already verified.')
      } else {
        // Verification completed successfully
        toast.success('Identity verification completed successfully!')
      }
    } else {
      // Show error message
      toast.error(result.error || 'There was an error during verification.')
    }
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const handleVerificationCancel = () => {
    logger.log('❌ Verification cancelled')
    toast.info('Identity verification was cancelled')
  }

  const handleRefreshStatus = async () => {
    try {
      await refreshVerificationStatus()
      toast.info('Status refreshed')
    } catch (error) {
      toast.error('Failed to refresh status')
    }
  }

  // Auto-refresh status every 30 seconds when pending (but not when completed)
  useEffect(() => {
    if (verificationState.status === 'pending' || verificationState.status === 'idle') {
      const interval = setInterval(() => {
        refreshVerificationStatus()
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [verificationState.status, refreshVerificationStatus])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Responsive Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 lg:mb-8"
          >
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Identity Verification
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Complete your identity verification to access all features and start investing
              </p>
            </div>
          </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Verification Component - Takes up 2 columns on large screens */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="lg:col-span-2"
              >
                {verificationState.status === 'completed' ? (
                  <VerificationSuccess
                    verificationDate={new Date().toISOString()}
                  />
                ) : (
                  <div className="space-y-4">
                    <PersonaVerification
                      onComplete={handleVerificationComplete}
                      onCancel={handleVerificationCancel}
                    />
                    
                    {/* Refresh button for pending/idle status */}
                    {(verificationState.status === 'pending' || verificationState.status === 'idle') && (
                      <div className="text-center">
                        <Button
                          onClick={handleRefreshStatus}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          🔄 Refresh Status
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Status auto-refreshes every 30 seconds
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

            {/* Information Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Progress Card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Verification Status</h3>
                        <p className="text-sm text-gray-600">
                          {verificationState.status === 'completed' 
                            ? 'Completed successfully' 
                            : 'In progress'
                          }
                        </p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <CompactVerificationStatusBadge status={verificationState.status} />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        verificationState.status === 'completed' 
                          ? 'bg-green-600 w-full' 
                          : 'bg-blue-600 w-1/2'
                      }`}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits Card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Why Verify?</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Access investment opportunities</li>
                        <li>• Enhanced account security</li>
                        <li>• Faster transactions</li>
                        <li>• Regulatory compliance</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements Card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">What You'll Need</h3>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Government-issued ID</li>
                        <li>• Device with camera</li>
                        <li>• Good lighting</li>
                        <li>• 5-10 minutes</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Secure & Private</h3>
                      <p className="text-sm text-gray-600">
                        Your data is encrypted and processed securely. We never store your personal documents.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
