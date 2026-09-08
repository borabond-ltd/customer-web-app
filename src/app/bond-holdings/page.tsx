'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, TrendingUp, Calendar, DollarSign } from 'lucide-react'

import { logger } from '@/lib/logger'
interface Bond {
  id: string
  country: string
  bond_name: string
  maturity_date: string
  coupon_rate: number
  principal: number
  yield: number
  purchase_date: string
  created_at: string
}

export default function BondHoldingsPage() {
  const [bonds, setBonds] = useState<Bond[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof Bond>('purchase_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchBonds()
  }, [])

  const fetchBonds = async () => {
    try {
      const response = await fetch('/api/bonds')
      const result = await response.json()
      if (result.success) {
        setBonds(result.data)
      }
    } catch (error) {
      logger.error('Error fetching bonds:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedBonds = bonds
    .filter(bond => 
      bond.bond_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bond.country.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSort = (field: keyof Bond) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
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

  const totalInvestment = bonds.reduce((sum, bond) => sum + bond.principal, 0)
  const averageYield = bonds.length > 0 ? bonds.reduce((sum, bond) => sum + bond.yield, 0) / bonds.length : 0
  const totalCountries = new Set(bonds.map(bond => bond.country)).size

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bond Holdings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track your African government bond investments
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalInvestment.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {bonds.length} bonds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Yield</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageYield.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Portfolio average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Countries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCountries}</div>
              <p className="text-xs text-muted-foreground">
                Diversified portfolio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bonds.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently held
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Bond Holdings</CardTitle>
                <CardDescription>
                  Detailed view of all your African government bond investments
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bonds or countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('country')}
                  >
                    Country
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('bond_name')}
                  >
                    Bond Name
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('maturity_date')}
                  >
                    Maturity Date
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('coupon_rate')}
                  >
                    Coupon Rate
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('principal')}
                  >
                    Principal
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('yield')}
                  >
                    Yield
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('purchase_date')}
                  >
                    Purchase Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedBonds.map((bond) => (
                  <TableRow key={bond.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getCountryFlag(bond.country)}</span>
                        <span>{bond.country}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{bond.bond_name}</TableCell>
                    <TableCell>{new Date(bond.maturity_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bond.coupon_rate}%</Badge>
                    </TableCell>
                    <TableCell>${bond.principal.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {bond.yield}%
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(bond.purchase_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
