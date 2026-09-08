'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'

function hasStoredAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(apiClient.getToken() || localStorage.getItem('auth_token'))
}
import { Loader2, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated && !hasStoredAuthToken()) {
      setIsRedirecting(true)
      router.replace('/auth/signin')
      setTimeout(() => {
        if (window.location.pathname !== '/auth/signin') {
          window.location.href = '/auth/signin'
        }
      }, 100)
    }
  }, [isAuthenticated, loading, router])

  if (loading || (!isAuthenticated && hasStoredAuthToken())) {
    return (
      fallback || (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
                <Shield className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-500" />
              </div>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 dark:text-gray-400 text-lg"
            >
              Verifying authentication...
            </motion.p>
          </div>
        </motion.div>
      )
    )
  }

  if (isRedirecting) {
    return (
      <motion.div 
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mb-4"
          >
            <Shield className="h-8 w-8 mx-auto text-green-600" />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </motion.div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect via useEffect
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
