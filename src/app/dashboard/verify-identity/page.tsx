'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, Lock, FileText, Unlock, Eye, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { usePersona } from '@/contexts/persona-context'
import { PersonaVerification } from '@/components/persona/persona-verification'
import { VerificationSuccess } from '@/components/verification/verification-success'
import { CompactVerificationStatusBadge } from '@/components/verification/verification-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ProtectedRoute from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'

export default function DashboardVerifyIdentityPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { verificationState, refreshVerificationStatus, startVerification } = usePersona()
  const [expiredVerification, setExpiredVerification] = useState<boolean>(false)
  const [checkingExpired, setCheckingExpired] = useState<boolean>(true)
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'unverified' | 'pending' | 'in_progress' | 'expired' | 'unknown'>('unknown')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const loadKycStatus = async () => {
      if (!isAuthenticated || !user) {
        setCheckingExpired(false)
        return
      }

      try {
        setCheckingExpired(true)
        const response = await apiClient.getKycStatus(true)
        if (!response.success || !response.data) {
          setCheckingExpired(false)
          return
        }

        const kyc = response.data as { status?: string; is_verified?: boolean }
        if (kyc.is_verified || kyc.status === 'verified') {
          setVerificationStatus('verified')
          setExpiredVerification(false)
        } else if (kyc.status === 'pending') {
          setVerificationStatus('pending')
        } else if (kyc.status === 'rejected') {
          setVerificationStatus('unverified')
        } else {
          setVerificationStatus('unverified')
        }
      } catch (error) {
        logger.error('Error checking KYC status:', error)
        toast.error('Failed to check verification status')
      } finally {
        setCheckingExpired(false)
      }
    }

    void loadKycStatus()
  }, [isAuthenticated, user])

  // Load verification status on page load (Persona status)
  useEffect(() => {
    if (isAuthenticated && user) {
      logger.log('🔄 Dashboard verify-identity: Loading verification status on page load')
      refreshVerificationStatus()
    }
  }, [isAuthenticated, user, refreshVerificationStatus])

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

  const handleStartReverification = async () => {
    try {
      logger.log('🔄 Starting re-verification for expired ID...')
      setExpiredVerification(false) // Close the dialog
      
      // Start the Persona verification flow
      if (startVerification) {
        await startVerification()
      } else {
        toast.error('Unable to start verification. Please try again.')
      }
    } catch (error) {
      logger.error('❌ Error starting re-verification:', error)
      toast.error('Failed to start verification')
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

  if (authLoading || checkingExpired) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px] p-4">
            <div className="w-full max-w-md">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return (
    <ProtectedRoute>
      <Layout>
        {/* Expired Verification Dialog */}
        <Dialog open={expiredVerification} onOpenChange={setExpiredVerification}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <DialogTitle className="text-lg">ID Verification Expired</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-gray-600 pt-2">
                Your government-issued ID verification has expired and needs to be renewed to continue using our services.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm text-gray-700">
                  You'll need to complete the verification process again with a valid government-issued ID.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExpiredVerification(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartReverification}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compact Header */}
          <div className="mb-3">
            <div className="text-center lg:text-left">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Identity Verification</h1>
              <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Complete your identity verification to access all features and start investing
              </p>
            </div>
          </div>

          {/* Verification Status Indicator for pending/in_progress */}
          {verificationStatus === 'pending' || verificationStatus === 'in_progress' ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-gray-700">
                  {verificationStatus === 'pending' 
                    ? 'Verification is pending review. Please wait for processing.' 
                    : 'Verification is in progress. This may take a few moments.'}
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : null}

          {/* Main Content Grid - Responsive */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column - Verification Component */}
            <div className="xl:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="h-full"
              >
                {verificationState.status === 'completed' ? (
                  <>
                    <VerificationSuccess
                      verificationDate={new Date().toISOString()}
                    />
                    
                    {/* Important Information Card - Below What's Next? */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="mt-3"
                    >
                      <Card className="rounded-lg shadow-sm border-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10">
                        <CardContent className="p-3">
                          <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText className="h-3 w-3 text-blue-600" />
                            Important Information
                          </h2>
                          
                          <div className="space-y-2">
                            {/* Ultra-Compact Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                  <Lock className="h-2 w-2 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900 dark:text-white text-xs mb-0.5">
                                    🔐 Secure Verification
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                                    Powered by Persona
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-2 w-2 text-green-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900 dark:text-white text-xs mb-0.5">
                                    📜 Required by Law
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                                    KYC/AML compliance
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                  <Unlock className="h-2 w-2 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900 dark:text-white text-xs mb-0.5">
                                    ✅ Unlock Features
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                                    Investment access
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                  <Eye className="h-2 w-2 text-indigo-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900 dark:text-white text-xs mb-0.5">
                                    🔒 Privacy Protected
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                                    Secure handling
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Compact Footer */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>Powered by</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">Persona</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </>
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
            </div>

            {/* Right Column - Compact Information */}
            <div className="space-y-2">
              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <Shield className="h-2 w-2 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-xs">Status</h3>
                          <p className="text-xs text-gray-600">
                            {verificationState.status === 'completed' 
                              ? 'Completed' 
                              : 'Required'
                            }
                          </p>
                        </div>
                      </div>
                      <CompactVerificationStatusBadge status={verificationState.status} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Combined Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-2">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Shield className="h-2 w-2 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-900 text-xs mb-0.5">Benefits</h3>
                          <p className="text-xs text-gray-600 leading-tight">Investment access, security</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-2 w-2 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-900 text-xs mb-0.5">Requirements</h3>
                          <p className="text-xs text-gray-600 leading-tight">Government ID, camera</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
