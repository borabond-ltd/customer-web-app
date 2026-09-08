'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wifi, WifiOff, RefreshCw, Home, Smartphone } from 'lucide-react'
import { motion } from 'framer-motion'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Initial check
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    if (navigator.onLine) {
      router.refresh()
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 p-4 rounded-full bg-red-100 dark:bg-red-900/20"
            >
              {isOnline ? (
                <Wifi className="h-12 w-12 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-12 w-12 text-red-600 dark:text-red-400" />
              )}
            </motion.div>
            
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
            </CardTitle>
            
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {isOnline 
                ? 'Great! Your connection is back. You can continue using BoraBond.'
                : 'It looks like you\'re not connected to the internet. Don\'t worry, some features are still available offline.'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Offline Features Available
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• View cached portfolio data</li>
                  <li>• Access previously loaded pages</li>
                  <li>• Use app navigation</li>
                  <li>• View cached bond information</li>
                </ul>
              </motion.div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRetry}
                disabled={!isOnline && retryCount > 2}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${!isOnline && retryCount > 2 ? 'animate-spin' : ''}`} />
                {isOnline ? 'Refresh Page' : 'Try Again'}
              </Button>

              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </div>

            {!isOnline && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-sm text-gray-500 dark:text-gray-400"
              >
                <p>Retry attempts: {retryCount}/3</p>
                {retryCount > 2 && (
                  <p className="text-red-500 dark:text-red-400 mt-1">
                    Please check your internet connection
                  </p>
                )}
              </motion.div>
            )}

            {isOnline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  ✓ Connection restored successfully
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400"
        >
          <p>BoraBond PWA - Works offline for better experience</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
