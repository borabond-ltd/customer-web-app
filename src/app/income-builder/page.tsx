'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BondInvestment {
  id: string
  country: string
  principal: number
  couponRate: number
  maturityYears: number
}

const countryOptions = [
  { value: 'Nigeria', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'South Africa', label: 'South Africa', flag: '🇿🇦' },
  { value: 'Ghana', label: 'Ghana', flag: '🇬🇭' },
  { value: 'Kenya', label: 'Kenya', flag: '🇰🇪' },
  { value: 'Egypt', label: 'Egypt', flag: '🇪🇬' },
  { value: 'Morocco', label: 'Morocco', flag: '🇲🇦' },
  { value: 'Tunisia', label: 'Tunisia', flag: '🇹🇳' }
]

export default function IncomeBuilderPage() {
  const [investments, setInvestments] = useState<BondInvestment[]>([
    { id: '1', country: 'Nigeria', principal: 50000, couponRate: 8.5, maturityYears: 10 }
  ])
  const [projectionYears, setProjectionYears] = useState(5)

  const addInvestment = () => {
    const newInvestment: BondInvestment = {
      id: Date.now().toString(),
      country: 'Nigeria',
      principal: 10000,
      couponRate: 8.0,
      maturityYears: 5
    }
    setInvestments([...investments, newInvestment])
  }

  const removeInvestment = (id: string) => {
    setInvestments(investments.filter(inv => inv.id !== id))
  }

  const updateInvestment = (id: string, field: keyof BondInvestment, value: any) => {
    setInvestments(investments.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ))
  }

  const calculateAnnualIncome = (investment: BondInvestment) => {
    return (investment.principal * investment.couponRate) / 100
  }

  const calculateTotalAnnualIncome = () => {
    return investments.reduce((total, inv) => total + calculateAnnualIncome(inv), 0)
  }

  const calculateProjectionData = () => {
    const data = []
    const totalIncome = calculateTotalAnnualIncome()
    
    for (let year = 1; year <= projectionYears; year++) {
      const cumulativeIncome = totalIncome * year
      data.push({
        year: `Year ${year}`,
        annualIncome: totalIncome,
        cumulativeIncome: cumulativeIncome
      })
    }
    
    return data
  }

  const projectionData = calculateProjectionData()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income Builder</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Simulate bond investments and project your future income
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${investments.reduce((sum, inv) => sum + inv.principal, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {investments.length} bonds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annual Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${calculateTotalAnnualIncome().toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected yearly income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Yield</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {investments.length > 0 
                  ? (investments.reduce((sum, inv) => sum + inv.couponRate, 0) / investments.length).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio average
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Investment Simulator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Investment Simulator</CardTitle>
                  <CardDescription>
                    Add hypothetical bond investments to see projected income
                  </CardDescription>
                </div>
                <Button onClick={addInvestment} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bond
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {investments.map((investment) => (
                <div key={investment.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Bond Investment</h4>
                    {investments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvestment(investment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`country-${investment.id}`}>Country</Label>
                      <Select
                        value={investment.country}
                        onValueChange={(value) => updateInvestment(investment.id, 'country', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.flag} {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor={`principal-${investment.id}`}>Principal ($)</Label>
                      <Input
                        id={`principal-${investment.id}`}
                        type="number"
                        value={investment.principal}
                        onChange={(e) => updateInvestment(investment.id, 'principal', Number(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`coupon-${investment.id}`}>Coupon Rate (%)</Label>
                      <Input
                        id={`coupon-${investment.id}`}
                        type="number"
                        step="0.1"
                        value={investment.couponRate}
                        onChange={(e) => updateInvestment(investment.id, 'couponRate', Number(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`maturity-${investment.id}`}>Maturity (Years)</Label>
                      <Input
                        id={`maturity-${investment.id}`}
                        type="number"
                        value={investment.maturityYears}
                        onChange={(e) => updateInvestment(investment.id, 'maturityYears', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Annual Income:</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      ${calculateAnnualIncome(investment).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Projection Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income Projection</CardTitle>
                  <CardDescription>
                    Projected income over {projectionYears} years
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="projection-years">Years:</Label>
                  <Input
                    id="projection-years"
                    type="number"
                    min="1"
                    max="20"
                    value={projectionYears}
                    onChange={(e) => setProjectionYears(Number(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${Number(value).toLocaleString()}`, 
                      name === 'annualIncome' ? 'Annual Income' : 'Cumulative Income'
                    ]} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="annualIncome" 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    name="Annual Income"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeIncome" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Cumulative Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Projection Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Projection Summary</CardTitle>
            <CardDescription>
              Key metrics for your {projectionYears}-year projection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${calculateTotalAnnualIncome().toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Annual Income</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${(calculateTotalAnnualIncome() * projectionYears).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Income ({projectionYears} years)</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {((calculateTotalAnnualIncome() * projectionYears) / investments.reduce((sum, inv) => sum + inv.principal, 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Return</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  ${(calculateTotalAnnualIncome() / 12).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
