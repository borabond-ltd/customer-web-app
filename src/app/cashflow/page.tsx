'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import { apiClient } from '@/lib/api-client'
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
  is_default_action?: boolean
}

interface BondHolding {
  id: string
  available_bond_id: string
  user_profile_id?: string
  amount?: number
  gross_income?: number | null
  net_income: number
  next_coupon_date: string | null
  maturity_date?: string | null
  coupon_frequency?: number | null
  coupon_interval_days?: number | null
  country?: string | null
  withholding_tax?: number | null
  created_at?: string | null
  updated_at?: string | null
  coupon_action?: 'withdraw' | 'reinvest' | null
  coupon_action_at?: string | null
  coupon_schedule_id?: string | null
  coupon_schedule_net_income?: number | string | null
  coupon_schedule_is_final_payment?: boolean | null
  available_bonds?: {
    display_name?: string
    name?: string
  }
  coupon_schedules?: CouponSchedule[]
}

const formatCurrency = (amount: number) => {
  return 'UGX ' + new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

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

const isUpcomingCoupon = (dateString?: string | null) => {
  if (!dateString) return false
  const nextCouponDate = new Date(dateString)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  return nextCouponDate >= today && nextCouponDate <= thirtyDaysFromNow
}

const isCouponExpired = (dateString?: string | null) => {
  if (!dateString) return false
  const couponDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return couponDate < today
}

const toNumberOrNull = (value?: number | string | null) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function CashFlowPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [bondHoldings, setBondHoldings] = useState<BondHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [couponSubmitting, setCouponSubmitting] = useState<Set<string>>(new Set())
  const [selectedBond, setSelectedBond] = useState<BondHolding | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [scheduleExpanded, setScheduleExpanded] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      return
    }

    const loadBondHoldings = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.getBondPurchases(user.user_id, 1, 100)

        if (response.success) {
          const payload = (response as any).data || response
          const bonds = payload.bonds || []
          setBondHoldings(bonds)
          logger.log('Cashflow upcoming coupons loaded:', bonds.length)
          
          // Debug: Log first bond's coupon schedules
          if (bonds.length > 0 && bonds[0].coupon_schedules) {
            logger.log('First bond coupon schedules:', bonds[0].coupon_schedules)
          }
        } else {
          throw new Error(response.error || 'Failed to load bond holdings')
        }
      } catch (err) {
        logger.error('Error loading cash flow data:', err)
        const message = err instanceof Error ? err.message : 'Failed to load cash flow data'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadBondHoldings()
  }, [isAuthenticated, user?.user_id])

  const upcomingCoupons = useMemo(() => {
    return bondHoldings
      .filter(bond =>
        bond.next_coupon_date &&
        isUpcomingCoupon(bond.next_coupon_date) &&
        !bond.coupon_action
      )
      .sort((a, b) => {
        const aDate = a.next_coupon_date ? new Date(a.next_coupon_date).getTime() : Infinity
        const bDate = b.next_coupon_date ? new Date(b.next_coupon_date).getTime() : Infinity
        return aDate - bDate
      })
  }, [bondHoldings])

  // Extract all past coupon payments from all bonds
  const pastCoupons = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const allPastCoupons: Array<{
      id: string
      bondId: string
      bondName: string
      paymentNumber: number
      paymentDate: string
      netIncome: number
      couponAction: 'withdraw' | 'reinvest' | null
      couponActionAt: string | null
      isFinalPayment: boolean
      isDefaultAction: boolean
    }> = []

    bondHoldings.forEach(bond => {
      if (Array.isArray(bond.coupon_schedules)) {
        bond.coupon_schedules.forEach(schedule => {
          const scheduleDate = new Date(schedule.payment_date)
          if (!Number.isNaN(scheduleDate.getTime()) && scheduleDate < today) {
            const pastCoupon = {
              id: schedule.id || `${bond.id}-${schedule.payment_number}`,
              bondId: bond.id,
              bondName: bond.available_bonds?.display_name || bond.available_bonds?.name || 'Unnamed Bond',
              paymentNumber: schedule.payment_number,
              paymentDate: schedule.payment_date,
              netIncome: toNumberOrNull(schedule.net_income) || 0,
              couponAction: schedule.coupon_action || null,
              couponActionAt: schedule.coupon_action_at || null,
              isFinalPayment: schedule.is_final_payment,
              isDefaultAction: schedule.is_default_action || false
            }
            
            // Debug logging for first past coupon
            if (allPastCoupons.length === 0) {
              console.log('[Cashflow] First past coupon:', pastCoupon)
              console.log('[Cashflow] Raw schedule data:', schedule)
            }
            
            allPastCoupons.push(pastCoupon)
          }
        })
      }
    })

    return allPastCoupons.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    )
  }, [bondHoldings])

  const handleCouponAction = async (bond: BondHolding, action: 'withdraw' | 'reinvest') => {
    try {
      if (!user?.user_id) return

      setCouponSubmitting(prev => new Set(prev).add(bond.id))
      const res = await apiClient.submitCouponAction(bond.id, action)
      if ((res as any).success) {
        toast.success(`Preference saved: ${action === 'withdraw' ? 'Withdraw' : 'Reinvest'}`)
        setBondHoldings(prev => prev.map(item => item.id === bond.id ? {
          ...item,
          coupon_action: action,
          coupon_action_at: new Date().toISOString()
        } : item))
      } else {
        toast.error((res as any).message || 'Failed to save preference')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save preference')
    } finally {
      setCouponSubmitting(prev => {
        const next = new Set(prev)
        next.delete(bond.id)
        return next
      })
    }
  }

  const handleViewDetails = (bond: BondHolding) => {
    setSelectedBond(bond)
    setShowDetailModal(true)
    setScheduleExpanded(false)
  }

  useEffect(() => {
    if (!showDetailModal) {
      setScheduleExpanded(false)
    }
  }, [showDetailModal])

  const exportToCSV = () => {
    if (!upcomingCoupons.length) return

    const csvContent = [
      ['Bond', 'Date', 'Amount', 'Status'],
      ...upcomingCoupons.map(item => {
        const amountValue = toNumberOrNull(item.coupon_schedule_net_income ?? item.net_income)
        return [
          item.available_bonds?.display_name || item.available_bonds?.name || `Bond ${item.available_bond_id}`,
          formatDate(item.next_coupon_date),
          amountValue !== null ? formatCurrency(amountValue) : '—',
          isCouponExpired(item.next_coupon_date) ? 'Closed' : 'Pending'
        ]
      })
    ]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'upcoming-coupons.csv'
    a.click()
    window.URL.revokeObjectURL(url)
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
    return null
  }

  return (
    <ProtectedRoute>
      <>
    <Layout>
      <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
                <h1 className="text-3xl font-bold text-gray-900"></h1>
                {/* <p className="text-gray-600">
                  Review and act on upcoming coupon payments
            </p> */}
          </div>
              <Button
                onClick={exportToCSV}
                className="flex items-center space-x-2"
                disabled={!upcomingCoupons.length}
              >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Coupon Payments Tabs */}
          {loading ? (
            // Loading Skeleton
            <div className="space-y-6">
              {/* Header Skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-11 w-full sm:w-64" />
              </div>

              {/* Table Skeleton */}
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 gap-4 pb-4 border-b">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                    {/* Table Rows */}
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-4 py-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Coupon Payments</h2>
                  <p className="text-muted-foreground mt-1">
                    Manage your bond coupon payment schedule
                  </p>
                </div>
                <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto">
                  <TabsTrigger 
                    value="upcoming" 
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <span className="text-base">⏰</span>
                    <span>Upcoming</span>
                    {upcomingCoupons.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-semibold">
                        {upcomingCoupons.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="past"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    <span className="text-base">✓</span>
                    <span>Past</span>
                    {pastCoupons.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-semibold">
                        {pastCoupons.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Upcoming Coupon Payments Tab */}
              <TabsContent value="upcoming" className="mt-0 space-y-4">
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    {upcomingCoupons.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📅</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Coupons</p>
                      <p className="text-sm text-gray-600">
                        Coupon payments will appear here when they are within 30 days
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="font-semibold">Bond</TableHead>
                            <TableHead className="font-semibold">Coupon Date</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingCoupons.map((bond, index) => {
                            const expired = isCouponExpired(bond.next_coupon_date)
                            const submitting = couponSubmitting.has(bond.id)
                            const disabled = submitting || expired || !!bond.coupon_action
                            const bondDisplayName = bond.available_bonds?.display_name || bond.available_bonds?.name || 'Unnamed Bond'
                            return (
                              <TableRow key={bond.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                                <TableCell className="font-medium">{bondDisplayName}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">📅</span>
                                    {formatDate(bond.next_coupon_date)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-green-600 font-semibold">
                                  {(() => {
                                    const value = toNumberOrNull(bond.coupon_schedule_net_income ?? bond.net_income)
                                    return value !== null ? formatCurrency(value) : '—'
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {expired ? (
                                    <Badge variant="destructive" className="text-xs">⏱️ Closed</Badge>
                                  ) : submitting ? (
                                    <Badge variant="secondary" className="text-xs">⏳ Processing...</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                      ⏰ Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewDetails(bond)}
                                      className="text-xs"
                                    >
                                      📋 Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={disabled}
                                      onClick={() => handleCouponAction(bond, 'withdraw')}
                                      className="text-xs bg-green-600 hover:bg-green-700"
                                    >
                                      {submitting ? 'Saving...' : '💰 Withdraw'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={disabled}
                                      onClick={() => handleCouponAction(bond, 'reinvest')}
                                      className="text-xs"
                                    >
                                      {submitting ? 'Saving...' : '🔄 Reinvest'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Past Coupon Payments Tab */}
            <TabsContent value="past" className="mt-0 space-y-4">
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  {pastCoupons.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📊</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">No Past Payments</p>
                      <p className="text-sm text-gray-600">
                        Your payment history will appear here once coupons are processed
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="font-semibold">Bond</TableHead>
                              <TableHead className="font-semibold">Payment #</TableHead>
                              <TableHead className="font-semibold">Coupon Date</TableHead>
                              <TableHead className="font-semibold">Amount</TableHead>
                              <TableHead className="font-semibold">Action Taken</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pastCoupons.map((coupon, index) => {
                              // Find the bond for this coupon
                              const bond = bondHoldings.find(b => b.id === coupon.bondId)
                              
                              return (
                                <TableRow key={coupon.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                                  <TableCell className="font-medium">{coupon.bondName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      #{coupon.paymentNumber}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">📅</span>
                                      {formatDate(coupon.paymentDate)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-green-600 font-semibold">
                                    {formatCurrency(coupon.netIncome)}
                                  </TableCell>
                                  <TableCell>
                                    {coupon.couponAction ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                          <Badge 
                                            variant={coupon.couponAction === 'withdraw' ? 'default' : 'secondary'}
                                            className="text-xs w-fit"
                                          >
                                            {coupon.couponAction === 'withdraw' ? '💰 Withdrawn' : '🔄 Reinvested'}
                                          </Badge>
                                          {coupon.isDefaultAction && (
                                            <span className="text-xs text-muted-foreground italic" title="Based on your investment objective">
                                              (default)
                                            </span>
                                          )}
                                        </div>
                                        {coupon.couponActionAt && (
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(coupon.couponActionAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                                        — Not Set
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        ✓ Paid
                                      </Badge>
                                      {coupon.isFinalPayment && (
                                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                                          🏁 Final
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {bond ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewDetails(bond)}
                                        className="text-xs"
                                      >
                                        📋 Details
                                      </Button>
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
                      <div className="mt-6 p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                            <p className="text-2xl font-bold">{pastCoupons.length}</p>
                          </div>
                          <div className="h-10 w-px bg-border"></div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Amount Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(pastCoupons.reduce((sum, c) => sum + c.netIncome, 0))}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Actions Processed</p>
                          <p className="text-lg font-semibold">
                            {pastCoupons.filter(c => c.couponAction).length} / {pastCoupons.length}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          )}
          </div>
        </Layout>
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-4 space-y-2">
              <DialogTitle className="text-2xl font-bold">Bond Purchase Details</DialogTitle>
              <DialogDescription className="text-sm">
                Complete overview of your bond investment and payment schedule
              </DialogDescription>
            </DialogHeader>
            {selectedBond && (() => {
              const bondDisplayName =
                selectedBond.available_bonds?.display_name ||
                selectedBond.available_bonds?.name ||
                'Unnamed Bond'
              const netDisplay = formatCurrency(selectedBond.net_income)

              const schedules = Array.isArray(selectedBond.coupon_schedules)
                ? selectedBond.coupon_schedules
                : []

              const today = new Date()
              today.setHours(0, 0, 0, 0)

              const upcomingSchedule =
                schedules.find(schedule => {
                  const scheduleDate = new Date(schedule.payment_date)
                  return !Number.isNaN(scheduleDate.getTime()) && scheduleDate >= today
                }) || null

              const couponStatus = isCouponExpired(selectedBond.next_coupon_date)
                ? { label: 'Closed', variant: 'outline' as const }
                : { label: 'Pending', variant: 'secondary' as const }

              const couponActionLabel =
                upcomingSchedule?.coupon_action ||
                selectedBond.coupon_action ||
                'No preference set'

              const overviewItems = [
                { label: 'Maturity Date', value: formatDate(selectedBond.maturity_date) },
                { label: 'Next Coupon Date', value: formatDate(selectedBond.next_coupon_date) },
                { label: 'Net Income', value: netDisplay }
              ].filter(item => item.value && item.value !== '—')

              const scheduleHeightClass = scheduleExpanded ? 'h-[calc(100vh-250px)]' : 'max-h-[40vh]'
              const outerScrollHeight = 'max-h-[90vh]'

              return (
                <ScrollArea className={outerScrollHeight}>
                  <div className="space-y-5 px-6 pb-6">
                    {/* Bond Header */}
                    <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/30 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={couponStatus.variant} className="text-xs">
                              {couponStatus.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {couponActionLabel}
                            </Badge>
                          </div>
                          <h3 className="text-xl font-bold text-foreground">
                            {bondDisplayName}
                          </h3>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Coupon</p>
                            <p className="font-semibold mt-1">{formatDate(selectedBond.next_coupon_date)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Maturity</p>
                            <p className="font-semibold mt-1">{formatDate(selectedBond.maturity_date)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Investment Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {overviewItems.map(item => (
                        <div key={item.label} className="rounded-lg border bg-card p-4">
                          <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">
                            {item.label}
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
        </div>

                    {/* Coupon Schedule */}
                    <div className="rounded-xl border bg-card p-5">
                      <div className="flex items-center justify-between mb-4">
              <div>
                          <h4 className="text-base font-semibold text-foreground">Coupon Schedule</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            All payment dates and amounts
                          </p>
              </div>
                        <div className="flex items-center gap-2">
                          {schedules.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {schedules.length} payments
                            </Badge>
                          )}
                          {schedules.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => setScheduleExpanded(prev => !prev)}
                            >
                              {scheduleExpanded ? 'Collapse' : 'Expand All'}
                            </Button>
                          )}
              </div>
            </div>
                      {schedules.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border">
                          <ScrollArea className={scheduleHeightClass}>
                            <div className="min-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                                    <TableHead className="w-[90px]">Payment #</TableHead>
                                    <TableHead>Coupon Date</TableHead>
                                    <TableHead>Net Income</TableHead>
                  <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                                  {schedules.map(schedule => {
                                    const scheduleNet = toNumberOrNull(schedule.net_income)
                                    const scheduleDate = formatDate(schedule.payment_date)
                                    const scheduleExpired = isCouponExpired(schedule.payment_date)
                                    const scheduleUpcoming = !scheduleExpired && new Date(schedule.payment_date) >= new Date()
                                    return (
                                      <TableRow key={schedule.id || `${selectedBond.id}-${schedule.payment_number}`}>
                                        <TableCell className="font-mono text-xs sm:text-sm">
                                          {schedule.payment_number}
                                        </TableCell>
                                        <TableCell>{scheduleDate}</TableCell>
                                        <TableCell className="text-sm font-medium text-green-600">
                                          {scheduleNet !== null ? formatCurrency(scheduleNet) : '—'}
                                        </TableCell>
                                        <TableCell>
                                          {schedule.is_final_payment ? (
                                            <Badge variant="secondary" className="text-xs">Final</Badge>
                                          ) : scheduleUpcoming ? (
                                            <Badge variant="outline" className="text-xs">Upcoming</Badge>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Past</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {scheduleUpcoming ? (
                                            // For upcoming payments, only show action if explicitly set (not default)
                                            schedule.coupon_action && !schedule.is_default_action ? (
                                              <Badge 
                                                variant={schedule.coupon_action === 'withdraw' ? 'default' : 'secondary'}
                                                className="text-xs capitalize"
                                              >
                                                {schedule.coupon_action === 'withdraw' ? '💰 Withdraw' : '🔄 Reinvest'}
                                              </Badge>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">⏳ Pending</span>
                                            )
                                          ) : (
                                            // For past payments, show action including defaults
                                            schedule.coupon_action ? (
                                              <div className="flex items-center gap-1.5">
                                                <Badge 
                                                  variant={schedule.coupon_action === 'withdraw' ? 'default' : 'secondary'}
                                                  className="text-xs capitalize"
                                                >
                                                  {schedule.coupon_action === 'withdraw' ? '💰 Withdrawn' : '🔄 Reinvested'}
                                                </Badge>
                                                {schedule.is_default_action && (
                                                  <span className="text-xs text-muted-foreground italic" title="Based on your investment objective">
                                                    (default)
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">— Not Set</span>
                                            )
                                          )}
                                        </TableCell>
                  </TableRow>
                                    )
                                  })}
              </TableBody>
            </Table>
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            No coupon schedule entries available for this purchase yet.
                          </p>
                        </div>
                      )}
                    </div>
      </div>
                </ScrollArea>
              )
            })()}
          </DialogContent>
        </Dialog>
      </>
    </ProtectedRoute>
  )
}