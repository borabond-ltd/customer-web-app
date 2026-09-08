'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PerformanceMetrics {
  renderTime: number
  interactionTime: number
  memoryUsage?: number
  bundleSize?: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return
    
    const startTime = performance.now()
    
    // Measure render time
    const measureRenderTime = () => {
      const renderTime = performance.now() - startTime
      
      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize
      
      setMetrics({
        renderTime: Math.round(renderTime * 100) / 100,
        interactionTime: 0,
        memoryUsage: memoryUsage ? Math.round(memoryUsage / 1024 / 1024) : undefined
      })
    }
    
    // Measure after initial render
    requestAnimationFrame(measureRenderTime)
    
    // Show/hide with keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  if (!metrics || !isVisible) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 backdrop-blur-sm"
      >
        <div className="space-y-1">
          <div className="text-green-400 font-bold">Performance Metrics</div>
          <div>Render: {metrics.renderTime}ms</div>
          {metrics.memoryUsage && (
            <div>Memory: {metrics.memoryUsage}MB</div>
          )}
          <div className="text-gray-400 text-xs mt-2">
            Press Ctrl+Shift+P to toggle
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
