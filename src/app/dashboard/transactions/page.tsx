'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TransactionDetailsModal } from '@/components/transactions/transaction-details-modal'
import { 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/protected-route'

import { logger } from '@/lib/logger'
interface Transaction {
  id: string
  provider: string
  amount: number
  currency: string
  fee: number
  status: string
  transfer_type: string
  type?: string
  created_at: string
  completed_at: string | null
  provider_payment_id: string
  provider_reference: string
  metadata?: any
  bond_id?: any
  transactionId?: string
  source?: string
}

interface TransactionStats {
  totalTransactions: number
  statusBreakdown: Record<string, number>
  totalAmount: number
  completedTransactions: number
  pendingTransactions: number
  failedTransactions: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Currency conversion state
  const [currencyRate, setCurrencyRate] = useState<number | null>(null)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  
  // Filters and pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)

  // Currency conversion functions
  const fetchCurrencyRate = async () => {
    try {
      setIsLoadingRate(true)
      setCurrencyError(null)
      const response = await apiClient.getExchangeRate('UGX')
      if (response.success && response.data) {
        setCurrencyRate(response.data.rate_to_usd)
      } else {
        setCurrencyError('Failed to fetch exchange rate')
      }
    } catch (error) {
      logger.error('Error fetching currency rate:', error)
      setCurrencyError('Failed to fetch exchange rate')
    } finally {
      setIsLoadingRate(false)
    }
  }

  const convertToUGX = (usdAmount: number): number => {
    if (!currencyRate) return 0
    return usdAmount * currencyRate
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatUGX = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: 8,
        sortBy,
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search })
      }

      const response = await apiClient.getTransactions(params)
      
      if (response.success) {
        setTransactions(response.data.transactions)
        setTotalPages(response.data.pagination.totalPages)
        setTotalTransactions(response.data.pagination.total)
      } else {
        toast.error(response.message || 'Failed to fetch transactions')
      }
    } catch (error) {
      logger.error('Error fetching transactions:', error)
      toast.error('Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.getTransactionStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      logger.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchCurrencyRate()
  }, [])

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [statusFilter, sortBy])

  useEffect(() => {
    // Reset to page 1 when search changes and fetch after debounce
    setCurrentPage(1)
    const debounceTimer = setTimeout(() => {
      fetchTransactions()
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [search])

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, statusFilter, sortBy])

  const handleExport = async () => {
    try {
      setExporting(true)
      const params = {
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        sortBy
      }

      const blob = await apiClient.exportTransactionsToCSV(params)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Transactions exported successfully')
    } catch (error) {
      logger.error('Error exporting transactions:', error)
      toast.error('Failed to export transactions')
    } finally {
      setExporting(false)
    }
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setSortBy('created_at desc')
    setCurrentPage(1)
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Transactions</h1>
              <p className="text-muted-foreground">
                View and manage your transaction history
              </p>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="w-fit">
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">Total Transactions</p>
                      <p className="text-xl font-bold leading-tight">{stats.totalTransactions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchCurrencyRate}
                          disabled={isLoadingRate}
                          className="h-5 w-5 p-0 -mr-1"
                        >
                          <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-xl font-bold leading-tight">{formatCurrency(stats.totalAmount)}</p>
                      {currencyRate && !isLoadingRate && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          ≈ {formatUGX(convertToUGX(stats.totalAmount))}
                        </p>
                      )}
                      {isLoadingRate && (
                        <p className="text-xs text-muted-foreground mt-0.5">Loading...</p>
                      )}
                      {currencyError && (
                        <p className="text-xs text-red-500 mt-0.5">Unavailable</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">Completed</p>
                      <p className="text-xl font-bold leading-tight">{stats.completedTransactions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">Pending</p>
                      <p className="text-xl font-bold leading-tight">{stats.pendingTransactions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at desc">Newest First</SelectItem>
                  <SelectItem value="created_at asc">Oldest First</SelectItem>
                  <SelectItem value="amount desc">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount asc">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Transaction History ({totalTransactions} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-muted-foreground">
                {search || (statusFilter && statusFilter !== 'all') ? 'Try adjusting your filters' : 'You haven\'t made any transactions yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    {/* Type column hidden */}
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <TableCell className="font-mono text-sm">
                        {transaction.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </TableCell>
                      {/* Type column hidden */}
                      <TableCell>
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTransactionClick(transaction)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalTransactions > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalTransactions)} of {totalTransactions} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

          {/* Transaction Details Modal */}
          <TransactionDetailsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            transaction={selectedTransaction}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
