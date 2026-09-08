'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  User,
  Camera
} from 'lucide-react'
import { usePersona } from '@/contexts/persona-context'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { logger } from '@/lib/logger'
interface PersonaStatusCardProps {
  className?: string
  showDetails?: boolean
}

export function PersonaStatusCard({ 
  className = '',
  showDetails = true 
}: PersonaStatusCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { verificationState, isPersonaLoaded, customerGuid } = usePersona()
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)

  // Load customer info on mount
  useEffect(() => {
    const loadCustomerInfo = async () => {
      if (!customerGuid && user) {
        setIsLoadingCustomer(true)
        try {
          // Since getCustomerInfo doesn't exist, we'll skip this for now
          // or implement alternative logic if needed
          setCustomerInfo(null)
        } catch (error) {
          logger.error('Failed to load customer info:', error)
        } finally {
          setIsLoadingCustomer(false)
        }
      }
    }

    loadCustomerInfo()
  }, [customerGuid, user])

  const handleVerifyClick = () => {
    router.push('/dashboard/verify-identity')
  }

  const getStatusConfig = () => {
    switch (verificationState.status) {
      case 'completed':
        return {
          icon: CheckCircle,
          title: 'Identity Verified',
          description: 'Your identity has been successfully verified',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badge: { text: 'Verified', variant: 'default' as const },
          progress: 100,
          action: { text: 'View Details', variant: 'outline' as const }
        }
      case 'failed':
        return {
          icon: XCircle,
          title: 'Verification Failed',
          description: 'Identity verification was not successful',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badge: { text: 'Failed', variant: 'destructive' as const },
          progress: 0,
          action: { text: 'Try Again', variant: 'default' as const }
        }
      case 'cancelled':
        return {
          icon: AlertCircle,
          title: 'Verification Cancelled',
          description: 'Identity verification was cancelled',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badge: { text: 'Cancelled', variant: 'secondary' as const },
          progress: 0,
          action: { text: 'Start Verification', variant: 'default' as const }
        }
      case 'pending':
        return {
          icon: Clock,
          title: 'Verification In Progress',
          description: 'Your identity verification is being processed',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badge: { text: 'In Progress', variant: 'secondary' as const },
          progress: 50,
          action: { text: 'View Status', variant: 'outline' as const }
        }
      default:
        return {
          icon: Shield,
          title: 'Identity Not Verified',
          description: 'Complete identity verification to access all features',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badge: { text: 'Not Verified', variant: 'outline' as const },
          progress: 0,
          action: { text: 'Verify Identity', variant: 'default' as const }
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  if (!isPersonaLoaded) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Loading Verification Status</h3>
              <p className="text-sm text-gray-600">Initializing...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${className} ${statusConfig.borderColor} border-2`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${statusConfig.bgColor} flex items-center justify-center`}>
                <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{statusConfig.title}</CardTitle>
                <CardDescription>{statusConfig.description}</CardDescription>
              </div>
            </div>
            <Badge variant={statusConfig.badge.variant}>
              {statusConfig.badge.text}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {verificationState.status === 'pending' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verification Progress</span>
                <span className="text-gray-900 font-medium">{statusConfig.progress}%</span>
              </div>
              <Progress value={statusConfig.progress} className="h-2" />
            </div>
          )}

          {/* User Info */}
          {showDetails && user && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.full_name || 'Name not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>📧</span>
                <span>{user.email}</span>
              </div>
              {user?.id && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🆔</span>
                  <span className="font-mono text-xs">
                    User ID: {user.id.slice(0, 8)}...
                  </span>
                </div>
              )}
              {customerInfo?.localRecord?.cybrid_customer_id && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>🏦</span>
                  <span className="font-mono text-xs">
                    Customer: {customerInfo.localRecord.cybrid_customer_id.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Inquiry ID */}
          {verificationState.inquiryId && showDetails && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Inquiry ID</p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {verificationState.inquiryId}
              </p>
            </div>
          )}

          {/* Error Message */}
          {verificationState.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{verificationState.error}</p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleVerifyClick}
            variant={statusConfig.action.variant}
            className="w-full"
            size="lg"
          >
            {verificationState.status === 'pending' ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                {statusConfig.action.text}
              </>
            ) : verificationState.status === 'completed' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {statusConfig.action.text}
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {statusConfig.action.text}
              </>
            )}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {/* Security Notice */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              🔒 Your data is protected with bank-level security
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
