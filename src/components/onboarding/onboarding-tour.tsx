'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import './onboarding-tour.css'

// Responsive utility functions
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768
const isTablet = () => typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024

// PWA detection
const isPWA = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://')
}

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface TourStep {
  id: string
  target: string
  title: string
  content: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top' | 'bottom' | 'left' | 'right'
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to BoraBond!',
    content: 'This is your main dashboard where you\'ll track your investments and see your progress.',
    position: 'top-left',
  },
  {
    id: 'identity-verification',
    target: '[data-tour="identity-verification"]',
    title: 'Identity Verification',
    content: 'Before investing, please verify your identity to enable secure transactions. Tap \'Verify Identity\' to complete this step.',
    position: 'bottom',
  },
  {
    id: 'invest-now-button',
    target: '[data-tour="invest-now-button"]',
    title: 'Start Investing',
    content: 'Once verified, tap here to explore available bonds and start your first investment.',
    position: 'bottom',
  },
  {
    id: 'portfolio-summary',
    target: '[data-tour="portfolio-summary"]',
    title: 'Portfolio Summary',
    content: 'This section will show your total investment, recurring amount, next coupon payment, and portfolio growth once you start investing.',
    position: 'top',
  },
  {
    id: 'portfolio-growth-chart',
    target: '[data-tour="portfolio-growth-chart"]',
    title: 'Portfolio Growth Chart',
    content: 'Track your investment performance over time with this interactive chart. It shows projected growth based on your selected bonds.',
    position: 'right',
  },
  {
    id: 'cashflow-chart',
    target: '[data-tour="cashflow-chart"]',
    title: 'Cash Flow Projection',
    content: 'See your expected coupon payments and cash flow schedule. This helps you plan your financial future.',
    position: 'left',
  },
  {
    id: 'sidebar-bond-holdings',
    target: '[data-tour="sidebar-bond-holdings"]',
    title: 'Bond Holdings',
    content: 'View and manage your current bond investments. Track performance, maturity dates, and coupon payments.',
    position: 'right',
  },
  {
    id: 'sidebar-available-bonds',
    target: '[data-tour="sidebar-available-bonds"]',
    title: 'Available Bonds',
    content: 'Browse and invest in government bonds. See current rates, maturity periods, and expected returns.',
    position: 'right',
  },
  {
    id: 'sidebar-recurring-investments',
    target: '[data-tour="sidebar-recurring-investments"]',
    title: 'Recurring Investment',
    content: 'Set up automatic monthly investments to build your portfolio consistently over time.',
    position: 'right',
  },
  {
    id: 'quickstart-button',
    target: '[data-tour="quickstart-button"]',
    title: 'Quickstart Guide',
    content: 'Need help? Access this quickstart guide anytime to revisit the tour or get assistance with using BoraBond.',
    position: 'top',
  },
]

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentTourStep = tourSteps[currentStep]
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

  // Calculate tooltip position based on target element
  const calculateTooltipPosition = useCallback(() => {
    if (!currentTourStep) return

    let element: HTMLElement | null = null

    if (currentTourStep.target === 'body') {
      // For the first step, position in top-left corner
      setTooltipPosition({ top: 20, left: 20 })
      setTargetElement(null)
      return
    }

    element = document.querySelector(currentTourStep.target) as HTMLElement
    setTargetElement(element)

    if (!element) {
      console.warn(`[OnboardingTour] Element not found: ${currentTourStep.target} for step: ${currentTourStep.id}`)
      return
    }

    const rect = element.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = 200
    const margin = 20

    let top = 0
    let left = 0

    switch (currentTourStep.position) {
      case 'top-left':
        top = 20
        left = 20
        break
      case 'top':
        top = rect.top - tooltipHeight - margin
        left = rect.left + (rect.width - tooltipWidth) / 2
        break
      case 'bottom':
        top = rect.bottom + margin
        left = rect.left + (rect.width - tooltipWidth) / 2
        break
      case 'left':
        top = rect.top + (rect.height - tooltipHeight) / 2
        left = rect.left - tooltipWidth - margin
        break
      case 'right':
        top = rect.top + (rect.height - tooltipHeight) / 2
        left = rect.right + margin
        break
      case 'center':
        top = window.innerHeight / 2 - tooltipHeight / 2
        left = window.innerWidth / 2 - tooltipWidth / 2
        break
    }

    // Ensure tooltip stays within viewport
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin))
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin))

    setTooltipPosition({ top, left })
  }, [currentTourStep])

  // Update position when step changes or window resizes
  useEffect(() => {
    if (isOpen) {
      calculateTooltipPosition()
      
      const handleResize = () => {
        calculateTooltipPosition()
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, currentStep, calculateTooltipPosition])

  // Add body class to prevent scrolling on mobile/PWA
  useEffect(() => {
    if (isOpen) {
      if (isMobile()) {
        document.body.classList.add('tour-active')
      }
    } else {
      document.body.classList.remove('tour-active')
    }
    
    return () => {
      document.body.classList.remove('tour-active')
    }
  }, [isOpen])

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      // Complete the tour
      if (user?.id) {
        try {
          await apiClient.completeOnboardingTour(user.id)
          logger.info('[OnboardingTour] Tour completed successfully')
        } catch (error) {
          logger.error('[OnboardingTour] Error completing tour:', error)
        }
      }
      
      onComplete?.()
      onClose()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, isLastStep, user?.id, onComplete, onClose])

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep, isFirstStep])

  const handleSkip = useCallback(async () => {
    // Mark tour as completed even when skipped
    if (user?.id) {
      try {
        await apiClient.completeOnboardingTour(user.id)
        logger.info('[OnboardingTour] Tour skipped successfully')
      } catch (error) {
        logger.error('[OnboardingTour] Error skipping tour:', error)
      }
    }
    
    onComplete?.()
    onClose()
  }, [user?.id, onComplete, onClose])

  if (!isOpen || !currentTourStep) {
    return null
  }

  return (
    <>
      {/* Spotlight mask - only show for steps with target elements, not for the welcome step */}
      {currentTourStep.target !== 'body' && targetElement && (
        <div 
          className="fixed inset-0 z-50"
          style={{ 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* Spotlight cutout - creates the "hole" in the overlay */}
      {currentTourStep.target !== 'body' && targetElement && (
        <div
          className="fixed pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 10,
            left: targetElement.getBoundingClientRect().left - 10,
            width: targetElement.getBoundingClientRect().width + 20,
            height: targetElement.getBoundingClientRect().height + 20,
            zIndex: 10000,
            backgroundColor: 'transparent',
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.7)`,
            borderRadius: '8px'
          }}
        />
      )}
      
      {/* Spotlight border */}
      {targetElement && currentTourStep.target !== 'body' && (
        <div
          className="fixed border-4 border-green-500 rounded-lg pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
            zIndex: 10000,
            boxShadow: '0 0 0 4px rgba(21, 128, 61, 0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-gray-800 text-white rounded-lg shadow-lg p-5 max-w-sm z-50 border border-gray-600"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 10001,
          fontSize: isMobile() ? '12px' : '14px',
          borderRadius: isMobile() ? '16px' : '12px',
          padding: isMobile() ? '16px' : '20px',
          maxWidth: isMobile() ? '90vw' : '320px',
          minHeight: isMobile() ? '120px' : 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Content */}
        <div className="text-left mb-4">
          <h3 className={`${isMobile() ? 'text-base' : 'text-lg'} font-semibold text-white mb-2`}>
            {currentTourStep.title}
          </h3>
          <p className={`${isMobile() ? 'text-sm' : 'text-base'} text-gray-200`}>
            {currentTourStep.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                style={{
                  borderRadius: isMobile() ? '12px' : '8px',
                  fontSize: isMobile() ? '12px' : '14px',
                  padding: isMobile() ? '10px 16px' : '8px 16px',
                  minHeight: isMobile() ? '44px' : 'auto',
                  minWidth: isMobile() ? '80px' : 'auto',
                }}
              >
                Back
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              style={{
                borderRadius: isMobile() ? '12px' : '8px',
                fontSize: isMobile() ? '12px' : '14px',
                padding: isMobile() ? '10px 16px' : '8px 16px',
                minHeight: isMobile() ? '44px' : 'auto',
                minWidth: isMobile() ? '80px' : 'auto',
              }}
            >
              {isMobile() ? 'Skip' : 'Skip Tour'}
            </Button>
          </div>
          
          <Button
            onClick={handleNext}
            className="bg-green-600 hover:bg-green-700 text-white"
            style={{
              borderRadius: isMobile() ? '12px' : '8px',
              fontSize: isMobile() ? '12px' : '14px',
              padding: isMobile() ? '10px 16px' : '8px 16px',
              minHeight: isMobile() ? '44px' : 'auto',
              minWidth: isMobile() ? '80px' : 'auto',
            }}
          >
            {isLastStep ? (isMobile() ? 'Finish' : 'Finish Tour') : 'Next'}
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="mt-3 flex justify-center">
          <div className="flex gap-1">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to check if user has seen the onboarding tour
export function useOnboardingTourStatus() {
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchTourStatus = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await apiClient.getOnboardingTourStatus(user.id)
        setHasSeenTour(response.hasSeenTour)
      } catch (error) {
        logger.error('Failed to fetch onboarding tour status:', error)
        setHasSeenTour(false) // Default to false on error
      } finally {
        setLoading(false)
      }
    }

    fetchTourStatus()
  }, [user?.id])

  return { hasSeenTour, loading }
}