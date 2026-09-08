'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Shield, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VerificationSuccessProps {
  onContinue?: () => void
  verificationDate?: string
  className?: string
}

export function VerificationSuccess({ 
  onContinue, 
  verificationDate,
  className = '' 
}: VerificationSuccessProps) {
  return (
    <div className={`w-full ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        {/* Compact Success Header */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 15,
                  delay: 0.2 
                }}
                className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <CheckCircle className="h-6 w-6 text-green-600" />
              </motion.div>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-green-900 mb-1">
                  Identity Verified Successfully!
                </h2>
                <p className="text-sm text-green-700 mb-2">
                  Your identity has been verified and you now have full access to all features.
                </p>
                
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Verification Details */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-sm text-green-600">Verified</p>
                </div>
              </div>
              
              {verificationDate && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Verified On</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verificationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Benefits */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                What's Next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Full Platform Access</p>
                    <p className="text-xs text-gray-600">Access all investment features</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enhanced Security</p>
                    <p className="text-xs text-gray-600">Protected with verified identity</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  )
}
