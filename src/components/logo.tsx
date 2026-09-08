'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {/* B Icon */}
      <div className={cn(
        'bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg',
        sizeClasses[size]
      )}>
        <span className="text-white font-bold">B</span>
      </div>
      
      {/* BoraBond Text */}
      {showText && (
        <div>
          <h1 className={cn(
            'font-bold text-green-600 dark:text-green-400',
            textSizeClasses[size]
          )}>
            BoraBond
          </h1>
        </div>
      )}
    </div>
  )
}
