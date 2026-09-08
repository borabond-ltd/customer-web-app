'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, DollarSign, Calendar, TrendingUp, MapPin, CheckCircle, Search, Filter, Eye, Coins, Clock, Building2, Info, RefreshCw, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import ProtectedRoute from '@/components/protected-route'
import { PayoutScheduleTable } from '@/components/investment/payout-schedule-table'

import { logger } from '@/lib/logger'
interface Bond {
  id: string
  instrument_code: string
  display_name: string
  country: string
  currency: string
  maturity_date: string
  tenor: number
  coupon_rate: number
  bid_yield: number
  offer_yield: number
  available_amount: number
  is_active: boolean
  price_update_date: string
  ISIN: string
  withholding_tax: number
}

interface SelectedBond {
  bond: Bond
  amount: number
}

export default function AvailableBondsPage() {
  const router = useRouter()
  const [bonds, setBonds] = useState<Bond[]>([])
  const [filteredBonds, setFilteredBonds] = useState<Bond[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBond, setSelectedBond] = useState<SelectedBond | null>(null)
  const [totalInvestmentAmount, setTotalInvestmentAmount] = useState<number>(0)
  const [showPayoutSchedule, setShowPayoutSchedule] = useState(false)
  const [investmentAmount, setInvestmentAmount] = useState<number | ''>('')
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false)
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('offer_yield')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [selectedBondForDetails, setSelectedBondForDetails] = useState<Bond | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  
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

  // Load available bonds
  useEffect(() => {
    const loadBonds = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await apiClient.getAvailableBonds({
          sortBy: 'offer_yield',
          sortOrder: 'desc',
          limit: 100
        })
        
        if (response.success) {
          const bondsData = (response as any).bonds || []
          setBonds(bondsData)
          setFilteredBonds(bondsData)
          
          // Extract unique countries
          const countries = [...new Set(bondsData.map((bond: Bond) => bond.country))].sort() as string[]
          setAvailableCountries(countries)
          
          // Set last updated timestamp
          if (bondsData.length > 0) {
            const latestUpdate = bondsData.reduce((latest: string, bond: Bond) => {
              return bond.price_update_date > latest ? bond.price_update_date : latest
            }, bondsData[0].price_update_date)
            setLastUpdated(latestUpdate)
          }
        } else {
          setError(response.message || 'Failed to load bonds')
          toast.error('Failed to load available bonds')
        }
      } catch (err) {
        logger.error('Error loading bonds:', err)
        setError('Failed to load bonds')
        toast.error('Failed to load available bonds')
      } finally {
        setLoading(false)
      }
    }

    loadBonds()
  }, [])

  // Fetch currency rate on component mount
  useEffect(() => {
    fetchCurrencyRate()
  }, [])

  // Filter and sort bonds
  useEffect(() => {
    let filtered = [...bonds]

    // Filter by country
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(bond => bond.country === selectedCountry)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(bond => 
        bond.display_name.toLowerCase().includes(term) ||
        bond.instrument_code.toLowerCase().includes(term) ||
        bond.country.toLowerCase().includes(term)
      )
    }

    // Sort bonds
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Bond]
      let bValue: any = b[sortBy as keyof Bond]

      // Handle date sorting
      if (sortBy === 'maturity_date' || sortBy === 'price_update_date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return 0
    })

    setFilteredBonds(filtered)
  }, [bonds, selectedCountry, searchTerm, sortBy, sortOrder])

  const handleBondSelection = (bond: Bond, isSelected: boolean) => {
    if (isSelected) {
      // Select this bond (replacing any previously selected bond)
      const amount = typeof investmentAmount === 'number' ? investmentAmount : 0
      setSelectedBond({ bond, amount })
    } else {
      // Deselect the bond
      setSelectedBond(null)
    }
  }

  // Update bond amount when investment amount changes
  useEffect(() => {
    const amount = typeof investmentAmount === 'number' ? investmentAmount : 0
    if (amount > 0 && selectedBond) {
      setSelectedBond(prev => prev ? { ...prev, amount } : null)
    }
  }, [investmentAmount])

  const calculateTotalAmount = () => {
    // Convert investment amount from USD to display currency
    const amount = typeof investmentAmount === 'number' ? investmentAmount : 0
    return getConvertedAmount(amount, 'USD', displayCurrency)
  }

  // Calculate total payout every 6 months
  const calculateSixMonthPayout = () => {
    if (!selectedBond) return 0
    
    // Convert USD amount to UGX for calculation
    const amountInUGX = convertToUGX(selectedBond.amount)
    const annualCoupon = amountInUGX * (selectedBond.bond.coupon_rate / 100)
    const sixMonthPayout = annualCoupon / 2 // Semi-annual payments
    
    // Convert to display currency
    return getConvertedAmount(sixMonthPayout, 'UGX', displayCurrency)
  }

  // Calculate total expected amount at maturity using the same logic as Payout Schedule
  const calculateTotalExpectedAmount = () => {
    if (!selectedBond) return 0
    
    // Use the same coupon schedule logic as PayoutScheduleTable
    const today = new Date()
    const maturityDate = new Date(selectedBond.bond.maturity_date)
    
    // Generate all possible coupon dates by stepping back 182 days from maturity
    let currentDate = new Date(maturityDate)
    const allCouponDates: Date[] = []
    
    const maxIterations = 50
    let iterations = 0
    
    while (iterations < maxIterations) {
      allCouponDates.push(new Date(currentDate))
      currentDate = new Date(currentDate.getTime() - (182 * 24 * 60 * 60 * 1000))
      iterations++
      
      const yearsBack = (maturityDate.getTime() - currentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (yearsBack > 20) break
    }
    
    // Filter to only include future dates (dates >= today)
    const futureCouponDates = allCouponDates.filter(date => date >= today)
    
    // Sort in ascending order (oldest to newest)
    futureCouponDates.sort((a, b) => a.getTime() - b.getTime())
    
    // Calculate total expected payouts using the same logic as PayoutScheduleTable
    let totalExpectedPayouts = 0
    
    futureCouponDates.forEach((date, index) => {
      const isLastPayment = index === futureCouponDates.length - 1
      const isMaturity = isLastPayment
      
      let payoutAmount: number
      if (isMaturity) {
        // Maturity payment: principal + final coupon
        payoutAmount = selectedBond.amount + (selectedBond.amount * selectedBond.bond.coupon_rate / 100 / 2)
      } else {
        // Regular coupon payment
        payoutAmount = selectedBond.amount * selectedBond.bond.coupon_rate / 100 / 2
      }
      
      totalExpectedPayouts += payoutAmount
    })
    
    // Convert to display currency
    return getConvertedAmount(totalExpectedPayouts, 'USD', displayCurrency)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedBond) {
      toast.error('Please select a bond')
      return
    }

    const amount = typeof investmentAmount === 'number' ? investmentAmount : 0
    if (amount <= 0) {
      toast.error('Please enter a valid investment amount')
      return
    }

    setIsConfirmingPurchase(true)

    try {
      // Prepare purchase data
      const purchaseData = {
        amount: amount,
        bondData: [{
          bondId: selectedBond.bond.id,
          amount: selectedBond.amount,
          display_name: selectedBond.bond.display_name,
          name: selectedBond.bond.display_name
        }]
      }

      logger.log('Confirming purchase with data:', purchaseData)

      // Call purchase confirmation API
      const response = await apiClient.confirmPurchase(purchaseData)
      
      if (response.success) {
        toast.success('Purchase confirmed! Funding initiated and confirmation email sent.')
        logger.log('Purchase confirmed:', response.data)
        
        // Redirect to transactions page after successful purchase
        setTimeout(() => {
          router.push('/dashboard/transactions')
        }, 1500) // Small delay to show the success toast
      } else {
        toast.error(response.message || 'Failed to confirm purchase')
      }
    } catch (error) {
      logger.error('Error confirming purchase:', error)
      toast.error('Failed to confirm purchase. Please try again.')
    } finally {
      setIsConfirmingPurchase(false)
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isBondSelected = (bondId: string) => {
    return selectedBond?.bond.id === bondId
  }

  // Bond Details Modal Component
  const BondDetailsModal = ({ bond }: { bond: Bond }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {bond.display_name}
          </DialogTitle>
          <DialogDescription>
            Detailed information for {bond.instrument_code}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Country:</span>
                  <Badge variant="outline">{bond.country}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Currency:</span>
                  <span className="text-sm font-medium">{bond.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tenor:</span>
                  <span className="text-sm font-medium">{bond.tenor} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={bond.is_active ? "default" : "secondary"}>
                    {bond.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coupon Rate:</span>
                  <span className="text-sm font-medium text-green-600">{bond.coupon_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bid Yield:</span>
                  <span className="text-sm font-medium">{bond.bid_yield}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Offer Yield:</span>
                  <span className="text-sm font-medium text-green-600">{bond.offer_yield}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Available Amount:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(
                      getConvertedAmount(bond.available_amount, bond.currency as 'UGX' | 'USD', displayCurrency)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dates and Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maturity Date:</span>
                  <span className="text-sm font-medium">
                    {formatDate(bond.maturity_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price Update:</span>
                  <span className="text-sm font-medium">
                    {formatDate(bond.price_update_date)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bond.ISIN && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ISIN:</span>
                    <span className="text-sm font-medium font-mono">{bond.ISIN}</span>
                  </div>
                )}
                {bond.withholding_tax !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Withholding Tax:</span>
                    <span className="text-sm font-medium">{(bond.withholding_tax * 100).toFixed(1)}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4 py-6">
          {/* Simple Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Available Bonds
                </h1>
                {lastUpdated && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last updated: {formatDate(lastUpdated)}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-sm">
                {filteredBonds.length} of {bonds.length} bonds
              </Badge>
            </div>
          </div>

          {/* Professional Side-by-Side Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 items-stretch">
            {/* Investment Amount - Takes 1/3 of the space */}
            <div className="xl:col-span-1 flex">
              <Card className="rounded-2xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    <Label htmlFor="investment-amount" className="text-sm font-medium">
                      Investment Amount (USD)
                    </Label>
                    <Input
                      id="investment-amount"
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount (e.g., 5000)"
                      min="100"
                      step="100"
                    />
                    {selectedBond && typeof investmentAmount === 'number' && investmentAmount > 0 && (
                      <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="font-medium text-green-600 dark:text-green-400">
                          ${investmentAmount.toLocaleString()} for selected bond
                        </div>
                        <div className="text-xs">
                          1 bond selected
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters - Takes 2/3 of the space */}
            <div className="xl:col-span-2 flex">
              <Card className="rounded-2xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search bonds by name, code, or country..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Country Filter */}
                      <div>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Countries</SelectItem>
                            {availableCountries.map(country => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Sort By */}
                      <div>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="offer_yield">Offer Yield</SelectItem>
                            <SelectItem value="coupon_rate">Coupon Rate</SelectItem>
                            <SelectItem value="maturity_date">Maturity Date</SelectItem>
                            <SelectItem value="available_amount">Available Amount</SelectItem>
                            <SelectItem value="display_name">Bond Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Sort Order */}
                      <div>
                        <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">High to Low</SelectItem>
                            <SelectItem value="asc">Low to High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bonds Table - Responsive */}
            <div className="lg:col-span-2">
              <Card className="rounded-2xl shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Available Bonds</h2>
                  <p className="text-sm text-muted-foreground">Select bonds for your investment portfolio</p>
                </div>
                <CardContent className="p-0 max-h-[60vh] overflow-hidden">
                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-6 text-center">
                      <p className="text-red-500 mb-4">{error}</p>
                      <Button 
                        onClick={() => window.location.reload()} 
                        size="sm"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : filteredBonds.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Coins className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No bonds found
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {searchTerm || selectedCountry !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'No bonds are currently available'
                        }
                      </p>
                      {(searchTerm || selectedCountry !== 'all') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSearchTerm('')
                            setSelectedCountry('all')
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      {/* Desktop Table View - Ultra Compact */}
                      <div className="h-full overflow-y-auto">
                        <Table className="hidden lg:table">
                        <TableHeader>
                          <TableRow className="border-b h-8">
                            <TableHead className="w-8 p-1"></TableHead>
                            <TableHead className="p-1 text-xs font-medium">Bond</TableHead>
                            <TableHead className="p-1 text-xs font-medium">Country</TableHead>
                            <TableHead className="p-1 text-xs font-medium">Coupon</TableHead>
                            <TableHead className="p-1 text-xs font-medium">Maturity</TableHead>
                            <TableHead className="p-1 text-xs font-medium">Yield</TableHead>
                            <TableHead className="p-1 text-xs font-medium">Amount</TableHead>
                            <TableHead className="w-12 p-1 text-xs font-medium">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBonds.map((bond) => (
                            <motion.tr
                              key={bond.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`border-b hover:bg-gray-50 transition-colors h-10 ${
                                isBondSelected(bond.id) ? 'bg-green-50' : ''
                              }`}
                            >
                              <TableCell className="p-1">
                                <Checkbox
                                  checked={isBondSelected(bond.id)}
                                  onCheckedChange={(checked) => 
                                    handleBondSelection(bond, checked as boolean)
                                  }
                                  className="h-4 w-4"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <div>
                                  <div className="font-medium text-xs leading-tight">{bond.display_name}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-32">{bond.instrument_code}</div>
                                </div>
                              </TableCell>
                              <TableCell className="p-1">
                                <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                  {bond.country}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-1 text-xs font-medium">
                                {bond.coupon_rate}%
                              </TableCell>
                              <TableCell className="p-1 text-xs">
                                {new Date(bond.maturity_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  year: '2-digit' 
                                })}
                              </TableCell>
                              <TableCell className="p-1 text-xs font-medium text-green-600">
                                {bond.offer_yield}%
                              </TableCell>
                              <TableCell className="p-1 text-xs">
                                {isBondSelected(bond.id) && typeof investmentAmount === 'number' && investmentAmount > 0 ? (
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(
                                      getConvertedAmount(investmentAmount, 'USD', displayCurrency)
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="p-1">
                                <BondDetailsModal bond={bond} />
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                        </Table>
                      </div>

                      {/* Tablet View - Compact Cards */}
                      <div className="hidden md:block lg:hidden h-full overflow-y-auto p-3">
                        <div className="grid grid-cols-1 gap-2">
                          {filteredBonds.map((bond) => (
                            <motion.div
                              key={bond.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`border rounded-lg p-2 transition-all ${
                                isBondSelected(bond.id) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Checkbox
                                    checked={isBondSelected(bond.id)}
                                    onCheckedChange={(checked) => 
                                      handleBondSelection(bond, checked as boolean)
                                    }
                                    className="h-4 w-4"
                                  />
                                  <div>
                                    <h3 className="font-medium text-sm">{bond.display_name}</h3>
                                    <p className="text-xs text-muted-foreground">{bond.instrument_code}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 text-xs">
                                  <Badge variant="outline" className="text-xs px-2 py-0">
                                    {bond.country}
                                  </Badge>
                                  <div className="text-right">
                                    <div className="font-medium">{bond.coupon_rate}% • {bond.offer_yield}%</div>
                                    <div className="text-muted-foreground">
                                      {new Date(bond.maturity_date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        year: '2-digit' 
                                      })}
                                    </div>
                                  </div>
                                  <div className="text-right min-w-20">
                                    {isBondSelected(bond.id) && typeof investmentAmount === 'number' && investmentAmount > 0 ? (
                                      <span className="font-medium text-green-600 text-xs">
                                        {formatCurrency(
                                          getConvertedAmount(investmentAmount, 'USD', displayCurrency)
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile Card View - Ultra Compact */}
                      <div className="md:hidden h-full overflow-y-auto p-2 space-y-2">
                        {filteredBonds.map((bond) => (
                          <motion.div
                            key={bond.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`border rounded-lg p-2 transition-all ${
                              isBondSelected(bond.id) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1">
                                <Checkbox
                                  checked={isBondSelected(bond.id)}
                                  onCheckedChange={(checked) => 
                                    handleBondSelection(bond, checked as boolean)
                                  }
                                  className="h-4 w-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm truncate">{bond.display_name}</h3>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                      {bond.country}
                                    </Badge>
                                    <span>{bond.coupon_rate}%</span>
                                    <span>•</span>
                                    <span className="text-green-600 font-medium">{bond.offer_yield}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(bond.maturity_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    year: '2-digit' 
                                  })}
                                </div>
                                {isBondSelected(bond.id) && typeof investmentAmount === 'number' && investmentAmount > 0 ? (
                                  <div className="font-medium text-green-600 text-xs">
                                    {formatCurrency(
                                      getConvertedAmount(investmentAmount, 'USD', displayCurrency)
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-xs">-</div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary and Disclaimer */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              {/* Summary Card */}
              <Card className="rounded-2xl shadow-sm sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Summary</CardTitle>
                  
                  {/* Currency Toggle */}
                  <div className="flex items-center gap-2 mt-2">
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
                <CardContent className="space-y-4">
                  {!selectedBond ? (
                    <div className="text-center py-6">
                      <div className="text-muted-foreground text-sm">
                        No bond selected
                      </div>
                    </div>
                  ) : (typeof investmentAmount === 'number' ? investmentAmount : 0) <= 0 ? (
                    <div className="text-center py-6">
                      <div className="text-muted-foreground text-sm">
                        Enter investment amount
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Selected Bond */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <div className="border rounded-lg p-2">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-xs">{selectedBond.bond.display_name}</h4>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {selectedBond.bond.country}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>{selectedBond.bond.coupon_rate}% • {selectedBond.bond.offer_yield}% yield</div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(
                                getConvertedAmount(selectedBond.amount, 'USD', displayCurrency)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Summary Information */}
                      <div className="border-t pt-3 space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">Total Investment:</span>
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(calculateTotalAmount())}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Payout Every 6 Months:</span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(calculateSixMonthPayout())}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Payouts (Principal + Interest):</span>
                            <span className="font-semibold text-purple-600">
                              {formatCurrency(calculateTotalExpectedAmount())}
                            </span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleConfirmPurchase}
                          className="w-full"
                          disabled={!selectedBond || (typeof investmentAmount === 'number' ? investmentAmount : 0) <= 0 || isConfirmingPurchase}
                          size="sm"
                        >
                          {isConfirmingPurchase ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Important Disclaimer Card */}
              <Card className="rounded-xl shadow-sm border-yellow-200 bg-yellow-50">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Info className="h-3 w-3 text-yellow-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-1">Important Disclaimer</h4>
                      <p className="text-xs text-yellow-700 leading-relaxed">
                        Payouts are illustrative and assume fixed annual yields for display purposes. Actual results may vary based on bond prices and FX rates at the time of purchase. Figures are shown before fees and taxes. USD values reflect current FX rates for display only. Past performance does not guarantee future results.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Compact Payout Schedule */}
          {selectedBond && typeof investmentAmount === 'number' && investmentAmount > 0 && (
            <div className="mt-4">
              {/* Scroll Indicator */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-blue-700">
                  <div className="animate-bounce">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Scroll down to view detailed payout schedule</span>
                  <div className="animate-bounce">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <PayoutScheduleTable 
                selectedBonds={[selectedBond]}
                showSchedule={true}
              />
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
