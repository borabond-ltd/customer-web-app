'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, DollarSign, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
interface Bond {
  id: string
  display_name: string
  country: string
  coupon_rate: number
  maturity_date: string
  currency: string
}

interface SelectedBond {
  bond: Bond
  amount: number
}

interface PayoutScheduleItem {
  paymentDate: string
  couponRate: number
  status: 'Upcoming' | 'Paid'
  payoutAmount: number
  bondId: string
  bondName: string
  country: string
  isMaturity: boolean
}

interface PayoutScheduleTableProps {
  selectedBonds: SelectedBond[]
  showSchedule: boolean
}

export function PayoutScheduleTable({ selectedBonds, showSchedule }: PayoutScheduleTableProps) {
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Currency conversion state
  const [currencyRate, setCurrencyRate] = useState<number>(3850) // UGX to USD rate (fallback)
  const [displayCurrency, setDisplayCurrency] = useState<'UGX' | 'USD'>('UGX')
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)

  // Currency conversion functions
  const convertToUGX = (usdAmount: number): number => {
    return usdAmount * currencyRate
  }

  const convertToUSD = (ugxAmount: number): number => {
    return ugxAmount / currencyRate
  }

  const formatCurrency = (amount: number, currency: 'UGX' | 'USD' = displayCurrency): string => {
    const roundedAmount = Math.round(amount)
    
    if (currency === 'UGX') {
      if (roundedAmount >= 1e12) {
        return `UGX ${(roundedAmount / 1e12).toFixed(1)}T`
      } else if (roundedAmount >= 1e9) {
        return `UGX ${(roundedAmount / 1e9).toFixed(1)}B`
      } else if (roundedAmount >= 1e6) {
        return `UGX ${(roundedAmount / 1e6).toFixed(1)}M`
      } else if (roundedAmount >= 1e3) {
        return `UGX ${(roundedAmount / 1e3).toFixed(1)}K`
      } else {
        return `UGX ${roundedAmount.toLocaleString()}`
      }
    } else {
      if (roundedAmount >= 1e12) {
        return `$${(roundedAmount / 1e12).toFixed(1)}T`
      } else if (roundedAmount >= 1e9) {
        return `$${(roundedAmount / 1e9).toFixed(1)}B`
      } else if (roundedAmount >= 1e6) {
        return `$${(roundedAmount / 1e6).toFixed(1)}M`
      } else if (roundedAmount >= 1e3) {
        return `$${(roundedAmount / 1e3).toFixed(1)}K`
      } else {
        return `$${roundedAmount.toLocaleString()}`
      }
    }
  }

  const getConvertedAmount = (amount: number, fromCurrency: 'UGX' | 'USD', toCurrency: 'UGX' | 'USD'): number => {
    if (fromCurrency === toCurrency) return amount
    if (fromCurrency === 'USD' && toCurrency === 'UGX') return convertToUGX(amount)
    if (fromCurrency === 'UGX' && toCurrency === 'USD') return convertToUSD(amount)
    return amount
  }

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

  // Generate coupon schedule for a bond starting from maturity date
  const generateCouponSchedule = (bond: Bond, amount: number): PayoutScheduleItem[] => {
    const schedule: PayoutScheduleItem[] = []
    const today = new Date()
    const maturityDate = new Date(bond.maturity_date)
    
    // Start from maturity date and work backwards to find all possible coupon dates
    let currentDate = new Date(maturityDate)
    const allCouponDates: Date[] = []
    
    // Generate all possible coupon dates by stepping back 182 days from maturity
    // Continue until we go far enough back to ensure we capture all future dates
    const maxIterations = 50 // Safety limit to prevent infinite loops
    let iterations = 0
    
    while (iterations < maxIterations) {
      allCouponDates.push(new Date(currentDate))
      currentDate = new Date(currentDate.getTime() - (182 * 24 * 60 * 60 * 1000))
      iterations++
      
      // Stop if we've gone too far back (more than 20 years)
      const yearsBack = (maturityDate.getTime() - currentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (yearsBack > 20) break
    }
    
    // Filter to only include future dates (dates >= today)
    const futureCouponDates = allCouponDates.filter(date => date >= today)
    
    // Sort in ascending order (oldest to newest)
    futureCouponDates.sort((a, b) => a.getTime() - b.getTime())
    
    // Create schedule items
    futureCouponDates.forEach((date, index) => {
      const isLastPayment = index === futureCouponDates.length - 1
      const isMaturity = isLastPayment
      
      let payoutAmount: number
      if (isMaturity) {
        // Maturity payment: principal + final coupon
        payoutAmount = amount + (amount * bond.coupon_rate / 100 / 2)
      } else {
        // Regular coupon payment
        payoutAmount = amount * bond.coupon_rate / 100 / 2
      }
      
      schedule.push({
        paymentDate: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        couponRate: bond.coupon_rate,
        status: 'Upcoming',
        payoutAmount,
        bondId: bond.id,
        bondName: bond.display_name,
        country: bond.country,
        isMaturity
      })
    })
    
    return schedule
  }

  // Calculate payout schedule based on selected bonds
  useEffect(() => {
    if (!showSchedule || selectedBonds.length === 0) {
      setPayoutSchedule([])
      return
    }

    const calculatePayoutSchedule = () => {
      setLoading(true)
      
      try {
        const allSchedules: PayoutScheduleItem[] = []
        
        // Generate coupon schedule for each selected bond
        selectedBonds.forEach(selectedBond => {
          const bondSchedule = generateCouponSchedule(selectedBond.bond, selectedBond.amount)
          allSchedules.push(...bondSchedule)
        })
        
        // Sort by payment date (ascending)
        allSchedules.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
        
        setPayoutSchedule(allSchedules)
      } catch (error) {
        logger.error('Error calculating payout schedule:', error)
      } finally {
        setLoading(false)
      }
    }

    calculatePayoutSchedule()
  }, [selectedBonds, showSchedule])

  // Fetch currency rate on component mount
  useEffect(() => {
    fetchCurrencyRate()
  }, [])



  if (!showSchedule || selectedBonds.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Calendar className="h-4 w-4 mr-2" />
            Payout Schedule
          </CardTitle>
          <CardDescription className="text-sm">
            Expected coupon payments and maturity dates
          </CardDescription>
          
          {/* Currency Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <Label htmlFor="currency-toggle" className="text-xs">Currency:</Label>
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={displayCurrency === 'UGX' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setDisplayCurrency('UGX')}
              >
                UGX
              </Button>
              <Button
                variant={displayCurrency === 'USD' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setDisplayCurrency('USD')}
              >
                USD
              </Button>
            </div>
            {isLoadingRate && (
              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
            )}
            {currencyError && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currencyError}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={fetchCurrencyRate}
              disabled={isLoadingRate}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : payoutSchedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payout schedule available</p>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-hidden">
              <div className="overflow-y-auto max-h-[40vh]">
                <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow className="border-b h-8">
                    <TableHead className="p-2 text-xs font-medium">Payment Date</TableHead>
                    <TableHead className="p-2 text-xs font-medium">Coupon Rate</TableHead>
                    <TableHead className="p-2 text-xs font-medium">Status</TableHead>
                    <TableHead className="p-2 text-xs font-medium">Bond</TableHead>
                    <TableHead className="p-2 text-xs font-medium text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutSchedule.map((scheduleItem, index) => (
                    <motion.tr
                      key={`${scheduleItem.bondId}-${scheduleItem.paymentDate}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-gray-50 transition-colors h-10"
                    >
                      <TableCell className="p-2">
                        <div className="text-xs font-medium">
                          {scheduleItem.paymentDate}
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="text-xs font-medium">
                          {scheduleItem.couponRate}%
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge 
                          variant={scheduleItem.status === 'Upcoming' ? "default" : "secondary"}
                          className="text-xs px-2 py-0 h-5"
                        >
                          {scheduleItem.isMaturity ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Maturity
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3 mr-1" />
                              {scheduleItem.status}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="text-xs font-medium truncate max-w-32">
                          {scheduleItem.bondName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {scheduleItem.country}
                        </div>
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <div className="text-xs font-semibold text-green-600">
                          {formatCurrency(
                            getConvertedAmount(scheduleItem.payoutAmount, 'USD', displayCurrency)
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
                </Table>
              </div>
              
              {/* Summary Footer */}
              <div className="border-t bg-gray-50 p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold">Total Expected Payouts:</span>
                    <p className="text-xs text-muted-foreground">
                      {payoutSchedule.length} payment{payoutSchedule.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(
                        getConvertedAmount(
                          payoutSchedule.reduce((total, item) => total + item.payoutAmount, 0),
                          'USD',
                          displayCurrency
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
