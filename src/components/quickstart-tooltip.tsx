'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import './quickstart-tooltip.css'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp,
  ArrowRight,
  Target,
  BarChart3,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickstartItem {
  id: string
  title: string
  description: string
  completed: boolean
  icon: React.ComponentType<{ className?: string }>
  action?: () => void
}

interface QuickstartTooltipProps {
  className?: string
}

const QUICKSTART_STORAGE_KEY = 'borabond-quickstart-dismissed'

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

// Note: quickstartItems will be defined inside the component to access router

export function QuickstartTooltip({ className = '' }: QuickstartTooltipProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isVisible, setIsVisible] = useState(false)
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const quickstartItems: QuickstartItem[] = [
    {
      id: 'verify-identity',
      title: 'Verify Your Identity',
      description: 'Complete KYC verification by uploading your ID, proof of address, and taking a selfie. This regulatory requirement ensures secure transactions and typically takes 1-3 business days. Ensure all documents are clear and well-lit for faster processing.',
      completed: false,
      icon: Shield,
      action: () => {
        router.push('/dashboard/verify-identity')
      }
    },
    {
      id: 'view-available-bonds',
      title: 'View Available Bonds',
      description: 'Browse our curated selection of government and corporate bonds from various countries. Each bond shows details like coupon rate, maturity date, offer yield, and available amount. Use filters to find bonds that match your investment goals and risk tolerance.',
      completed: false,
      icon: BarChart3,
      action: () => {
        router.push('/dashboard/available-bonds')
      }
    },
    {
      id: 'investment-planner',
      title: 'Use Investment Planner',
      description: 'Calculate expected returns and plan your investment strategy. Enter your investment amount, timeline, and risk tolerance to see projected earnings, payout schedules, and portfolio recommendations. Use this tool to make informed investment decisions.',
      completed: false,
      icon: Target,
      action: () => {
        router.push('/investment_strategy')
      }
    },
    {
      id: 'purchase-first-bond',
      title: 'Purchase Your First Bond',
      description: 'Choose between automatic selection (let BoraBond select the best bonds) or manual selection (browse and select specific bonds). Enter your investment amount, review the purchase summary, and confirm your purchase. You\'ll receive a confirmation email and be redirected to view your transaction.',
      completed: false,
      icon: TrendingUp,
      action: () => {
        router.push('/dashboard/automatic-investment')
      }
    },
    {
      id: 'add-bank-account',
      title: 'Add Bank Account',
      description: 'Link your bank account for seamless funding of investments and automatic receipt of interest payments. Choose between instant verification via Plaid or manual entry with micro-deposit verification. This enables easy transfers and automatic payouts.',
      completed: false,
      icon: DollarSign,
      action: () => {
        router.push('/dashboard/bank')
      }
    },
    {
      id: 'view-bond-holdings',
      title: 'View Bond Holdings',
      description: 'Access your investment portfolio dashboard to monitor performance, track returns, and manage your bonds. View individual holdings, expected payouts, maturity dates, and overall portfolio performance. Regular monitoring helps you track progress and make informed decisions.',
      completed: false,
      icon: FileText,
      action: () => {
        router.push('/dashboard/bond-holdings')
      }
    }
  ]

  // Check if quickstart has been dismissed on component mount
  useEffect(() => {
    const dismissed = localStorage.getItem(QUICKSTART_STORAGE_KEY)
    if (dismissed === 'true') {
      setIsDismissed(true)
    } else {
      // Show the button after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Check if user has seen the onboarding tour
  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user?.id) return

      try {
        const response = await apiClient.getOnboardingTourStatus(user.id)
        setHasSeenTour(response.hasSeenTour)
      } catch (error) {
        console.error('Failed to check onboarding tour status:', error)
        setHasSeenTour(false) // Default to showing pulse if we can't check
      }
    }

    checkTourStatus()
  }, [user?.id])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsOpen(false)
    localStorage.setItem(QUICKSTART_STORAGE_KEY, 'true')
  }

  const handleItemClick = (item: QuickstartItem) => {
    if (item.action) {
      item.action()
    }
  }

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  // Don't render if dismissed
  if (isDismissed) {
    return null
  }

  // Don't render if user is not authenticated or still loading
  if (loading || !user) {
    return null
  }

  // Don't render on onboarding page or other non-dashboard pages
  if (pathname === '/onboarding' || !pathname.startsWith('/dashboard')) {
    return null
  }

  return (
    <div className={`fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 max-w-[calc(100vw-1rem)] sm:max-w-none ${className}`}>
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Collapsed Button */}
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="quickstart-animation"
              >
                <Button
                  onClick={handleToggle}
                  className={`group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 min-h-[44px] sm:min-h-[48px] lg:min-h-[52px] touch-manipulation quickstart-button ${hasSeenTour === false ? 'animate-pulse' : ''}`}
                  aria-label="Open Quickstart guide"
                  data-tour="quickstart-button"
                  style={{
                    // PWA-friendly: ensure button is accessible
                    minHeight: isMobile() ? '44px' : 'auto',
                    minWidth: isMobile() ? '44px' : 'auto',
                    // Add safe area padding for PWA
                    paddingLeft: isPWA() && isMobile() ? 'max(12px, env(safe-area-inset-left))' : undefined,
                    paddingRight: isPWA() && isMobile() ? 'max(12px, env(safe-area-inset-right))' : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                    <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="text-xs sm:text-sm lg:text-base font-medium quickstart-text">Quickstart</span>
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Expanded Panel */}
            {isOpen && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, x: 20, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`${isMobile() ? 'w-[calc(100vw-2rem)] max-h-[80vh]' : 'w-96 lg:w-[420px]'} max-w-sm lg:max-w-none bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden quickstart-panel quickstart-animation`}
                role="dialog"
                aria-labelledby="quickstart-title"
                aria-describedby="quickstart-description"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 sm:px-6 sm:py-5 lg:px-8 lg:py-6 relative">
                  <div className="flex items-center justify-between">
                    <h2 
                      id="quickstart-title"
                      className="text-base sm:text-lg lg:text-xl font-bold text-white"
                    >
                      Quickstart
                    </h2>
                    <Button
                      onClick={handleToggle}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 p-1.5 sm:p-1 h-auto min-h-[32px] sm:min-h-[28px] lg:min-h-[32px] touch-manipulation"
                      aria-label="Close Quickstart"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </Button>
                  </div>
                  <p 
                    id="quickstart-description"
                    className="text-green-100 text-xs sm:text-sm lg:text-base mt-1 lg:mt-2"
                  >
                    Complete guide to start investing in bonds
                  </p>
                </div>

                {/* Content */}
                <div className={`p-4 sm:p-6 lg:p-8 ${isMobile() ? 'max-h-[60vh]' : 'max-h-96 lg:max-h-[500px]'} overflow-y-auto quickstart-content`}>
                  <div className="space-y-3">
                    {quickstartItems.map((item, index) => {
                      const isExpanded = expandedItems.has(item.id)
                      const IconComponent = item.icon

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          className="group"
                        >
                          <div
                            className={`flex items-center gap-2 sm:gap-3 lg:gap-4 p-2.5 sm:p-3 lg:p-4 rounded-lg transition-all duration-200 ${
                              item.completed
                                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {/* Check Icon */}
                            <div
                              className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.completed
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1">
                                  <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                  <h3 className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 dark:text-white truncate">
                                    {item.title}
                                  </h3>
                                </div>
                                <Button
                                  onClick={() => toggleItemExpansion(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-h-[28px] sm:min-h-[24px] lg:min-h-[28px] touch-manipulation"
                                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                  ) : (
                                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                                  )}
                                </Button>
                              </div>

                              {/* Expanded Description */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-2"
                                  >
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 lg:mb-4 leading-relaxed">
                                      {item.description}
                                    </p>
                                    {item.action && (
                                      <Button
                                        onClick={() => handleItemClick(item)}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2.5 py-1.5 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 h-auto min-h-[32px] sm:min-h-[32px] lg:min-h-[36px] touch-manipulation"
                                      >
                                        <span className="text-xs sm:text-sm">Get Started</span>
                                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 ml-1" />
                                      </Button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="truncate">Complete investment guide</span>
                    </div>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950/20 text-xs sm:text-sm px-2 py-1.5 sm:py-1.5 lg:py-2 h-auto min-h-[32px] sm:min-h-[32px] lg:min-h-[36px] flex-shrink-0 touch-manipulation"
                    >
                      <span className="hidden xs:inline">Dismiss Quickstart</span>
                      <span className="xs:hidden">Dismiss</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Utility function to reset quickstart (for development/testing)
export function resetQuickstart() {
  localStorage.removeItem(QUICKSTART_STORAGE_KEY)
  window.location.reload()
}

// Hook to check if quickstart is dismissed
export function useQuickstartStatus() {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(QUICKSTART_STORAGE_KEY)
    setIsDismissed(dismissed === 'true')
  }, [])

  return isDismissed
}
