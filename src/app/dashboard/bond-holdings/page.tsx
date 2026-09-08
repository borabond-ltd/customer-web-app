'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Layout } from '@/components/layout'
import ProtectedRoute from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Globe, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
  TrendingDown
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { SellBondDialog } from '@/components/bonds/sell-bond-dialog'
import { SoldBondsSection } from '@/components/bonds/sold-bonds-section'
import { UpcomingCouponCard } from '@/components/investment/UpcomingCouponCard'

import { logger } from '@/lib/logger'

interface CouponSchedule {
  id: string
  purchase_id: string
  payment_number: number
  payment_date: string
  gross_income?: number | string | null
  net_income?: number | string | null
  is_final_payment: boolean
  coupon_action?: 'withdraw' | 'reinvest' | null
  coupon_action_at?: string | null
}

interface BondHolding {
  id: string
  user_profile_id: string
  available_bond_id: string
  maturity_date: string
  coupon_frequency: number
  coupon_interval_days: number
  amount: number
  gross_income: number
  net_income: number
  next_coupon_date: string | null
  country: string
  withholding_tax: number
  created_at: string
  updated_at: string
  coupon_action?: 'withdraw' | 'reinvest' | null
  coupon_action_at?: string | null
  coupon_schedule_id?: string | null
  coupon_payment_number?: number | null
  coupon_schedule_gross_income?: number | null
  coupon_schedule_net_income?: number | null
  coupon_schedule_is_final_payment?: boolean | null
  available_bonds?: {
    display_name?: string
    name?: string
  }
  coupon_schedules?: CouponSchedule[]
}

interface BondHoldingsResponse {
  success: boolean
  bonds: BondHolding[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function BondHoldingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  
  // State management
  const [bondHoldings, setBondHoldings] = useState<BondHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBond, setSelectedBond] = useState<BondHolding | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Sell bond state
  const [showSellDialog, setShowSellDialog] = useState(false)
  const [bondToSell, setBondToSell] = useState<BondHolding | null>(null)
  const [sellingBonds, setSellingBonds] = useState<Set<string>>(new Set())
  const [soldAvailableBondIds, setSoldAvailableBondIds] = useState<Set<string>>(new Set())
  const [soldBondIds, setSoldBondIds] = useState<Set<string>>(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBonds, setTotalBonds] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'amount' | 'maturity_date' | 'net_income'>('maturity_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load bond holdings
  const loadBondHoldings = async (page: number = 1) => {
    if (!user?.user_id) return
    
    try {
      setLoading(true)
      setError(null)
      
      logger.log('Loading bond holdings for user:', user.user_id, 'page:', page)
      
      const response = await apiClient.getBondPurchases(user.user_id, page, pageSize)
      
      if (response.success) {
        // Handle both cases: response.data (if wrapped) or response directly
        const data = (response as any).data || (response as unknown as BondHoldingsResponse)
        setBondHoldings(data.bonds || [])
        setCurrentPage(data.pagination?.page || 1)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalBonds(data.pagination?.total || 0)
        
        logger.log('Bond holdings loaded:', data.bonds?.length || 0, 'bonds')
      } else {
        throw new Error(response.error || 'Failed to load bond holdings')
      }
    } catch (err) {
      logger.error('Error loading bond holdings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bond holdings')
      toast.error('Failed to load bond holdings')
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      loadBondHoldings(currentPage)
      loadSoldBonds()
    }
  }, [isAuthenticated, user?.user_id, currentPage, pageSize])

  // Load sold bonds to disable Sell button for already sold/in-progress items
  const loadSoldBonds = async () => {
    try {
      if (!user?.user_id) return
      const response = await apiClient.getSoldBonds(1, 200)
      if ((response as any).success) {
        const payload = (response as any)
        const list = (payload.data || payload.soldBonds || payload.bonds || payload) as Array<{
          available_bond_id?: string
          bond_id?: string
          status?: string
        }> | any

        if (Array.isArray(list)) {
          const byAvailableId = new Set<string>()
          const byBondId = new Set<string>()
          for (const item of list) {
            if (item?.status && item.status !== 'cancelled') {
              if (item.available_bond_id) byAvailableId.add(String(item.available_bond_id))
              if (item.bond_id) byBondId.add(String(item.bond_id))
            }
          }
          setSoldAvailableBondIds(byAvailableId)
          setSoldBondIds(byBondId)
        }
      }
    } catch (e) {
      // Silent fail; do not block page
      logger.warn('Failed to load sold bonds list')
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadBondHoldings(page)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1)
    loadBondHoldings(1)
  }

  // Filter and sort bonds
  const filteredAndSortedBonds = bondHoldings
    .filter(bond => {
      const matchesSearch = searchTerm === '' || 
        bond.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bond.available_bond_id.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCountry = countryFilter === 'all' || bond.country === countryFilter
      
      return matchesSearch && matchesCountry
    })
    .sort((a, b) => {
      let aValue: number | string
      let bValue: number | string
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'net_income':
          aValue = a.net_income
          bValue = b.net_income
          break
        case 'maturity_date':
          aValue = new Date(a.maturity_date).getTime()
          bValue = new Date(b.maturity_date).getTime()
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  // Format currency
  const formatCurrency = (amount: number) => {
    return 'UGX ' + new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return '—'
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

const toNumberOrNull = (value?: number | string | null) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

  // Get unique countries for filter
  const uniqueCountries = Array.from(new Set(bondHoldings.map(bond => bond.country)))

  // Check if next coupon date is upcoming (within 30 days)
  const isUpcomingCoupon = (dateString?: string | null) => {
    if (!dateString) return false
    const nextCouponDate = new Date(dateString)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    return nextCouponDate >= today && nextCouponDate <= thirtyDaysFromNow
  }

  // Upcoming coupons list (within 30 days) - exclude bonds that already have an action set
  const upcomingCouponBonds = bondHoldings
    .filter(bond => 
      bond.next_coupon_date && 
      isUpcomingCoupon(bond.next_coupon_date) &&
      !bond.coupon_action // Only show bonds without a coupon action set
    )
    .sort((a, b) => new Date(a.next_coupon_date).getTime() - new Date(b.next_coupon_date).getTime())

  // Check if coupon action window has expired (coupon date has passed)
  const isCouponExpired = (couponDate?: string | null) => {
    if (!couponDate) return false
    const couponDateObj = new Date(couponDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return couponDateObj < today
  }

  // Coupon action submission state
  const [couponSubmitting, setCouponSubmitting] = useState<Set<string>>(new Set())

  const handleCouponAction = async (bond: BondHolding, action: 'withdraw' | 'reinvest') => {
    try {
      if (!user?.user_id) return
      setCouponSubmitting(prev => new Set(prev).add(bond.id))
      const res = await apiClient.submitCouponAction(bond.id, action)
      if ((res as any).success) {
        toast.success(`Preference saved: ${action === 'withdraw' ? 'Withdraw' : 'Reinvest'}`)
        // Update local state - bond will automatically disappear from upcoming coupons table due to filter
        setBondHoldings(prev => prev.map(b => b.id === bond.id ? { ...b, coupon_action: action, coupon_action_at: new Date().toISOString() } : b))
      } else {
        toast.error((res as any).message || 'Failed to save preference')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save preference')
    } finally {
      setCouponSubmitting(prev => { const n = new Set(prev); n.delete(bond.id); return n })
    }
  }

  // Handle bond detail view
  const handleViewDetails = (bond: BondHolding) => {
    setSelectedBond(bond)
    setShowDetailModal(true)
  }

  // Handle sell bond
  const handleSellBond = (bond: BondHolding) => {
    setBondToSell(bond)
    setShowSellDialog(true)
  }

  // Handle sell bond confirmation
  const handleSellBondConfirm = async (bondId: string, sellAmount: number) => {
    try {
      // Add bond to selling set
      setSellingBonds(prev => new Set(prev).add(bondId))
      
      const response = await apiClient.sellBond(bondId, sellAmount)
      
      if (response.success) {
        toast.success('Bond sale request submitted successfully!')
        // Refresh bond holdings to update the UI
        await loadBondHoldings(currentPage)
        await loadSoldBonds()
      } else {
        throw new Error(response.error || 'Failed to submit bond sale request')
      }
    } catch (err) {
      logger.error('Error selling bond:', err)
      
      // Check if it's a token expiration error
      if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
        toast.error('Your session has expired. Please try again.')
        // The API client should have already attempted token refresh
        // If it still fails, the auth context will handle redirecting to login
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to submit bond sale request')
      }
    } finally {
      // Remove bond from selling set
      setSellingBonds(prev => {
        const newSet = new Set(prev)
        newSet.delete(bondId)
        return newSet
      })
    }
  }

  if (authLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bond Holdings</h1>
                <p className="text-gray-600 mt-1">
                  View and manage your bond investment portfolio
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                {totalBonds} Total Bonds
              </Badge>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search & Filter</CardTitle>
              <CardDescription>
                Find specific bonds or filter by criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by country or bond ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Country Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maturity_date">Maturity Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="net_income">Net Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Coupon - Table */}
          {!loading && upcomingCouponBonds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Coupon</CardTitle>
                <CardDescription>Choose how to handle your upcoming coupon payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bond</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingCouponBonds.map((bond) => {
                        const expired = isCouponExpired(bond.next_coupon_date)
                        const submitting = couponSubmitting.has(bond.id)
                        // Disable if submitting, expired, or already has an action (shouldn't happen due to filter, but safety check)
                        const disabled = submitting || expired || !!bond.coupon_action
                        const bondDisplayName = bond.available_bonds?.display_name || bond.available_bonds?.name || `Bond ${bond.available_bond_id}`
                        return (
                          <TableRow key={bond.id}>
                            <TableCell className="font-medium">{bondDisplayName}</TableCell>
                            <TableCell>{formatDate(bond.next_coupon_date)}</TableCell>
                            <TableCell className="text-green-600 font-medium">{formatCurrency(bond.net_income)}</TableCell>
                            <TableCell>
                              {expired ? (
                                <Badge variant="outline" className="text-xs">Closed</Badge>
                              ) : submitting ? (
                                <Badge variant="secondary" className="text-xs">Processing...</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Pending</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  disabled={disabled} 
                                  onClick={() => handleCouponAction(bond, 'withdraw')}
                                >
                                  {submitting ? 'Saving...' : 'Withdraw'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  disabled={disabled} 
                                  onClick={() => handleCouponAction(bond, 'reinvest')}
                                >
                                  {submitting ? 'Saving...' : 'Reinvest'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => loadBondHoldings(currentPage)}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bond Holdings Table */}
          {!loading && !error && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Your Bond Holdings</span>
                </CardTitle>
                <CardDescription>
                  Showing {filteredAndSortedBonds.length} of {totalBonds} bonds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAndSortedBonds.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Bond Holdings Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || countryFilter !== 'all' 
                        ? 'No bonds match your current search criteria.'
                        : 'You don\'t have any bond holdings yet.'
                      }
                    </p>
                    {searchTerm || countryFilter !== 'all' ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('')
                          setCountryFilter('all')
                        }}
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <Button onClick={() => router.push('/dashboard')}>
                        Explore Investment Options
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Net Income</TableHead>
                          <TableHead>Gross Income</TableHead>
                          <TableHead>Next Coupon</TableHead>
                          <TableHead>Maturity Date</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedBonds.map((bond) => (
                          <TableRow key={bond.id}>
                            <TableCell className="font-medium">
                              {formatCurrency(bond.amount)}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {formatCurrency(bond.net_income)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(bond.gross_income)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span>{formatDate(bond.next_coupon_date)}</span>
                                {isUpcomingCoupon(bond.next_coupon_date) && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Upcoming
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(bond.maturity_date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span>{bond.country}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {bond.coupon_frequency}x/year
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(bond)}
                                  className="flex items-center space-x-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Details</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSellBond(bond)}
                                  disabled={
                                    sellingBonds.has(bond.id) ||
                                    soldAvailableBondIds.has(bond.available_bond_id) ||
                                    soldBondIds.has(bond.id)
                                  }
                                  className={
                                    `flex items-center space-x-1 ` +
                                    ((sellingBonds.has(bond.id) || soldAvailableBondIds.has(bond.available_bond_id) || soldBondIds.has(bond.id))
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-orange-600 hover:text-orange-700')
                                  }
                                >
                                  <TrendingDown className="h-4 w-4" />
                                  <span>{(soldAvailableBondIds.has(bond.available_bond_id) || soldBondIds.has(bond.id)) ? 'Sell (Sold)' : 'Sell'}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalBonds)} of {totalBonds} bonds
                    </div>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sold Bonds Section */}
          {user?.user_id && (
            <SoldBondsSection userId={user.user_id} />
          )}

          {/* Bond Detail Modal */}
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>Bond Details</span>
                </DialogTitle>
                <DialogDescription>
                  Complete information about this bond holding
                </DialogDescription>
              </DialogHeader>
              
              {selectedBond && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bond ID</label>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                        {selectedBond.available_bond_id}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Country</label>
                      <p className="text-sm">{selectedBond.country}</p>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount</label>
                      <p className="text-lg font-semibold">{formatCurrency(selectedBond.amount)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gross Income</label>
                      <p className="text-lg font-semibold">{formatCurrency(selectedBond.gross_income)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Net Income</label>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(selectedBond.net_income)}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Maturity Date</label>
                      <p className="text-sm">{formatDate(selectedBond.maturity_date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Next Coupon Date</label>
                      <p className="text-sm">{formatDate(selectedBond.next_coupon_date)}</p>
                    </div>
                  </div>

                  {/* Bond Terms */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Coupon Frequency</label>
                      <p className="text-sm">{selectedBond.coupon_frequency} times per year</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Coupon Interval</label>
                      <p className="text-sm">{selectedBond.coupon_interval_days} days</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Withholding Tax</label>
                      <p className="text-sm">{(selectedBond.withholding_tax * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm">{formatDate(selectedBond.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-sm">{formatDate(selectedBond.updated_at)}</p>
                    </div>
                  </div>

                  {/* Coupon Schedule */}
                  {selectedBond.coupon_schedules && selectedBond.coupon_schedules.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Coupon Schedule</label>
                        <p className="text-xs text-muted-foreground">
                          Detailed schedule of expected coupon payments
                        </p>
                      </div>
                      <div className="overflow-hidden rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Payment #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Net Income</TableHead>
                              <TableHead>Final</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedBond.coupon_schedules.map(schedule => {
                              const scheduleNet = toNumberOrNull(schedule.net_income)
                              const scheduleAction = schedule.coupon_action || null
                              return (
                                <TableRow key={schedule.id || `${selectedBond.id}-${schedule.payment_number}`}>
                                  <TableCell className="font-mono text-sm">{schedule.payment_number}</TableCell>
                                  <TableCell>{formatDate(schedule.payment_date)}</TableCell>
                                  <TableCell className="text-sm font-medium text-green-600">
                                    {scheduleNet !== null ? formatCurrency(scheduleNet) : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {schedule.is_final_payment ? (
                                      <Badge variant="secondary" className="text-xs">Final</Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {scheduleAction ? (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {scheduleAction}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Sell Bond Dialog */}
          <SellBondDialog
            isOpen={showSellDialog}
            onClose={() => setShowSellDialog(false)}
            bond={bondToSell}
            onSell={handleSellBondConfirm}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
