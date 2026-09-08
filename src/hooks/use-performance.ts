'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
  isSlowConnection: boolean
  isLowEndDevice: boolean
}

interface UsePerformanceOptions {
  enableLogging?: boolean
  slowConnectionThreshold?: number
  lowEndDeviceThreshold?: number
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    slowConnectionThreshold = 2, // 2G connection
    lowEndDeviceThreshold = 4 // 4GB RAM
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    isSlowConnection: false,
    isLowEndDevice: false
  })

  const startTime = useRef<number>(Date.now())
  const renderStartTime = useRef<number>(Date.now())

  // Detect connection speed
  const detectConnectionSpeed = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const effectiveType = connection.effectiveType
      
      // 4g, 3g, 2g, slow-2g
      const isSlow = ['2g', 'slow-2g'].includes(effectiveType)
      
      if (enableLogging) {
        logger.debug('Connection speed detected:', {
          effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          isSlow
        })
      }
      
      return isSlow
    }
    return false
  }, [enableLogging])

  // Detect device capabilities
  const detectDeviceCapabilities = useCallback(() => {
    const isLowEnd = 
      navigator.hardwareConcurrency <= 2 || // 2 or fewer CPU cores
      (navigator as any).deviceMemory <= lowEndDeviceThreshold || // Low RAM
      window.screen.width <= 768 // Small screen

    if (enableLogging) {
      logger.debug('Device capabilities detected:', {
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        screenWidth: window.screen.width,
        isLowEnd
      })
    }

    return isLowEnd
  }, [lowEndDeviceThreshold, enableLogging])

  // Measure memory usage
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      }
    }
    return null
  }, [])

  // Measure render performance
  const measureRenderTime = useCallback(() => {
    const renderTime = Date.now() - renderStartTime.current
    if (enableLogging) {
      logger.debug('Render time:', renderTime + 'ms')
    }
    return renderTime
  }, [enableLogging])

  // Initialize performance monitoring
  useEffect(() => {
    const initializePerformance = () => {
      const loadTime = Date.now() - startTime.current
      const isSlowConnection = detectConnectionSpeed()
      const isLowEndDevice = detectDeviceCapabilities()
      const memoryUsage = getMemoryUsage()

      setMetrics({
        loadTime,
        renderTime: measureRenderTime(),
        memoryUsage: memoryUsage?.used,
        isSlowConnection,
        isLowEndDevice
      })

      if (enableLogging) {
        logger.debug('Performance metrics initialized:', {
          loadTime,
          isSlowConnection,
          isLowEndDevice,
          memoryUsage
        })
      }
    }

    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      initializePerformance()
    } else {
      window.addEventListener('load', initializePerformance)
      return () => window.removeEventListener('load', initializePerformance)
    }
  }, [detectConnectionSpeed, detectDeviceCapabilities, getMemoryUsage, measureRenderTime, enableLogging])

  // Optimize based on device capabilities
  const getOptimizationSettings = useCallback(() => {
    const { isSlowConnection, isLowEndDevice } = metrics
    
    return {
      // Reduce animations on low-end devices
      reduceAnimations: isLowEndDevice,
      
      // Reduce image quality on slow connections
      reduceImageQuality: isSlowConnection,
      
      // Enable aggressive caching
      enableAggressiveCaching: isSlowConnection || isLowEndDevice,
      
      // Reduce concurrent requests
      maxConcurrentRequests: isSlowConnection ? 2 : 6,
      
      // Enable lazy loading
      enableLazyLoading: true,
      
      // Reduce bundle size
      enableCodeSplitting: isLowEndDevice
    }
  }, [metrics])

  // Preload critical resources
  const preloadResource = useCallback((url: string, type: 'script' | 'style' | 'image' | 'font' = 'script') => {
    if (metrics.isSlowConnection) {
      // Skip preloading on slow connections
      return
    }

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    
    switch (type) {
      case 'script':
        link.as = 'script'
        break
      case 'style':
        link.as = 'style'
        break
      case 'image':
        link.as = 'image'
        break
      case 'font':
        link.as = 'font'
        link.crossOrigin = 'anonymous'
        break
    }
    
    document.head.appendChild(link)
    
    if (enableLogging) {
      logger.debug('Resource preloaded:', { url, type })
    }
  }, [metrics.isSlowConnection, enableLogging])

  // Debounced function for performance monitoring
  const debouncedLog = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (message: string, data?: any) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (enableLogging) {
            logger.debug(message, data)
          }
        }, 1000)
      }
    })(),
    [enableLogging]
  )

  return {
    metrics,
    optimizationSettings: getOptimizationSettings(),
    preloadResource,
    debouncedLog,
    isSlowConnection: metrics.isSlowConnection,
    isLowEndDevice: metrics.isLowEndDevice
  }
}
