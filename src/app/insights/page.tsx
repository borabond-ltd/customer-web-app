'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, PieChart } from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

import { logger } from '@/lib/logger'
interface InsightsData {
  portfolio_summary: {
    total_investment: number
    total_yield: number
    average_maturity: number
    countries_count: number
    bonds_count: number
  }
  performance_metrics: {
    ytd_return: number
    monthly_income: number
    next_payment_days: number
    risk_score: number
  }
  country_breakdown: Array<{
    country: string
    percentage: number
    amount: number
  }>
  upcoming_payments: Array<{
    bond_name: string
    payment_date: string
    amount: number
    days_until: number
  }>
  yield_analysis: {
    highest_yield: { country: string; yield: number }
    lowest_yield: { country: string; yield: number }
    average_yield: number
    yield_trend: string
  }
}

const COLORS = ['#16a34a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/insights')
      const result = await response.json()
      if (result.success) {
        setInsights(result.data)
      }
    } catch (error) {
      logger.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'Nigeria': '🇳🇬',
      'South Africa': '🇿🇦',
      'Ghana': '🇬🇭',
      'Kenya': '🇰🇪',
      'Egypt': '🇪🇬'
    }
    return flags[country] || '🌍'
  }

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
    if (score <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    )
  }

  if (!insights) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load insights data</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insights</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analytics and insights into your bond portfolio performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">YTD Return</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{insights.performance_metrics.ytd_return}%
              </div>
              <p className="text-xs text-muted-foreground">
                Year to date performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${insights.performance_metrics.monthly_income.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected monthly income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {insights.performance_metrics.next_payment_days} days
              </div>
              <p className="text-xs text-muted-foreground">
                Until next coupon payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {insights.performance_metrics.risk_score}/10
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio risk assessment
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Country Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio by Country</CardTitle>
              <CardDescription>
                Distribution of your investments across African countries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={insights.country_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ country, percentage }) => `${country} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {insights.country_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yield Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Yield Analysis</CardTitle>
              <CardDescription>
                Performance metrics across your bond holdings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Highest Yield</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getCountryFlag(insights.yield_analysis.highest_yield.country)} {insights.yield_analysis.highest_yield.country}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {insights.yield_analysis.highest_yield.yield}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Lowest Yield</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getCountryFlag(insights.yield_analysis.lowest_yield.country)} {insights.yield_analysis.lowest_yield.country}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  {insights.yield_analysis.lowest_yield.yield}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Average Yield</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Portfolio average
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {insights.yield_analysis.average_yield}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Yield Trend</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recent performance
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {insights.yield_analysis.yield_trend === 'increasing' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <Badge className={insights.yield_analysis.yield_trend === 'increasing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}>
                    {insights.yield_analysis.yield_trend}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
            <CardDescription>
              Your next bond coupon payments and their timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.upcoming_payments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{payment.bond_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due: {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                    <Badge variant="secondary">
                      {payment.days_until} days
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Summary</CardTitle>
            <CardDescription>
              Key statistics about your bond investment portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${insights.portfolio_summary.total_investment.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Investment</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {insights.portfolio_summary.total_yield}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Yield</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {insights.portfolio_summary.average_maturity} years
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Maturity</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {insights.portfolio_summary.countries_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Countries</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {insights.portfolio_summary.bonds_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Bonds</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
