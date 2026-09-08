'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { AnimatedPage, AnimatedCard, AnimatedMetric } from '@/components/animated-page'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { SkeletonLoader } from '@/components/skeleton-loader'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowRight, Target, Sparkles, Shield, AlertCircle, Plus, Filter } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { usePersona } from '@/contexts/persona-context'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import { OnboardingDebug } from '@/components/onboarding/onboarding-debug'
import OnboardingTour, { useOnboardingTourStatus } from '@/components/onboarding/onboarding-tour'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { InvestmentSelectionModal } from '@/components/investment/investment-selection-modal'

import { logger } from '@/lib/logger'
// Currency formatting utilities
const formatCurrency = (amount: number, currency: 'UGX' | 'USD' = 'USD'): string => {
  if (currency === 'UGX') {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
}

const formatCurrencyShort = (amount: number, currency: 'UGX' | 'USD' = 'USD'): string => {
  if (currency === 'UGX') {
    if (amount >= 1000000) {
      return `UGX ${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `UGX ${(amount / 1000).toFixed(0)}K`
    } else {
      return `UGX ${amount.toFixed(0)}`
    }
  } else {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }
}

// Currency conversion functions
const convertToUGX = (usdAmount: number, rate: number): number => {
  return usdAmount * rate
}

const convertToUSD = (ugxAmount: number, rate: number): number => {
  return ugxAmount / rate
}

const getConvertedAmount = (amount: number, fromCurrency: 'UGX' | 'USD', toCurrency: 'UGX' | 'USD', rate: number): number => {
  if (fromCurrency === toCurrency) return amount
  if (fromCurrency === 'USD' && toCurrency === 'UGX') return convertToUGX(amount, rate)
  if (fromCurrency === 'UGX' && toCurrency === 'USD') return convertToUSD(amount, rate)
  return amount
}

// Portfolio data types
interface PortfolioSummary {
  total_investment: number
  current_yield: number
  upcoming_payments: number
  portfolio_growth: number
  next_payment_days?: number
  yield_change?: number
  investment_change?: number
  growth_period?: string
}

// Investment strategy data types
interface InvestmentStrategy {
  monthly_amount_usd: number
  monthly_amount_ugx?: number
  rate_to_usd?: number
  created_at: string
  initial_amount?: number
  strategy_type?: string
  reinvest_coupons?: boolean
}

interface PortfolioPerformance {
  monthly_data: Array<{
    month: string
    value: number
    income: number
    expenses: number
  }>
}

interface PortfolioAllocation {
  bonds: Array<{
    name: string
    percentage: number
    value: number
  }>
}

interface PortfolioGrowth {
  growthData: Array<{
    date: string
    total: number
    dailyAmount: number
  }>
  totalInvestment: number
  growthPercentage: number
  firstInvestmentDate: string | null
  lastInvestmentDate: string | null
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const { verificationState } = usePersona()
  const router = useRouter()
  const [isInvesting, setIsInvesting] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  
  // Onboarding tour state
  const { hasSeenTour, loading: tourLoading } = useOnboardingTourStatus()
  const [showTour, setShowTour] = useState(false)
  
  // Portfolio data state
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)
  const [portfolioPerformance, setPortfolioPerformance] = useState<PortfolioPerformance | null>(null)
  const [portfolioAllocation, setPortfolioAllocation] = useState<PortfolioAllocation | null>(null)
  const [portfolioGrowth, setPortfolioGrowth] = useState<PortfolioGrowth | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  
  // Cash flow data state
  const [cashFlowData, setCashFlowData] = useState<Array<{month: string, monthKey: string, expectedCashFlow: number}>>([])
  const [cashFlowError, setCashFlowError] = useState<string | null>(null)
  
  // Portfolio growth filter state
  const [growthPeriod, setGrowthPeriod] = useState<'30d' | '6m' | '1y' | 'all'>('6m')
  
  // Currency display state
  const [displayCurrency, setDisplayCurrency] = useState<'UGX' | 'USD'>('UGX')
  const [currencyRate, setCurrencyRate] = useState<number>(3850) // UGX to USD rate (fallback)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  
  // Investment strategy data state
  const [investmentStrategy, setInvestmentStrategy] = useState<InvestmentStrategy | null>(null)
  const [investmentStrategyError, setInvestmentStrategyError] = useState<string | null>(null)
  
  // Investment modal state
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!tourLoading && hasSeenTour === false && user?.id) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setShowTour(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [tourLoading, hasSeenTour, user?.id])

  // Fetch currency conversion rate from backend
  const fetchCurrencyRate = async () => {
    try {
      setIsLoadingRate(true)
      setCurrencyError(null)
      
      const response = await apiClient.getExchangeRate('UGX')
      
      if (response.success && response.data) {
        setCurrencyRate(response.data.rate_to_usd)
        logger.log('Currency rate fetched successfully:', response.data.rate_to_usd)
      } else {
        logger.warn('Failed to fetch currency rate, using fallback:', response.message)
        setCurrencyError('Using fallback rate - live rates unavailable')
        // Keep the fallback rate
      }
    } catch (error) {
      logger.error('Error fetching currency rate:', error)
      setCurrencyError('Currency rates unavailable - using fallback')
      // Keep the fallback rate
    } finally {
      setIsLoadingRate(false)
    }
  }

  // Load portfolio data
  useEffect(() => {
    const loadPortfolioData = async () => {
      if (!user?.user_id) return

      try {
        setIsDataLoading(true)
        setPortfolioError(null)

        // Load all portfolio data and investment strategy with conversion in parallel
        const [summaryResponse, performanceResponse, allocationResponse, growthResponse, strategyResponse, cashFlowResponse] = await Promise.all([
          apiClient.getPortfolioSummary(user.user_id),
          apiClient.getPortfolioPerformance(user.user_id),
          apiClient.getPortfolioAllocation(user.user_id),
          apiClient.getPortfolioGrowth(user.user_id, { period: growthPeriod }),
          apiClient.getInvestmentStrategyWithConversion('UGX'),
          apiClient.getCashFlowData(user.user_id)
        ])

        // Fetch currency rate
        await fetchCurrencyRate()

        if (summaryResponse.success) {
          logger.log('Portfolio Summary Data Received:', summaryResponse.data)
          setPortfolioSummary(summaryResponse.data as PortfolioSummary)
        } else {
          logger.error('Failed to load portfolio summary:', summaryResponse.error)
        }

                if (performanceResponse.success) {
                  setPortfolioPerformance(performanceResponse.data as PortfolioPerformance)
                } else {
                  logger.error('Failed to load portfolio performance:', performanceResponse.error)
                }

        if (allocationResponse.success) {
          setPortfolioAllocation(allocationResponse.data as PortfolioAllocation)
        } else {
          logger.error('Failed to load portfolio allocation:', allocationResponse.error)
        }

        if (growthResponse.success) {
          setPortfolioGrowth(growthResponse.data as PortfolioGrowth)
        } else {
          logger.error('Failed to load portfolio growth:', growthResponse.error)
        }

        if (strategyResponse.success) {
          setInvestmentStrategy(strategyResponse.data as InvestmentStrategy)
          setInvestmentStrategyError(null)
        } else {
          logger.error('Failed to load investment strategy:', strategyResponse.error)
          setInvestmentStrategyError(strategyResponse.error || 'Failed to load investment strategy')
        }

        // Process cash flow data
        if (cashFlowResponse.success) {
          logger.log('Cash Flow Data Received:', cashFlowResponse.data)
          const data = cashFlowResponse.data as {
            monthly_cashflow?: Array<{month: string, monthKey: string, expectedCashFlow: number}>
            payments?: Array<{ payment_date: string; net_income: number }>
          }
          setCashFlowData(data.monthly_cashflow || [])
        } else {
          logger.error('Failed to load cash flow data:', cashFlowResponse.error)
          setCashFlowError('Failed to load cash flow data')
        }

      } catch (error) {
        logger.error('Error loading portfolio data:', error)
        setPortfolioError('Failed to load portfolio data')
        toast.error('Failed to load portfolio data', {
          description: 'Please try refreshing the page'
        })
      } finally {
        setIsDataLoading(false)
      }
    }

    loadPortfolioData()
  }, [user?.user_id])

  // Reload portfolio growth when period changes
  useEffect(() => {
    const loadPortfolioGrowth = async () => {
      if (!user?.user_id) return

      try {
        const growthResponse = await apiClient.getPortfolioGrowth(user.user_id, { period: growthPeriod })
        
        if (growthResponse.success) {
          setPortfolioGrowth(growthResponse.data as PortfolioGrowth)
        } else {
          logger.error('Failed to load portfolio growth:', growthResponse.error)
        }
      } catch (error) {
        logger.error('Error loading portfolio growth:', error)
      }
    }

    loadPortfolioGrowth()
  }, [user?.user_id, growthPeriod])

  const handleInvestNow = () => {
    setShowInvestmentModal(true)
  }

  const handleUpdateStrategy = () => {
    router.push('/dashboard/investment')
  }

  const handleVerifyIdentity = () => {
    router.push('/dashboard/verify-identity')
  }

  // Check if verification is needed
  const needsVerification = verificationState.status !== 'completed'

  // Show skeleton loader while data is loading
  if (isDataLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <SkeletonLoader />
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout onInvestNow={handleInvestNow}>
        <AnimatedPage>
        {/* Debug Component - Remove after fixing */}
        {/* <OnboardingDebug /> */}
        
        {/* Onboarding Banner */}
        <OnboardingBanner className="mb-6" />
        
        {/* Hero Section - Compact Professional Card */}
        <div className="mb-4 sm:mb-6">
          <AnimatedCard delay={0.1}>
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Side - Welcome Message */}
                  <div className="flex-1" data-tour="welcome-message">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Ready to Grow Your Portfolio?
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Welcome back{user?.full_name ? `, ${user.full_name}` : ''}! Here's an overview of your investment portfolio.
                    </p>
                  </div>

                  {/* Right Side - Action Buttons */}
                  <div className="lg:flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        onClick={handleInvestNow}
                        disabled={isInvesting}
                        size="sm"
                        className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-800 w-full sm:w-auto"
                        aria-label="Start new investment"
                        data-tour="invest-now-button"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {isInvesting ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" />
                          )}
                          <span className="text-xs">{isInvesting ? 'Processing...' : 'Invest Now'}</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </Button>

                      <Button
                        onClick={handleUpdateStrategy}
                        variant="outline"
                        size="sm"
                        className="group relative overflow-hidden border border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950/20 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-300 font-medium px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-800 w-full sm:w-auto"
                        aria-label="Update investment strategy"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Target className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                          <span className="text-xs">Update Strategy</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Verification Prompt - Only show if verification is needed */}
        {needsVerification && (
          <div className="mb-4 sm:mb-6">
            <AnimatedCard delay={0.1}>
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Identity Verification Required
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Complete your identity verification to access all investment features and ensure secure transactions.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={handleVerifyIdentity}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          size="sm"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          <span className="text-xs">Verify Identity</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/20"
                        >
                          <span className="text-xs">Learn More</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8" data-tour="portfolio-summary">
          <AnimatedMetric delay={needsVerification ? 0.3 : 0.2}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-16 flex flex-col justify-between">
                {isDataLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : portfolioError ? (
                  <div className="text-red-500 text-sm">Error loading data</div>
                ) : (
                  <>
                    <div>
                      <div className="text-2xl font-bold">
                        ${getConvertedAmount(portfolioSummary?.total_investment || 0, 'UGX', 'USD', currencyRate).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        UGX {portfolioSummary?.total_investment?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={needsVerification ? 0.4 : 0.3}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-16 flex flex-col justify-between">
                {isDataLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : investmentStrategyError ? (
                  <div className="text-red-500 text-sm">Error loading data</div>
                ) : (
                  <>
                    <div>
                      <div className="text-2xl font-bold">
                        {investmentStrategy?.monthly_amount_usd ? 
                          new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: 'USD' 
                          }).format(investmentStrategy.monthly_amount_usd) :
                          '$0.00'
                        }
                      </div>
                      {investmentStrategy?.monthly_amount_ugx && investmentStrategy?.rate_to_usd ? (
                        <div className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat('en-UG', { 
                            style: 'currency', 
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(investmentStrategy.monthly_amount_ugx)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          UGX 0
                        </div>
                      )}
                    </div>
                    <div>
                      {investmentStrategy?.monthly_amount_ugx && investmentStrategy?.rate_to_usd ? (
                        <div className="text-xs text-muted-foreground">
                          1 USD = {investmentStrategy.rate_to_usd.toLocaleString()} UGX
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Exchange rate unavailable
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={needsVerification ? 0.5 : 0.4}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-16 flex flex-col justify-between">
                {isDataLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : portfolioError ? (
                  <div className="text-red-500 text-sm">Error loading data</div>
                ) : (
                  <>
                    <div>
                      <div className="text-2xl font-bold">
                        ${getConvertedAmount(portfolioSummary?.upcoming_payments || 0, 'UGX', 'USD', currencyRate).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        UGX {portfolioSummary?.upcoming_payments?.toLocaleString() || '0'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {portfolioSummary?.next_payment_days ? 
                        `Next payment in ${portfolioSummary.next_payment_days} days` :
                        'No upcoming payments'
                      }
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={needsVerification ? 0.6 : 0.5}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-16 flex flex-col justify-between">
                {isDataLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : portfolioError ? (
                  <div className="text-red-500 text-sm">Error loading data</div>
                ) : (
                  <>
                    <div>
                      <div className="text-2xl font-bold">
                        {portfolioGrowth?.growthPercentage !== undefined ? 
                          `${portfolioGrowth.growthPercentage > 0 ? '+' : ''}${portfolioGrowth.growthPercentage.toFixed(1)}%` :
                          portfolioSummary?.portfolio_growth ? 
                            `${portfolioSummary.portfolio_growth > 0 ? '+' : ''}${portfolioSummary.portfolio_growth}%` :
                            '+0%'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Portfolio Growth
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {portfolioGrowth?.firstInvestmentDate ? 
                        `Since ${new Date(portfolioGrowth.firstInvestmentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` :
                        portfolioSummary?.growth_period || 'Year to date'
                      }
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedMetric>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Portfolio Growth Chart */}
          <AnimatedCard delay={needsVerification ? 0.7 : 0.6}>
            <Card data-tour="portfolio-growth-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Portfolio Growth
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Track how your bond investments have grown over time
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={displayCurrency} onValueChange={(value: 'UGX' | 'USD') => setDisplayCurrency(value)}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UGX">UGX</SelectItem>
                        <SelectItem value="USD">USD {isLoadingRate && '(loading...)'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={growthPeriod} onValueChange={(value: '30d' | '6m' | '1y' | 'all') => setGrowthPeriod(value)}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30d">30D</SelectItem>
                        <SelectItem value="6m">6M</SelectItem>
                        <SelectItem value="1y">1Y</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {portfolioGrowth && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Total Investment:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(getConvertedAmount(portfolioGrowth.totalInvestment, 'UGX', displayCurrency, currencyRate), displayCurrency)}
                      </span>
                    </div>
                    {portfolioGrowth.growthPercentage > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Growth:</span>
                        <span className="font-semibold text-green-600">
                          +{portfolioGrowth.growthPercentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {displayCurrency === 'USD' && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-semibold text-blue-600">
                          1 USD = {currencyRate.toLocaleString()} UGX
                        </span>
                        {currencyError && (
                          <span className="text-xs text-orange-500">(fallback)</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-64 sm:h-80">
                  {isDataLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-500">Loading growth data...</p>
                      </div>
                    </div>
                  ) : portfolioError ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                        <p className="text-sm text-red-500">Failed to load growth data</p>
                      </div>
                    </div>
                  ) : portfolioGrowth?.growthData?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={portfolioGrowth.growthData.map(item => ({
                        ...item,
                        total: getConvertedAmount(item.total, 'UGX', displayCurrency, currencyRate),
                        dailyAmount: getConvertedAmount(item.dailyAmount, 'UGX', displayCurrency, currencyRate)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => formatCurrencyShort(value, displayCurrency)}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            formatCurrency(Number(value), displayCurrency), 
                            name === 'total' ? 'Total Portfolio' : 'Daily Investment'
                          ]}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          contentStyle={{ fontSize: '14px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#16a34a" 
                          strokeWidth={3}
                          dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <TrendingUp className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            No investments yet
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Your portfolio growth will appear here once you make your first investment.
                          </p>
                          <Button 
                            onClick={handleInvestNow}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white font-medium"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Start Investing
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Cash Flow Chart */}
          <AnimatedCard delay={needsVerification ? 0.8 : 0.7}>
            <Card data-tour="cashflow-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">💵 Cash Flow Projection</CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Your expected monthly coupon payments from bond investments
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={displayCurrency} onValueChange={(value: 'UGX' | 'USD') => setDisplayCurrency(value)}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UGX">UGX</SelectItem>
                        <SelectItem value="USD">USD {isLoadingRate && '(loading...)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-64 sm:h-80">
                  {isDataLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <p className="text-sm text-gray-500">Loading chart data...</p>
                      </div>
                    </div>
                  ) : portfolioError ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                        <p className="text-sm text-red-500">Failed to load chart data</p>
                      </div>
                    </div>
                  ) : cashFlowData.length > 0 && cashFlowData.some(item => item.expectedCashFlow > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowData.map(item => ({
                        ...item,
                        expectedCashFlow: getConvertedAmount(item.expectedCashFlow, 'USD', displayCurrency, currencyRate)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#e0e0e0' }}
                          tickLine={{ stroke: '#e0e0e0' }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => formatCurrencyShort(value, displayCurrency)}
                          axisLine={{ stroke: '#e0e0e0' }}
                          tickLine={{ stroke: '#e0e0e0' }}
                        />
                        <Tooltip 
                          formatter={(value) => [
                            formatCurrency(Number(value), displayCurrency), 
                            'Expected Cash Flow'
                          ]}
                          contentStyle={{ 
                            fontSize: '14px',
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Bar 
                          dataKey="expectedCashFlow" 
                          fill="#10b981" 
                          name="Expected Cash Flow" 
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                          <DollarSign className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">No cash flow data yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                            Start investing in bonds to see your expected monthly coupon payments
                          </p>
                        </div>
                        <Button 
                          onClick={handleInvestNow}
                          size="sm"
                          className="mt-2 bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Start Investing
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Bottom Cards Section */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        
          <AnimatedCard delay={needsVerification ? 0.9 : 0.8}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Last coupon payment received from Nigeria 13.5% 2030 bond.
                </p>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  +$13,500 • 2 days ago
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={needsVerification ? 1.0 : 0.9}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Payment</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ghana 15.2% 2029 coupon payment due soon.
                </p>
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  $18,240 • Dec 30, 2023
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={needsVerification ? 1.1 : 1.0}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Portfolio Health</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Diversified across 5 African markets with strong yields.
                </p>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  Excellent • 12.7% avg yield
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div> */}

        {/* Investment Simulator Section */}
        {/* <AnimatedCard delay={needsVerification ? 1.2 : 1.1}>
          <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Investment Simulator
                    </h3>
                    <p className="text-sm text-teal-100">
                      Project your bond investment returns over time with our advanced simulation tool.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/investment-simulator')}
                  className="bg-white text-teal-600 hover:bg-teal-50"
                  size="sm"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Open Simulator
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard> */}

        {/* Footer Section */}
        <Footer />
        </AnimatedPage>
        
        {/* Investment Selection Modal */}
        <InvestmentSelectionModal 
          isOpen={showInvestmentModal}
          onClose={() => setShowInvestmentModal(false)}
        />
        
        {/* Onboarding Tour */}
        <OnboardingTour 
          isOpen={showTour}
          onClose={() => setShowTour(false)}
          onComplete={() => {
            logger.log('Onboarding tour completed')
            toast.success('Welcome to BoraBond! You\'re all set to start investing.')
          }}
        />
      </Layout>
    </ProtectedRoute>
  )
}
