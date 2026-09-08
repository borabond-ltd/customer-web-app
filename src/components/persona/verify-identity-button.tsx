'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePersona } from '@/contexts/persona-context'
import { cn } from '@/lib/utils'

interface VerifyIdentityButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  showStatus?: boolean
  children?: React.ReactNode
}

export function VerifyIdentityButton({ 
  variant = 'default',
  size = 'default',
  className,
  showStatus = true,
  children
}: VerifyIdentityButtonProps) {
  const router = useRouter()
  const { verificationState } = usePersona()

  const handleClick = () => {
    router.push('/dashboard/verify-identity')
  }

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <Shield className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (verificationState.status) {
      case 'completed':
        return 'Verified'
      case 'failed':
        return 'Failed'
      case 'pending':
        return 'In Progress'
      default:
        return 'Not Verified'
    }
  }

  const getStatusVariant = () => {
    switch (verificationState.status) {
      case 'completed':
        return 'default' as const
      case 'failed':
        return 'destructive' as const
      case 'pending':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={cn(
          'flex items-center gap-2',
          className
        )}
      >
        {getStatusIcon()}
        {children || 'Verify Identity'}
      </Button>
      
      {showStatus && (
        <Badge variant={getStatusVariant()}>
          {getStatusText()}
        </Badge>
      )}
    </div>
  )
}
