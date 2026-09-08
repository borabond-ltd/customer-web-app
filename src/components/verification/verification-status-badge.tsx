'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, XCircle, AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationStatusBadgeProps {
  status: 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  animated?: boolean
  className?: string
}

const statusConfig = {
  idle: {
    label: 'Not Started',
    icon: Shield,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    iconClassName: 'text-gray-600'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    iconClassName: 'text-blue-600'
  },
  completed: {
    label: 'Verified',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconClassName: 'text-green-600'
  },
  failed: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconClassName: 'text-red-600'
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    iconClassName: 'text-orange-600'
  }
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'h-3 w-3'
  },
  md: {
    container: 'px-3 py-1 text-sm',
    icon: 'h-4 w-4'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'h-5 w-5'
  }
}

export function VerificationStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  animated = true,
  className
}: VerificationStatusBadgeProps) {
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  const badgeContent = (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-medium transition-all duration-200',
        config.className,
        sizeStyles.container,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(sizeStyles.icon, config.iconClassName)} />
      )}
      <span>{config.label}</span>
    </div>
  )

  if (animated && status === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
      >
        {badgeContent}
      </motion.div>
    )
  }

  if (animated && status === 'pending') {
    return (
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {badgeContent}
      </motion.div>
    )
  }

  return badgeContent
}

// Compact version for smaller spaces
export function CompactVerificationStatusBadge({
  status,
  className
}: {
  status: 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'
  className?: string
}) {
  return (
    <VerificationStatusBadge
      status={status}
      size="sm"
      showIcon={true}
      animated={false}
      className={className}
    />
  )
}

// Large version for prominent display
export function LargeVerificationStatusBadge({
  status,
  className
}: {
  status: 'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'
  className?: string
}) {
  return (
    <VerificationStatusBadge
      status={status}
      size="lg"
      showIcon={true}
      animated={true}
      className={className}
    />
  )
}
