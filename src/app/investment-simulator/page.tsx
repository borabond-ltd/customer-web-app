'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { AnimatedPage } from '@/components/animated-page'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { SkeletonLoader } from '@/components/skeleton-loader'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  RotateCcw, 
  Loader2, 
  ArrowLeft, 
  Target,
  BarChart3,
  Zap,
  Shield,
  Info,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SimulationData {
  year: number
  deposits: number
  netIncome: number
  cumulativeDeposits: number
  cumulativeValue: number
}

interface SimulationResult {
  scenarios: {
    bestCase: {
      bond: any
      monthlyData: SimulationData[]
      finalValue: number
      totalDeposits: number
      totalReturn: number
    }
    mostLikely: {
      bond: any
      monthlyData: SimulationData[]
      finalValue: number
      totalDeposits: number
      totalReturn: number
    }
    worstCase: {
      bond: any
      monthlyData: SimulationData[]
      finalValue: number
      totalDeposits: number
      totalReturn: number
    }
  }
  summary: {
    totalDeposits: number
    mostLikely: {
      finalValue: number
      totalReturn: number
    }
    bestCase: {
      finalValue: number
      totalReturn: number
    }
    worstCase: {
      finalValue: number
      totalReturn: number
    }
  }
  parameters: {
    initialDeposit: number
    monthlyDeposit: number
    holdingPeriod: number
    reinvestCoupons: boolean
  }
}

export default function InvestmentSimulatorPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [initialDeposit, setInitialDeposit] = useState(100) // $100
  const [monthlyDeposit, setMonthlyDeposit] = useState(1000000) // UGX 1M
  const [holdingPeriod, setHoldingPeriod] = useState(25) // 25 years
  const [reinvestCoupons, setReinvestCoupons] = useState(true)
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSimulation = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/bonds/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialDeposit,
          monthlyDeposit,
          holdingPeriod,
          reinvestCoupons
        })
      })

      if (!response.ok) {
        throw new Error('Failed to run simulation')
      }

      const result = await response.json()
      setSimulationData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-run simulation when parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation()
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timer)
  }, [initialDeposit, monthlyDeposit, holdingPeriod, reinvestCoupons])

  // Format chart data
  const formatChartData = (data: SimulationData[]) => {
    return data.map(item => ({
      year: item.year + 2025, // Start from 2025
      deposits: item.cumulativeDeposits,
      mostLikely: item.cumulativeValue,
      bestCase: item.cumulativeValue * 1.1, // Approximate best case
      worstCase: item.cumulativeValue * 0.9, // Approximate worst case
    }))
  }

  const chartData = simulationData ? formatChartData(simulationData.scenarios.mostLikely.monthlyData) : []

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <SkeletonLoader />
        </div>
      </Layout>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Hero Header */}
            <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-800 border-b border-gray-200 dark:border-gray-800">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.back()}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-gray-700 dark:text-white" />
                        </div>
                        <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                          Investment Tool
                        </Badge>
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Investment Simulator
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
                        Project your bond investment returns over time with our advanced simulation engine. 
                        Explore different scenarios and make informed investment decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Left Panel - Controls */}
                <div className="xl:col-span-1 space-y-6">
                  
                  {/* Control Panel */}
                  <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-gray-900 dark:text-white text-xl">Investment Parameters</CardTitle>
                          <CardDescription className="text-gray-600 dark:text-gray-400">
                            Adjust your investment strategy
                          </CardDescription>
                        </div>
                        <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg">
                          <Target className="h-5 w-5 text-gray-700 dark:text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      
                      {/* Initial Deposit */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 dark:text-white font-medium text-sm uppercase tracking-wide">
                            First Deposit
                          </Label>
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            UGX {formatCurrency(initialDeposit)}
                          </Badge>
                        </div>
                        <Slider
                          value={[initialDeposit]}
                          onValueChange={(value) => setInitialDeposit(value[0])}
                          max={10000000}
                          min={100}
                          step={100}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>$100</span>
                          <span>UGX 10M</span>
                        </div>
                      </div>

                      <Separator className="bg-gray-200 dark:bg-gray-700" />

                      {/* Monthly Deposit */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 dark:text-white font-medium text-sm uppercase tracking-wide">
                            Monthly Deposit
                          </Label>
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            UGX {formatCurrency(monthlyDeposit)}
                          </Badge>
                        </div>
                        <Slider
                          value={[monthlyDeposit]}
                          onValueChange={(value) => setMonthlyDeposit(value[0])}
                          max={5000000}
                          min={0}
                          step={100000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>UGX 0</span>
                          <span>UGX 5M</span>
                        </div>
                      </div>

                      <Separator className="bg-gray-200 dark:bg-gray-700" />

                      {/* Holding Period */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 dark:text-white font-medium text-sm uppercase tracking-wide">
                            Holding Period
                          </Label>
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {holdingPeriod} years
                          </Badge>
                        </div>
                        <Slider
                          value={[holdingPeriod]}
                          onValueChange={(value) => setHoldingPeriod(value[0])}
                          max={50}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>1 year</span>
                          <span>50 years</span>
                        </div>
                      </div>

                      <Separator className="bg-gray-200 dark:bg-gray-700" />

                      {/* Reinvest Coupons */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-gray-700 dark:text-white font-medium text-sm uppercase tracking-wide">
                            Reinvest Coupons
                          </Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Automatically reinvest coupon payments
                          </p>
                        </div>
                        <Switch
                          checked={reinvestCoupons}
                          onCheckedChange={setReinvestCoupons}
                        />
                      </div>

                      {/* Simulate Button */}
                      <Button 
                        onClick={runSimulation}
                        disabled={isLoading}
                        className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 font-semibold py-3"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-5 w-5" />
                            Run Simulation
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  {simulationData && (
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-gray-900 dark:text-white text-lg">Projection Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              UGX {formatCurrency(simulationData.summary.totalDeposits)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Total Deposits
                            </div>
                          </div>
                          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {holdingPeriod}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Years
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Most Likely</span>
                            <span className="text-gray-900 dark:text-white font-semibold">
                              UGX {formatCurrency(simulationData.summary.mostLikely.finalValue)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Best Case</span>
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              UGX {formatCurrency(simulationData.summary.bestCase.finalValue)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Worst Case</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              UGX {formatCurrency(simulationData.summary.worstCase.finalValue)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Panel - Chart and Analysis */}
                <div className="xl:col-span-2 space-y-6">
                  
                   {/* Performance Chart - Professional Financial Dashboard */}
                   <Card className="bg-white dark:bg-gray-900 border-0 shadow-xl rounded-2xl overflow-hidden">
                     <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                             <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                           </div>
                           <div>
                             <CardTitle className="text-gray-900 dark:text-white text-2xl font-bold">Performance Projection</CardTitle>
                             <CardDescription className="text-gray-600 dark:text-gray-400 text-base">
                               Investment growth trajectory over {holdingPeriod} years
                             </CardDescription>
                           </div>
                         </div>
                         <div className="flex items-center space-x-3">
                           <Badge variant="outline" className="border-green-300 dark:border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1">
                             <TrendingUp className="h-4 w-4 mr-1" />
                             Live Data
                           </Badge>
                           <Badge variant="outline" className="border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1">
                             <BarChart3 className="h-4 w-4 mr-1" />
                             Interactive
                           </Badge>
                         </div>
                       </div>
                     </CardHeader>
                     <CardContent className="p-0">
                       {error ? (
                         <div className="text-center py-16">
                           <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl max-w-md mx-auto">
                             <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                               <TrendingUp className="h-6 w-6 text-red-500" />
                             </div>
                             <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Simulation Error</div>
                             <div className="text-red-500 dark:text-red-300 text-sm">{error}</div>
                           </div>
                         </div>
                       ) : chartData.length > 0 ? (
                         <div className="relative">
                           {/* Chart Container with Professional Styling */}
                           <div className="p-6 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800">
                             <ResponsiveContainer width="100%" height={450}>
                               <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                 <defs>
                                   {/* Professional Gradient Definitions */}
                                   <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                     <stop offset="50%" stopColor="#6366f1" stopOpacity={0.4}/>
                                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                                   </linearGradient>
                                   <linearGradient id="colorMostLikely" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                     <stop offset="50%" stopColor="#059669" stopOpacity={0.4}/>
                                     <stop offset="95%" stopColor="#059669" stopOpacity={0.1}/>
                                   </linearGradient>
                                   <linearGradient id="colorBestCase" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                                     <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                   </linearGradient>
                                   <linearGradient id="colorWorstCase" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                     <stop offset="50%" stopColor="#ef4444" stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                                   </linearGradient>
                                 </defs>
                                 
                                 {/* Professional Grid */}
                                 <CartesianGrid 
                                   strokeDasharray="2 4" 
                                   stroke="#e5e7eb" 
                                   strokeOpacity={0.3}
                                   vertical={false}
                                 />
                                 
                                 {/* X-Axis with Professional Styling */}
                                 <XAxis 
                                   dataKey="year" 
                                   stroke="#6b7280"
                                   tick={{ 
                                     fill: '#6b7280', 
                                     fontSize: 13,
                                     fontWeight: 500,
                                     fontFamily: 'Inter, system-ui, sans-serif'
                                   }}
                                   axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                                   tickLine={{ stroke: '#d1d5db' }}
                                   tickMargin={10}
                                 />
                                 
                                 {/* Y-Axis with Professional Styling */}
                                 <YAxis 
                                   stroke="#6b7280"
                                   tick={{ 
                                     fill: '#6b7280', 
                                     fontSize: 13,
                                     fontWeight: 500,
                                     fontFamily: 'Inter, system-ui, sans-serif'
                                   }}
                                   axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                                   tickLine={{ stroke: '#d1d5db' }}
                                   tickMargin={10}
                                   tickFormatter={(value) => `UGX ${(value / 1000000).toFixed(0)}M`}
                                 />
                                 
                                 {/* Professional Tooltip */}
                                 <Tooltip 
                                   contentStyle={{ 
                                     backgroundColor: '#ffffff', 
                                     border: '1px solid #e5e7eb',
                                     borderRadius: '12px',
                                     color: '#374151',
                                     boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                                     fontSize: '14px',
                                     fontFamily: 'Inter, system-ui, sans-serif',
                                     padding: '16px'
                                   }}
                                   formatter={(value: number, name: string) => [
                                     `UGX ${formatCurrency(value)}`,
                                     name === 'mostLikely' ? 'Most Likely Value' : 
                                     name === 'deposits' ? 'Total Deposits' :
                                     name === 'bestCase' ? 'Best Case Scenario' : 'Worst Case Scenario'
                                   ]}
                                   labelFormatter={(label) => `Year ${label}`}
                                   separator=": "
                                 />
                                 
                                 {/* Area Charts with Professional Styling */}
                                 <Area
                                   type="monotone"
                                   dataKey="deposits"
                                   stroke="#6366f1"
                                   strokeWidth={3}
                                   fill="url(#colorDeposits)"
                                   name="deposits"
                                   strokeDasharray="5 5"
                                 />
                                 <Area
                                   type="monotone"
                                   dataKey="mostLikely"
                                   stroke="#059669"
                                   strokeWidth={4}
                                   fill="url(#colorMostLikely)"
                                   name="mostLikely"
                                 />
                                 <Area
                                   type="monotone"
                                   dataKey="bestCase"
                                   stroke="#10b981"
                                   strokeWidth={2}
                                   fill="url(#colorBestCase)"
                                   name="bestCase"
                                   strokeDasharray="3 3"
                                 />
                                 <Area
                                   type="monotone"
                                   dataKey="worstCase"
                                   stroke="#ef4444"
                                   strokeWidth={2}
                                   fill="url(#colorWorstCase)"
                                   name="worstCase"
                                   strokeDasharray="3 3"
                                 />
                               </AreaChart>
                             </ResponsiveContainer>
                           </div>
                           
                           {/* Professional Legend */}
                           <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-6">
                             <div className="flex flex-wrap justify-center gap-8">
                               <div className="flex items-center space-x-3">
                                 <div className="w-4 h-1 bg-indigo-500 rounded-full"></div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Deposits</span>
                               </div>
                               <div className="flex items-center space-x-3">
                                 <div className="w-4 h-1 bg-emerald-600 rounded-full"></div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Most Likely Value</span>
                               </div>
                               <div className="flex items-center space-x-3">
                                 <div className="w-4 h-1 bg-green-500 rounded-full"></div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Best Case</span>
                               </div>
                               <div className="flex items-center space-x-3">
                                 <div className="w-4 h-1 bg-red-500 rounded-full"></div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Worst Case</span>
                               </div>
                             </div>
                           </div>
                           
                           {/* Performance Metrics */}
                           {simulationData && (
                             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-gray-200 dark:border-gray-700 p-6">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <div className="text-center">
                                   <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                     UGX {formatCurrency(simulationData.summary.mostLikely.finalValue)}
                                   </div>
                                   <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Projected Value</div>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                     UGX {formatCurrency(simulationData.summary.mostLikely.totalReturn)}
                                   </div>
                                   <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Return</div>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                     {((simulationData.summary.mostLikely.totalReturn / simulationData.summary.totalDeposits) * 100).toFixed(1)}%
                                   </div>
                                   <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Return Rate</div>
                                 </div>
                               </div>
                             </div>
                           )}
                         </div>
                       ) : (
                         <div className="text-center py-16">
                           <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl max-w-md mx-auto">
                             <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                               <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                             </div>
                             <div className="text-gray-700 dark:text-gray-300 font-semibold mb-2 text-lg">Ready to Simulate</div>
                             <div className="text-gray-500 dark:text-gray-400 text-sm">
                               Adjust your parameters and run the simulation to see your professional investment projection
                             </div>
                           </div>
                         </div>
                       )}
                     </CardContent>
                   </Card>

                  {/* Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Disclaimer */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-2">
                          <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <CardTitle className="text-gray-900 dark:text-white text-lg">Important Notice</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          These are scenarios for {holdingPeriod} years, not predictions. Investment values may fluctuate. 
                          Past performance doesn't guarantee future results. This simulation illustrates possible outcomes 
                          within reasonable confidence levels.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Get Started */}
                    <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-gray-700 dark:text-white" />
                          <CardTitle className="text-gray-900 dark:text-white text-lg">Ready to Invest?</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Start your investment journey with BoraBond's secure bond platform.
                        </p>
                        <Button 
                          className="w-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 font-semibold"
                          onClick={() => router.push('/dashboard/investment')}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Get Started
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <Footer />
          </div>
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
