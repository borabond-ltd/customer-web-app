'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Navbar } from './navbar'
import { Sidebar } from './sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Loader2 } from 'lucide-react'
import { InvestmentSelectionModal } from '@/components/investment/investment-selection-modal'

import { logger } from '@/lib/logger'

function hasStoredAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(apiClient.getToken() || localStorage.getItem('auth_token'))
}

interface LayoutProps {
  children: React.ReactNode
  onInvestNow?: () => void
}

export function Layout({ children, onInvestNow }: LayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)

  // Default Invest Now handler - show investment modal
  const defaultInvestNow = () => {
    setShowInvestmentModal(true)
  }

  // Debug logging
  logger.log('Layout render:', { user: !!user, loading, userEmail: user?.email })

  useEffect(() => {
    if (loading) return

    if (!user && !hasStoredAuthToken()) {
      logger.log('No user or stored token, redirecting to signin')
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Show loading state with better styling
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">If this takes too long, try refreshing the page</p>
        </div>
      </div>
    )
  }

  if (!user && hasStoredAuthToken()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Restoring your session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 dark:text-red-400 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to access the dashboard</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} onInvestNow={onInvestNow || defaultInvestNow} />
      
      <div className="flex relative w-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 min-w-0 transition-all duration-300 w-full">
          <div className="w-full max-w-none sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      <Toaster />
      
      {/* Investment Selection Modal */}
      <InvestmentSelectionModal 
        isOpen={showInvestmentModal}
        onClose={() => setShowInvestmentModal(false)}
      />
    </div>
  )
}
