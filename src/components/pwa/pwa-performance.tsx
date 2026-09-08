'use client'

import { useEffect, useState } from 'react'
import { usePerformance } from '@/hooks/use-performance'
import { logger } from '@/lib/logger'

interface PWAPerformanceProps {
  children: React.ReactNode
}

export function PWAPerformance({ children }: PWAPerformanceProps) {
  const { metrics, optimizationSettings, preloadResource, isSlowConnection, isLowEndDevice } = usePerformance()
  const [isOptimized, setIsOptimized] = useState(false)

  useEffect(() => {
    const optimizeForPWA = () => {
      // Preload critical resources
      if (!isSlowConnection) {
        preloadResource('/icons/icon-192x192.png', 'image')
        preloadResource('/icons/icon-512x512.png', 'image')
        preloadResource('/manifest.json', 'script')
      }

      // Optimize images based on connection speed
      if (isSlowConnection) {
        // Use lower quality images for slow connections
        const images = document.querySelectorAll('img')
        images.forEach(img => {
          if (img.src.includes('?') && !img.src.includes('quality=')) {
            img.src += '&quality=50'
          }
        })
      }

      // Reduce animations on low-end devices
      if (isLowEndDevice) {
        document.documentElement.style.setProperty('--animation-duration', '0.1s')
        document.documentElement.style.setProperty('--transition-duration', '0.1s')
      }

      // Enable aggressive caching
      if (optimizationSettings.enableAggressiveCaching) {
        // Set cache headers for static assets
        const links = document.querySelectorAll('link[rel="stylesheet"], script[src]')
        links.forEach(link => {
          if (link instanceof HTMLLinkElement) {
            link.setAttribute('data-cache', 'aggressive')
          }
        })
      }

      setIsOptimized(true)
      logger.debug('PWA performance optimizations applied:', optimizationSettings)
    }

    // Apply optimizations after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(optimizeForPWA, 100)

    return () => clearTimeout(timeoutId)
  }, [isSlowConnection, isLowEndDevice, optimizationSettings, preloadResource])

  // Performance indicator disabled - uncomment to enable in development
  // if (process.env.NODE_ENV === 'development' && isOptimized) {
  //   return (
  //     <>
  //       {children}
  //       <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded-lg font-mono">
  //         <div>Load: {metrics.loadTime}ms</div>
  //         <div>Render: {metrics.renderTime}ms</div>
  //         <div>Memory: {metrics.memoryUsage}MB</div>
  //         <div>Slow: {isSlowConnection ? 'Yes' : 'No'}</div>
  //         <div>Low-end: {isLowEndDevice ? 'Yes' : 'No'}</div>
  //       </div>
  //     </>
  //   )
  // }

  return <>{children}</>
}
