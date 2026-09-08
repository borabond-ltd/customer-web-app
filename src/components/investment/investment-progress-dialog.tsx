'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, 
  Mail, 
  Shield,
  CheckCircle
} from 'lucide-react'
import { motion } from 'framer-motion'

interface InvestmentProgressDialogProps {
  isOpen: boolean
  onClose?: () => void
  currentStep: 'sending' | 'sent' | 'error'
  maskedEmail?: string
  errorMessage?: string
}

export function InvestmentProgressDialog({
  isOpen,
  onClose,
  currentStep,
  maskedEmail = 'your email',
  errorMessage
}: InvestmentProgressDialogProps) {
  const getStepContent = () => {
    switch (currentStep) {
      case 'sending':
        return {
          icon: <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />,
          title: 'Sending Verification Code',
          description: 'Please wait while we send a verification code to your email address...',
          showProgress: true
        }
      case 'sent':
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-600" />,
          title: 'Code Sent Successfully',
          description: `Verification code has been sent to ${maskedEmail}`,
          showProgress: false
        }
      case 'error':
        return {
          icon: <Shield className="h-8 w-8 text-red-600" />,
          title: 'Failed to Send Code',
          description: errorMessage || 'Unable to send verification code. Please try again.',
          showProgress: false
        }
      default:
        return {
          icon: <Mail className="h-8 w-8 text-blue-600" />,
          title: 'Processing',
          description: 'Please wait...',
          showProgress: true
        }
    }
  }

  const stepContent = getStepContent()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-blue-600" />
            Investment Verification
          </DialogTitle>
          <DialogDescription>
            We're securing your investment with email verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Card */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-center"
                >
                  {stepContent.icon}
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-lg font-semibold text-gray-900"
                >
                  {stepContent.title}
                </motion.h3>

                {/* Description */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-sm text-gray-600"
                >
                  {stepContent.description}
                </motion.p>

                {/* Progress Bar */}
                {stepContent.showProgress && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="w-full bg-gray-200 rounded-full h-2"
                  >
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      animate={{ width: ['0%', '100%'] }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    />
                  </motion.div>
                )}

                {/* Success State */}
                {currentStep === 'sent' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <p className="text-sm text-green-700">
                      Check your email and enter the 6-digit code to continue
                    </p>
                  </motion.div>
                )}

                {/* Error State */}
                {currentStep === 'error' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm text-red-700">
                      Please check your internet connection and try again
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Security Notice</h4>
                <p className="text-sm text-blue-700">
                  This verification helps protect your investment and ensures secure transactions. 
                  The code will expire in 10 minutes for your security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
