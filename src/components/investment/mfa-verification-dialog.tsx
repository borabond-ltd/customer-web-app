'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Mail, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'

interface MFAVerificationDialogProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (code: string) => Promise<boolean>
  onResend: () => Promise<{ success: boolean; maskedEmail?: string }>
  maskedEmail?: string
  isLoading?: boolean
}

export function MFAVerificationDialog({
  isOpen,
  onClose,
  onVerify,
  onResend,
  maskedEmail = 'your email',
  isLoading = false
}: MFAVerificationDialogProps) {
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(600) // 10 minutes in seconds
  const [isExpired, setIsExpired] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Countdown timer effect
  useEffect(() => {
    if (isOpen && !success && !isExpired) {
      // Start countdown when dialog opens
      setTimeRemaining(600) // Reset to 10 minutes
      setIsExpired(false)

      countdownRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsExpired(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }
      }
    }
  }, [isOpen, success])

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCode('')
      setError(null)
      setSuccess(false)
      setResendMessage(null)
      setIsVerifying(false)
      setIsResending(false)
      setTimeRemaining(600)
      setIsExpired(false)
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [isOpen])

  // Auto-submit when code is 6 digits
  useEffect(() => {
    if (code.length === 6 && !isVerifying && !success) {
      handleVerify()
    }
  }, [code])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setError(null)
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const result = await onVerify(code)
      if (result) {
        setSuccess(true)
        // Close dialog after a short delay to show success state
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError('Invalid verification code. Please try again.')
        setCode('')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.')
      setCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)
    setResendMessage(null)

    try {
      const result = await onResend()
      if (result.success) {
        setResendMessage(`New verification code sent to ${result.maskedEmail || maskedEmail}`)
        // Reset the countdown timer
        setTimeRemaining(600)
        setIsExpired(false)
      } else {
        setError('Failed to resend verification code. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.')
    } finally {
      setIsResending(false)
    }
  }

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isVerifying) {
      handleVerify()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-blue-600" />
            Email Verification
          </DialogTitle>
          <DialogDescription>
            We've sent a 6-digit verification code to {maskedEmail}. Please enter it below to complete your investment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success State */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Verification Successful!</h3>
              <p className="text-green-700">Your investment has been saved successfully.</p>
            </motion.div>
          )}

          {/* Verification Form */}
          {!success && (
            <>
              {/* Info Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Security Verification</h4>
                      <p className="text-sm text-blue-700">
                        Enter the 6-digit code sent to {maskedEmail} to verify your identity and complete your investment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="text-center block">
                  Verification Code
                </Label>
                <div className="flex justify-center">
                  <Input
                    ref={inputRef}
                    id="verification-code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    onKeyPress={handleKeyPress}
                    placeholder="000000"
                    maxLength={6}
                    className="w-48 text-center text-2xl font-mono tracking-widest h-12"
                    disabled={isVerifying || isLoading}
                  />
                </div>
                <div className="text-center">
                  {isExpired ? (
                    <p className="text-xs text-red-600 font-medium">
                      Code has expired
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Expires in <span className="font-mono font-medium text-gray-700">{formatTimeRemaining(timeRemaining)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Resend Message */}
              {resendMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-700">{resendMessage}</p>
                </motion.div>
              )}

              {/* Resend Button */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={isResending || isLoading}
                  className="text-sm"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Code
                    </>
                  )}
                </Button>
                {isExpired && (
                  <p className="text-xs text-red-600 mt-2">
                    Code expired. Please resend to get a new one.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!success && (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isVerifying || isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || isVerifying || isLoading}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
