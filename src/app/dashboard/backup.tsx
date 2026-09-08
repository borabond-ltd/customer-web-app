'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { AnimatedPage, AnimatedCard, AnimatedMetric } from '@/components/animated-page'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { SkeletonLoader } from '@/components/skeleton-loader'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowRight, Target, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

import { logger } from '@/lib/logger'
// Mock data for charts
const portfolioGrowthData = [
  { month: 'Jan', value: 100000 },
  { month: 'Feb', value: 105000 },
  { month: 'Mar', value: 110000 },
  { month: 'Apr', value: 108000 },
  { month: 'May', value: 115000 },
  { month: 'Jun', value: 120000 },
]

const cashFlowData = [
  { month: 'Jan', income: 2500, expenses: 500 },
  { month: 'Feb', income: 2800, expenses: 600 },
  { month: 'Mar', income: 3000, expenses: 550 },
  { month: 'Apr', income: 2700, expenses: 700 },
  { month: 'May', income: 3200, expenses: 650 },
  { month: 'Jun', income: 3500, expenses: 600 },
]

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isInvesting, setIsInvesting] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDataLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleInvestNow = async () => {
    setIsInvesting(true)
    // Simulate API call or open modal
    setTimeout(() => {
      setIsInvesting(false)
      // Here you would typically open an investment modal or navigate to investment page
      logger.log('Invest Now clicked - opening investment flow...')
    }, 1000)
  }

  const handleUpdateStrategy = () => {
    router.push('/investment_strategy')
  }

  // Show skeleton loader while data is loading
  if (isDataLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <SkeletonLoader />
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
        {/* Page Header Box */}
        <AnimatedCard delay={0.1}>
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left Side - Dashboard Info */}
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                    Dashboard
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Welcome back{user?.full_name ? `, ${user.full_name}` : ''}! Here's an overview of your investment portfolio.
                  </p>
                  {user?.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Signed in as: {user.email}
                    </p>
                  )}
                </div>

                {/* Right Side - Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 lg:flex-shrink-0">
                  <Button
                    onClick={handleInvestNow}
                    disabled={isInvesting}
                    size="lg"
                    className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800"
                    aria-label="Start new investment"
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isInvesting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                      )}
                      <span className="text-base font-medium">{isInvesting ? 'Processing...' : 'Invest Now'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </Button>

                  <Button
                    onClick={handleUpdateStrategy}
                    variant="outline"
                    size="lg"
                    className="group relative overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950/20 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-300 font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800"
                    aria-label="Update investment strategy"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Target className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-base font-medium">Update Strategy</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Key Metrics Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AnimatedMetric delay={0.2}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total Investment</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">$120,000</div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={0.3}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Current Yield</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">8.5%</div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  +0.3% from last month
                </p>
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={0.4}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Upcoming Payments</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">$3,500</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Next payment in 14 days
                </p>
              </CardContent>
            </Card>
          </AnimatedMetric>

          <AnimatedMetric delay={0.5}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Portfolio Growth</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">+20%</div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Year to date
                </p>
              </CardContent>
            </Card>
          </AnimatedMetric>
        </div>

        {/* Charts Boxes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Portfolio Growth Chart Box */}
          <AnimatedCard delay={0.6}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Growth</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Your investment portfolio value over time
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        fontSize={12}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        fontSize={12}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                        contentStyle={{ 
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#16a34a" 
                        strokeWidth={3}
                        dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Cash Flow Chart Box */}
          <AnimatedCard delay={0.7}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cash Flow</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Monthly income vs expenses from bond payments
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        fontSize={12}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        fontSize={12}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                        contentStyle={{ 
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="income" fill="#16a34a" name="Income" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Bottom Info Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity Box */}
          <AnimatedCard delay={0.8}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Last coupon payment received from Nigeria 13.5% 2030 bond.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    +$13,500
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    2 days ago
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Upcoming Payment Box */}
          <AnimatedCard delay={0.9}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Payment</h3>
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Ghana 15.2% 2029 coupon payment due soon.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    $18,240
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Dec 30, 2023
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Portfolio Health Box */}
          <AnimatedCard delay={1.0}>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full group cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Portfolio Health</h3>
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Diversified across 5 African markets with strong yields.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    Excellent
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    12.7% avg yield
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Footer Section */}
        <Footer />
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
