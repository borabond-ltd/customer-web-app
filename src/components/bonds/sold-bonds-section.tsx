'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Globe, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
interface SoldBond {
  id: string
  user_id: string
  user_profile_id: string
  bond_id: string
  available_bond_id: string
  sell_amount: number
  original_amount: number
  country: string
  status: 'in_progress' | 'completed' | 'cancelled'
  sell_request_date: string
  completion_date?: string
  created_at: string
  updated_at: string
}

interface SoldBondsSectionProps {
  userId: string
}

export function SoldBondsSection({ userId }: SoldBondsSectionProps) {
  const [soldBonds, setSoldBonds] = useState<SoldBond[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadSoldBonds = async () => {
    try {
      setError(null)
      const response = await apiClient.getSoldBonds(1, 50)
      
      if (response.success) {
        setSoldBonds((response as any).data || [])
      } else {
        throw new Error(response.error || 'Failed to load sold bonds')
      }
    } catch (err) {
      logger.error('Error loading sold bonds:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sold bonds')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSoldBonds()
    setRefreshing(false)
  }

  const handleCancelSale = async (soldBondId: string) => {
    try {
      const response = await apiClient.cancelBondSale(soldBondId)
      
      if (response.success) {
        toast.success('Bond sale cancelled successfully')
        await loadSoldBonds() // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to cancel bond sale')
      }
    } catch (err) {
      logger.error('Error cancelling bond sale:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to cancel bond sale')
    }
  }

  useEffect(() => {
    if (userId) {
      loadSoldBonds()
    }
  }, [userId])

  const formatCurrency = (amount: number) => {
    return 'UGX ' + new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5" />
            <span>Sold Bonds</span>
          </CardTitle>
          <CardDescription>
            Bonds you have requested to sell
          </CardDescription>
        </CardHeader>
        <CardContent>
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
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5" />
              <span>Sold Bonds</span>
            </CardTitle>
            <CardDescription>
              Bonds you have requested to sell ({soldBonds.length} total)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={loadSoldBonds}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {soldBonds.length === 0 ? (
          <div className="text-center py-12">
            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sold Bonds</h3>
            <p className="text-gray-600">
              You haven't sold any bonds yet. Use the "Sell Bond" button on your holdings to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bond ID</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Sell Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldBonds.map((bond) => (
                  <TableRow key={bond.id}>
                    <TableCell>
                      <div className="font-mono text-sm bg-gray-100 p-1 rounded">
                        {bond.available_bond_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span>{bond.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(bond.sell_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(bond.status)}
                        {getStatusBadge(bond.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(bond.sell_request_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bond.completion_date ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(bond.completion_date)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bond.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelSale(bond.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
