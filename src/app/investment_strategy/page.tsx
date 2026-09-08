'use client'

import { Layout } from '@/components/layout'
import { AnimatedPage, AnimatedCard } from '@/components/animated-page'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Target, TrendingUp, Shield, Globe, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InvestmentStrategyPage() {
  const router = useRouter()

  const strategies = [
    {
      id: 'conservative',
      name: 'Conservative',
      description: 'Low risk, stable returns',
      yield: '6-8%',
      risk: 'Low',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: Shield
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Moderate risk, balanced returns',
      yield: '8-12%',
      risk: 'Medium',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: Target
    },
    {
      id: 'aggressive',
      name: 'Aggressive',
      description: 'Higher risk, potential for higher returns',
      yield: '12-15%',
      risk: 'High',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      icon: TrendingUp
    }
  ]

  const countries = [
    { name: 'Nigeria', flag: '🇳🇬', bonds: 5, avgYield: '12.5%' },
    { name: 'South Africa', flag: '🇿🇦', bonds: 3, avgYield: '9.8%' },
    { name: 'Ghana', flag: '🇬🇭', bonds: 4, avgYield: '11.2%' },
    { name: 'Kenya', flag: '🇰🇪', bonds: 2, avgYield: '10.5%' },
    { name: 'Egypt', flag: '🇪🇬', bonds: 3, avgYield: '8.9%' }
  ]

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Investment Strategy
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Customize your investment approach and portfolio allocation
            </p>
          </div>

          {/* Current Strategy Overview */}
          <AnimatedCard delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Current Strategy
                </CardTitle>
                <CardDescription>
                  Your current investment allocation and performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">Balanced</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Strategy Type</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">10.2%</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current Yield</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 border rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-orange-600">Medium</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Risk Level</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Strategy Options */}
          <AnimatedCard delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Strategy</CardTitle>
                <CardDescription>
                  Select an investment strategy that matches your risk tolerance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {strategies.map((strategy) => {
                    const IconComponent = strategy.icon
                    return (
                      <div
                        key={strategy.id}
                        className="p-4 sm:p-6 border rounded-lg hover:border-green-300 dark:hover:border-green-600 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                              {strategy.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {strategy.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Expected Yield</span>
                            <span className="font-semibold text-sm sm:text-base text-green-600">{strategy.yield}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Risk Level</span>
                            <Badge className={`${strategy.color} text-xs`}>
                              {strategy.risk}
                            </Badge>
                          </div>
                        </div>
                        
                        <Button className="w-full mt-3 sm:mt-4 text-xs sm:text-sm" variant="outline">
                          Select Strategy
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Country Allocation */}
          <AnimatedCard delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Country Allocation
                </CardTitle>
                <CardDescription>
                  Diversify your portfolio across different African markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {countries.map((country, index) => (
                    <div
                      key={country.name}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{country.flag}</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {country.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {country.bonds} bonds available
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {country.avgYield}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Avg. Yield
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          {/* Action Buttons */}
          <AnimatedCard delay={0.4}>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Apply Strategy
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
