'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { PWAPerformance } from './pwa-performance'

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Register service worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          setSwRegistration(registration)
          logger.debug('Service Worker registered successfully:', registration)
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, refresh the page
                  logger.debug('New content available, refreshing...')
                  window.location.reload()
                }
              })
            }
          })
        } catch (error) {
          logger.error('Service Worker registration failed:', error)
        }
      }
    }

    // Handle online/offline status
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      logger.debug('Online status changed:', navigator.onLine)
    }

    // Initial setup
    setIsOnline(navigator.onLine)
    registerSW()

    // Event listeners
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    return () => {
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
    }
  }, [])

  // Show offline indicator when offline
  useEffect(() => {
    if (!isOnline) {
      logger.debug('App is offline')
    }
  }, [isOnline])

  return (
    <PWAPerformance>
      {children}
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
            </svg>
            You're offline. Some features may be limited.
          </span>
        </div>
      )}
    </PWAPerformance>
  )
}
