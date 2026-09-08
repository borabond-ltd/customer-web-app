'use client'

import { forwardRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
  fullWidth?: boolean
  gradient?: boolean
}

export const OptimizedButton = forwardRef<HTMLButtonElement, OptimizedButtonProps>(
  ({
    children,
    loading = false,
    icon: Icon,
    variant = 'default',
    size = 'default',
    fullWidth = false,
    gradient = false,
    className = '',
    disabled,
    ...props
  }, ref) => {
    const buttonClasses = useMemo(() => {
      const baseClasses = 'relative overflow-hidden transition-all duration-200 font-semibold'
      const sizeClasses = {
        sm: 'h-9 px-3 text-sm',
        default: 'h-11 px-6',
        lg: 'h-12 px-6'
      }
      const widthClasses = fullWidth ? 'w-full' : ''
      
      let variantClasses = ''
      if (gradient) {
        variantClasses = 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl'
      } else {
        switch (variant) {
          case 'outline':
            variantClasses = 'border-2 border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
            break
          case 'ghost':
            variantClasses = 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
            break
          case 'link':
            variantClasses = 'bg-transparent hover:underline text-green-600 hover:text-green-700'
            break
          default:
            variantClasses = 'bg-green-600 hover:bg-green-700 text-white'
        }
      }
      
      return cn(
        baseClasses,
        sizeClasses[size],
        widthClasses,
        variantClasses,
        className
      )
    }, [variant, size, fullWidth, gradient, className])
    
    const isDisabled = disabled || loading
    
    return (
      <motion.div
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          className={buttonClasses}
          disabled={isDisabled}
          {...props}
        >
          <div className="flex items-center justify-center gap-2 relative">
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute left-0"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </motion.div>
            )}
            
            {Icon && !loading && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
            )}
            
            <motion.span
              animate={{ 
                opacity: loading ? 0.7 : 1,
                x: loading ? 8 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.span>
          </div>
          
          {gradient && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          )}
        </Button>
      </motion.div>
    )
  }
)

OptimizedButton.displayName = 'OptimizedButton'
