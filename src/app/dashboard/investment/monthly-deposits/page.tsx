'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout'
import ProtectedRoute from '@/components/protected-route'
import { AnimatedPage, AnimatedCard } from '@/components/animated-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Mail,
  TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
interface MonthlyDeposit {
  id: string
  user_id: string
  user_email: string
  amount: number
  job_year: number
  job_month: number
  status: 'pending' | 'processing' | 'processed' | 'failed'
  attempts: number
  last_run_at: string
  notification_sent: boolean
  created_at: string
  updated_at: string
}

interface MonthlyDepositStatus {
  jobs: MonthlyDeposit[]
  nextJob: MonthlyDeposit | null
  daysUntilNext: number | null
  hasUpcomingJob: boolean
}

export default function MonthlyDepositsPage() {
  const [status, setStatus] = useState<MonthlyDepositStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Debug logging
  logger.log('MonthlyDepositsPage rendered')

  const loadMonthlyDeposits = async () => {
    try {
      logger.log('Loading monthly deposits...')
      setError(null)
      const response = await apiClient.getMonthlyDepositStatus()
      logger.log('Monthly deposits response:', response)
      
      if (response.success) {
        setStatus(response.data)
        logger.log('Monthly deposits loaded successfully:', response.data)
      } else {
        setError(response.message || 'Failed to load monthly deposits')
        logger.error('Failed to load monthly deposits:', response.message)
      }
    } catch (err: any) {
      logger.error('Error loading monthly deposits:', err)
      setError('Failed to load monthly deposits. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMonthlyDeposits()
  }

  useEffect(() => {
    loadMonthlyDeposits()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Processing</Badge>
      case 'processed':
        return <Badge variant="outline" className="text-green-600 border-green-300">Processed</Badge>
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-300">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const formatDate = (year: number, month: number) => {
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <AnimatedPage>
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-gray-600 dark:text-gray-400">Loading monthly deposits...</span>
                </div>
              </div>
            </div>
          </AnimatedPage>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Monthly Investment Deposits
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Track your scheduled monthly investment deposits
                  </p>
                </div>
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  disabled={refreshing}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Error Handling */}
            {error && (
              <div className="mb-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Next Job Countdown */}
            {status?.hasUpcomingJob && status.daysUntilNext !== null && (
              <div className="mb-6">
                <AnimatedCard delay={0.1}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>Upcoming Investment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${(status.nextJob?.amount || 0).toLocaleString()} USD
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Scheduled for {formatDate(status.nextJob!.job_year, status.nextJob!.job_month)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {status.daysUntilNext}
                      </div>
                      <div className="text-sm text-gray-500">
                        {status.daysUntilNext === 1 ? 'day' : 'days'} left
                      </div>
                    </div>
                  </div>
                  {status.nextJob?.notification_sent && (
                    <div className="mt-4 flex items-center space-x-2 text-sm text-green-600">
                      <Mail className="h-4 w-4" />
                      <span>Email notification sent</span>
                    </div>
                  )}
                </CardContent>
              </AnimatedCard>
              </div>
            )}

            {/* Deposits Table */}
            <AnimatedCard delay={0.2}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>All Monthly Deposits</span>
                </CardTitle>
                <CardDescription>
                  Complete history of your monthly investment deposits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!status?.jobs || status.jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Monthly Deposits Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      You haven't set up any monthly investment deposits yet.
                    </p>
                    <Button asChild>
                      <a href="/dashboard/investment">Set Up Monthly Investment</a>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Month
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Amount
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Attempts
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Last Run
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Notification
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.jobs.map((deposit, index) => (
                          <motion.tr
                            key={deposit.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatDate(deposit.job_year, deposit.job_month)}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  ${deposit.amount.toLocaleString()} USD
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(deposit.status)}
                                {getStatusBadge(deposit.status)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-600 dark:text-gray-400">
                                {deposit.attempts}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-600 dark:text-gray-400">
                                {deposit.last_run_at ? formatDateTime(deposit.last_run_at) : 'Never'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {deposit.notification_sent ? (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <Mail className="h-4 w-4" />
                                  <span className="text-sm">Sent</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Not sent</span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>

            {/* Summary Stats */}
            {status?.jobs && status.jobs.length > 0 && (
              <div className="mt-6">
                <AnimatedCard delay={0.3}>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {status.jobs.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Deposits
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {status.jobs.filter(deposit => deposit.status === 'processed').length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Processed
                      </div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {status.jobs.filter(deposit => deposit.status === 'pending').length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Pending
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
              </div>
            )}
          </div>
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
