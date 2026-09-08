'use client'

import { forwardRef, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface OptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ComponentType<{ className?: string }>
  showPasswordToggle?: boolean
  onTogglePassword?: () => void
  showPassword?: boolean
  helperText?: string
  required?: boolean
}

export const OptimizedInput = forwardRef<HTMLInputElement, OptimizedInputProps>(
  ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    error,
    icon: Icon,
    placeholder,
    showPasswordToggle = false,
    onTogglePassword,
    showPassword = false,
    helperText,
    required = false,
    className = '',
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    
    const inputType = useMemo(() => {
      if (showPasswordToggle) {
        return showPassword ? 'text' : 'password'
      }
      return type
    }, [type, showPasswordToggle, showPassword])
    
    const handleFocus = useCallback(() => {
      setIsFocused(true)
    }, [])
    
    const handleBlur = useCallback(() => {
      setIsFocused(false)
    }, [])
    
    const handleMouseEnter = useCallback(() => {
      setIsHovered(true)
    }, [])
    
    const handleMouseLeave = useCallback(() => {
      setIsHovered(false)
    }, [])
    
    const inputClasses = useMemo(() => {
      const baseClasses = 'pl-10 pr-10 h-11 transition-all duration-200'
      const errorClasses = error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
      const focusClasses = isFocused ? 'ring-2 ring-green-500/20' : ''
      const hoverClasses = isHovered ? 'border-green-400' : ''
      
      return `${baseClasses} ${errorClasses} ${focusClasses} ${hoverClasses} ${className}`
    }, [error, isFocused, isHovered, className])
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <Label 
          htmlFor={id} 
          className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        
        <div className="relative">
          {Icon && (
            <motion.div
              animate={{ 
                color: isFocused ? '#10b981' : '#9ca3af',
                scale: isFocused ? 1.1 : 1
              }}
              transition={{ duration: 0.2 }}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          )}
          
          <Input
            ref={ref}
            id={id}
            type={inputType}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            placeholder={placeholder}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
          
          {showPasswordToggle && (
            <motion.button
              type="button"
              onClick={onTogglePassword}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 rounded"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </motion.button>
          )}
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            id={`${id}-error`}
            className="text-sm text-red-500 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
        
        {helperText && !error && (
          <p id={`${id}-helper`} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </motion.div>
    )
  }
)

OptimizedInput.displayName = 'OptimizedInput'
