'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { RefreshCw, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SyncStatus {
  success: boolean
  timestamp: string
  cybridApiHealth: boolean
  pendingTransactions: {
    count: number
    success: boolean
    error?: string
  }
  lastSyncAttempt: string
}

interface TransactionSyncStatusProps {
  className?: string
  showDetails?: boolean
}

export function TransactionSyncStatus({ className = '', showDetails = false }: TransactionSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSyncStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getSyncStatus()
      
      if (response.success) {
        setSyncStatus(response.data as SyncStatus)
      } else {
        setError('Failed to fetch sync status')
      }
    } catch (err: any) {
      console.error('Error fetching sync status:', err)
      setError(err.message || 'Failed to fetch sync status')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      
      const response = await apiClient.syncAllPendingTransactions()
      
      if (response.success) {
        // Refresh status after sync
        await fetchSyncStatus()
      } else {
        setError('Manual sync failed')
      }
    } catch (err: any) {
      console.error('Error during manual sync:', err)
      setError(err.message || 'Manual sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    
    // Refresh status every 5 minutes
    const interval = setInterval(fetchSyncStatus, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    if (loading) return <Activity className="h-4 w-4 animate-spin" />
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (!syncStatus?.cybridApiHealth) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    if (syncStatus.pendingTransactions.count === 0) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getStatusText = () => {
    if (loading) return 'Checking status...'
    if (error) return 'Error loading status'
    if (!syncStatus?.cybridApiHealth) return 'API connection issues'
    if (syncStatus.pendingTransactions.count === 0) return 'All transactions synced'
    return `${syncStatus.pendingTransactions.count} pending transactions`
  }

  const getStatusColor = () => {
    if (loading) return 'bg-gray-100'
    if (error || !syncStatus?.cybridApiHealth) return 'bg-yellow-100'
    if (syncStatus.pendingTransactions.count === 0) return 'bg-green-100'
    return 'bg-blue-100'
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        {getStatusIcon()}
        <span className="text-gray-600">{getStatusText()}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={syncing}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Transaction Sync Status</CardTitle>
            {getStatusIcon()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        <CardDescription>
          Transaction statuses are automatically updated every 24 hours
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {syncStatus && (
          <div className="space-y-3">
            {/* API Health Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cybrid API</span>
              <Badge variant={syncStatus.cybridApiHealth ? 'default' : 'destructive'}>
                {syncStatus.cybridApiHealth ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>

            {/* Pending Transactions */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pending Transactions</span>
              <Badge variant={syncStatus.pendingTransactions.count === 0 ? 'default' : 'secondary'}>
                {syncStatus.pendingTransactions.count}
              </Badge>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Sync</span>
              <span className="text-sm text-gray-500">
                {new Date(syncStatus.lastSyncAttempt).toLocaleString()}
              </span>
            </div>

            {/* Next Scheduled Sync */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Next Sync</span>
              <span className="text-sm text-gray-500">
                {new Date(new Date(syncStatus.lastSyncAttempt).getTime() + 24 * 60 * 60 * 1000).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className={`p-3 rounded-lg ${getStatusColor()}`}>
          <p className="text-sm font-medium">{getStatusText()}</p>
          <p className="text-xs text-gray-600 mt-1">
            Transaction statuses are automatically synchronized with Cybrid every 24 hours.
            You can manually trigger a sync using the button above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionSyncStatus
