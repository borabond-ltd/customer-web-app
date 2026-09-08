'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle,
  LogOut,
  Target,
  AlertCircle,
  Shield,
  CreditCard,
  PieChart,
  Receipt,
  Coins,
  Bell,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { usePersona } from '@/contexts/persona-context'
import { useLogout } from '@/hooks/use-logout'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// Investment strategy data types
interface InvestmentStrategy {
  strategy_type: string
  monthly_amount?: number
  created_at?: string
  initial_amount?: number
  reinvest_coupons?: boolean
}
const navigation = [
  // 🏠 Overview
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },

  // 💰 Invest & Grow
  { name: 'Available Bonds', href: '/dashboard/available-bonds', icon: Coins },
  { name: 'Recurring Investment', href: '/dashboard/investment', icon: PieChart },
  { name: 'Bond Holdings', href: '/dashboard/bond-holdings', icon: FileText },

  // 📊 Activity
  // { name: 'Cash Flow', href: '/dashboard/cashflow', icon: DollarSign },
  { name: 'Cash Flow', href: '/cashflow', icon: DollarSign },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Statements', href: '/dashboard/statements', icon: FileSpreadsheet },
  // { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },

  // 🧾 Account
  { name: 'Verify Identity', href: '/dashboard/verify-identity', icon: Shield },
  { name: 'Bank Accounts', href: '/dashboard/bank', icon: CreditCard },

  // ⚙️ Settings
  { name: 'Settings', href: '/settings', icon: Settings },
  // { name: 'Income Builder', href: '/income-builder', icon: TrendingUp },
    // { name: 'Insights', href: '/insights', icon: BarChart3 },

];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const { verificationState } = usePersona()
  const { logout } = useLogout()
  
  // Investment strategy state
  const [investmentStrategy, setInvestmentStrategy] = useState<InvestmentStrategy | null>(null)
  const [strategyLoading, setStrategyLoading] = useState(true)

  const handleToggle = () => {
    setCollapsed(!collapsed)
  }

  const handleSignOut = async () => {
    await logout()
  }

  const handleSupport = () => {

    logger.log('Support clicked')
  }

  // Fetch investment strategy data
  useEffect(() => {
    const fetchInvestmentStrategy = async () => {
      if (!user?.user_id) {
        setStrategyLoading(false)
        return
      }

      try {
        setStrategyLoading(true)
        const response = await apiClient.getInvestmentStrategy()
        
        if (response.success) {
          setInvestmentStrategy(response.data as InvestmentStrategy)
        } else {
          logger.error('Failed to load investment strategy:', response.error)
          setInvestmentStrategy(null)
        }
      } catch (error) {
        logger.error('Error loading investment strategy:', error)
        setInvestmentStrategy(null)
      } finally {
        setStrategyLoading(false)
      }
    }

    fetchInvestmentStrategy()
  }, [user?.user_id])

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out fixed md:relative z-50 md:z-auto",
      "h-full md:h-screen min-h-screen md:min-h-0",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      collapsed ? "w-16" : "w-64 md:w-56"
    )}>
      <div className="flex flex-col h-full">
        {/* Sidebar Header - Logo and Branding */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 sm:w-10 sm:h-10  rounded-xl flex items-center justify-center  transition-all duration-200 hover:scale-105">
                {/* <span className="text-white font-bold text-sm sm:text-base">B</span> */}
              </div> 
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent truncate">
              Dashboard
              </h1> 
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="md:hidden hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors p-2"
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="hidden md:flex hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors p-2"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const isVerificationItem = item.name === 'Verify Identity'
            
            // Get verification status for verification item
            const getVerificationBadge = () => {
              if (!isVerificationItem) return null
              
              switch (verificationState.status) {
                case 'completed':
                  return <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>
                case 'pending':
                  return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Pending</Badge>
                case 'failed':
                  return <Badge variant="destructive" className="text-xs">Failed</Badge>
                case 'cancelled':
                  return <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Cancelled</Badge>
                default:
                  return <Badge variant="outline" className="text-xs">Not Started</Badge>
              }
            }
            
            // Get data-tour attribute for specific items
            const getDataTour = () => {
              switch (item.name) {
                case 'Available Bonds':
                  return 'sidebar-available-bonds'
                case 'Recurring Investment':
                  return 'sidebar-recurring-investments'
                case 'Bond Holdings':
                  return 'sidebar-bond-holdings'
                case 'Verify Identity':
                  return 'identity-verification'
                default:
                  return undefined
              }
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  // Close sidebar on mobile when navigating
                  if (window.innerWidth < 768) {
                    onToggle()
                  }
                }}
                className={cn(
                  "flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm",
                  "min-h-[40px] sm:min-h-[44px]",
                  isActive
                    ? "bg-gradient-to-r from-green-50 to-green-100 text-green-700 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-300 border-l-4 border-green-500"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                )}
                data-tour={getDataTour()}
              >
                <item.icon className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                )} />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate text-sm sm:text-base">{item.name}</span>
                    {getVerificationBadge()}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section - Sticky/Fixed */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-white dark:bg-gray-900">
          {/* Strategy Status - Responsive */}
          {!collapsed && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200 truncate">Strategy</span>
              </div>
              {strategyLoading ? (
                <div className="mt-1 sm:mt-2 h-5 bg-amber-200 dark:bg-amber-800 rounded animate-pulse"></div>
              ) : (
                <Badge 
                  variant="outline" 
                  className="mt-1 sm:mt-2 text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                >
                  {investmentStrategy?.strategy_type ? 
                    investmentStrategy.strategy_type
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ') :
                    'Not Set'
                  }
                </Badge>
              )}
            </div>
          )}

          {/* Bottom Action Buttons - Enhanced */}
          <div className="space-y-1 sm:space-y-2">
            {/* Support Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSupport}
              className={cn(
                "w-full justify-start text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200",
                "py-2 sm:py-2.5 px-2 sm:px-3 text-sm font-medium",
                "hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50",
                "group relative overflow-hidden",
                collapsed && "justify-center px-2 py-2"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/10 transition-all duration-300"></div>
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 relative z-10" />
              {!collapsed && <span className="ml-2 sm:ml-3 truncate relative z-10">Support</span>}
            </Button>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={cn(
                "w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200",
                "py-2 sm:py-2.5 px-2 sm:px-3 text-sm font-medium",
                "hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm",
                "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50",
                "group relative overflow-hidden",
                collapsed && "justify-center px-2 py-2"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-red-500/10 transition-all duration-300"></div>
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 relative z-10" />
              {!collapsed && <span className="ml-2 sm:ml-3 truncate relative z-10">Logout</span>}
            </Button>
          </div>

          {/* Copyright - Responsive */}
          {/* {!collapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1 sm:pt-2">
              © {new Date().getFullYear()} Borabond
            </div>
          )} */}
        </div>
      </div>
    </div>
  )
}
