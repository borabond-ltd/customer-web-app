'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { AnimatedPage, AnimatedCard } from '@/components/animated-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, DollarSign, Calendar, AlertCircle, Plus } from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

import { logger } from '@/lib/logger'
// Currency formatting utilities
const formatCurrency = (amount: number, currency: 'UGX' | 'USD' = 'USD'): string => {
  if (currency === 'UGX') {
    return new Intl.NumberFormat('en-UG', { 
      style: 'currency', 
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const formatCurrencyShort = (amount: number, currency: 'UGX' | 'USD' = 'USD'): string => {
  if (currency === 'UGX') {
    if (amount >= 1000000) {
      return `UGX ${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `UGX ${(amount / 1000).toFixed(0)}K`
    }
    return `UGX ${amount.toFixed(0)}`
  }
  
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(2)}`
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

// Cash flow data types
interface CashFlowData {
  month: string
  monthKey: string
  expectedCashFlow: number
}

export default function CashFlowPage() {
  const { user } = useAuth()
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<'UGX' | 'USD'>('UGX')
  const [currencyRate, setCurrencyRate] = useState<number>(3850) // UGX to USD rate (fallback)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)

  // Fetch currency rate
  const fetchCurrencyRate = async () => {
    try {
      setIsLoadingRate(true)
      setCurrencyError(null)
      const response = await apiClient.getExchangeRate('UGX')
      if (response.success && response.data?.rate_to_usd) {
        setCurrencyRate(response.data.rate_to_usd)
        logger.log('Currency rate fetched successfully:', response.data.rate_to_usd)
      } else {
        logger.warn('Failed to fetch currency rate, using fallback:', response.message)
        setCurrencyError('Using fallback rate - live rates unavailable')
      }
    } catch (error) {
      logger.error('Error fetching currency rate:', error)
      setCurrencyError('Currency rates unavailable - using fallback')
    } finally {
      setIsLoadingRate(false)
    }
  }

  // Load cash flow data
  useEffect(() => {
    const loadCashFlowData = async () => {
      if (!user?.user_id) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        const [cashFlowResponse] = await Promise.all([
          apiClient.getCashFlowData(user.user_id),
          fetchCurrencyRate()
        ])

        if (cashFlowResponse.success) {
          logger.log('Cash Flow Data Received:', cashFlowResponse.data)
          const data = cashFlowResponse.data as { monthly_cashflow: CashFlowData[] }
          setCashFlowData(data.monthly_cashflow || [])
        } else {
          logger.error('Failed to load cash flow data:', cashFlowResponse.error)
          setError('Failed to load cash flow data')
        }
      } catch (error) {
        logger.error('Error loading cash flow data:', error)
        setError('Error loading cash flow data')
      } finally {
        setIsLoading(false)
      }
    }

    loadCashFlowData()
  }, [user?.user_id])

  // Calculate total expected cash flow
  const totalExpectedCashFlow = cashFlowData.reduce((sum, item) => sum + item.expectedCashFlow, 0)
  const averageMonthlyCashFlow = cashFlowData.length > 0 ? totalExpectedCashFlow / cashFlowData.length : 0

  // Prepare chart data with currency conversion
  const chartData = cashFlowData.map(item => ({
    ...item,
    expectedCashFlow: getConvertedAmount(item.expectedCashFlow, 'USD', displayCurrency, currencyRate)
  }))

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    💵 Cash Flow Projection
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Your expected monthly coupon payments from bond investments
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <AnimatedCard delay={0.1}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expected (24 months)</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(getConvertedAmount(totalExpectedCashFlow, 'USD', displayCurrency, currencyRate), displayCurrency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {displayCurrency === 'USD' ? 
                              `UGX ${totalExpectedCashFlow.toLocaleString()}` : 
                              `$${getConvertedAmount(totalExpectedCashFlow, 'USD', 'USD', currencyRate).toLocaleString()}`
                            }
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </AnimatedCard>

                <AnimatedCard delay={0.2}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(getConvertedAmount(averageMonthlyCashFlow, 'USD', displayCurrency, currencyRate), displayCurrency)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {displayCurrency === 'USD' ? 
                              `UGX ${averageMonthlyCashFlow.toLocaleString()}` : 
                              `$${getConvertedAmount(averageMonthlyCashFlow, 'USD', 'USD', currencyRate).toLocaleString()}`
                            }
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </AnimatedCard>

                <AnimatedCard delay={0.3}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-2">
                          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {cashFlowData.some(item => item.expectedCashFlow > 0) ? 
                              'Active' : '0'
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cashFlowData.some(item => item.expectedCashFlow > 0) ? 
                              'Generating cash flow' : 'No active bonds'
                            }
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </div>

              {/* Cash Flow Chart */}
              <AnimatedCard delay={0.4}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Monthly Cash Flow Projection</CardTitle>
                        <CardDescription>
                          Expected coupon payments over the next 24 months
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
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                            <p className="text-sm text-gray-500">Loading cash flow data...</p>
                          </div>
                        </div>
                      ) : error ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                            <p className="text-sm text-red-500">Failed to load cash flow data</p>
                          </div>
                        </div>
                      ) : chartData.length > 0 && chartData.some(item => item.expectedCashFlow > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
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
                              <p className="text-sm font-medium text-gray-900 dark:text-white">No cash flow data yet</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                Start investing in bonds to see your expected monthly coupon payments
                              </p>
                            </div>
                            <Button 
                              onClick={() => window.location.href = '/dashboard/investment'}
                              size="sm"
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Start Investing
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {currencyError && (
                      <div className="mt-4 text-center">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {currencyError}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </div>
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
