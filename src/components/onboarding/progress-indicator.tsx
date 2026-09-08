'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { OnboardingSection } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  sections: OnboardingSection[]
  className?: string
}

export function ProgressIndicator({ sections, className }: ProgressIndicatorProps) {
  const { state, goToSection, isSectionComplete, getProgressPercentage } = useOnboarding()
  const progressPercentage = getProgressPercentage()

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="mb-2 sm:mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">
            Progress
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Section Steps - Mobile: Horizontal scroll, Desktop: Full width */}
      <div className="overflow-x-auto pb-2 sm:pb-0">
        <div className="flex items-center justify-between min-w-max sm:min-w-0">
          {sections.map((section, index) => {
            const isActive = index === state.currentSectionIndex
            const isCompleted = isSectionComplete(section.id)
            const isClickable = index <= state.currentSectionIndex || isCompleted

            return (
              <div key={section.id} className="flex flex-col items-center flex-1 min-w-[60px] sm:min-w-0">
                {/* Step Circle */}
                <motion.button
                  onClick={() => isClickable && goToSection(index)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-200',
                    isActive && 'border-blue-500 bg-blue-50 scale-110',
                    isCompleted && 'border-green-500 bg-green-50',
                    !isActive && !isCompleted && 'border-gray-300 bg-white',
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-not-allowed opacity-50'
                  )}
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </motion.div>
                  ) : (
                    <Circle className={cn(
                      'w-4 h-4 sm:w-5 sm:h-5',
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    )} />
                  )}
                  
                  {/* Step Number */}
                  {!isCompleted && (
                    <span className={cn(
                      'absolute text-xs font-semibold',
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    )}>
                      {index + 1}
                    </span>
                  )}
                </motion.button>

                {/* Section Label - Show only numbers */}
                <div className="mt-1 text-center px-1">
                  <p className={cn(
                    'text-xs font-medium leading-tight',
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  )}>
                    {index + 1}
                  </p>
                </div>

                {/* Connector Line - Hidden on mobile to prevent overflow */}
                {index < sections.length - 1 && (
                  <div className="hidden sm:block absolute top-4 sm:top-5 left-1/2 w-full h-0.5 bg-gray-200 -z-10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: isCompleted ? '100%' : '0%' 
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Section Info - Removed to save space */}
    </div>
  )
}
