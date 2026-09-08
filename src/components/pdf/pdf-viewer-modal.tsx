'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface PDFViewerModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  title?: string
  fileName?: string
}

export function PDFViewerModal({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  title = "Document Viewer",
  fileName = "document.pdf"
}: PDFViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setHasError(false)
      setZoom(100)
      setRotation(0)
      setIsFullscreen(false)
    }
  }, [isOpen])

  const handleDownload = () => {
    try {
      // Create a temporary link to download the PDF
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = fileName
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Download started')
    } catch (error) {
      logger.error('Download error:', error)
      toast.error('Failed to download document')
    }
  }

  const handleOpenInNewTab = () => {
    try {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      logger.error('Open in new tab error:', error)
      toast.error('Failed to open document')
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  const handlePDFLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handlePDFError = () => {
    setIsLoading(false)
    setHasError(true)
    toast.error('Failed to load PDF document')
  }

  // Generate a safe URL for the PDF
  const safePdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `https://${pdfUrl}`
  
  // Check if this is a signed URL (contains AWS signature parameters)
  const isSignedUrl = safePdfUrl.includes('X-Amz-Signature') || safePdfUrl.includes('AWSAccessKeyId')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh] w-[90vw]'} p-0`}
      >
        <DialogHeader className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {title}
                </DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">
                  {fileName}
                </p>
              </div>
            </div>
            
            {/* Toolbar */}
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="secondary" className="px-2 py-1 text-xs">
                  {zoom}%
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Rotate Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 border-l pl-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="h-8 px-3"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 px-3"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Failed to Load Document
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  The document could not be loaded. This might be due to:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 text-left max-w-md mx-auto mb-4">
                  <li>• Network connectivity issues</li>
                  <li>• Document access permissions</li>
                  <li>• Invalid document URL</li>
                </ul>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenInNewTab}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Try Opening in New Tab</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Instead</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!hasError && (
            <div 
              className="h-full overflow-auto"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <iframe
                src={`${safePdfUrl}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&messages=0&scrollbar=1`}
                className="w-full h-full border-0"
                onLoad={handlePDFLoad}
                onError={handlePDFError}
                title={title}
                style={{
                  minHeight: '600px',
                  width: '100%'
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Zoom: {zoom}%</span>
              {rotation > 0 && <span>Rotation: {rotation}°</span>}
            </div>
            <div className="flex items-center space-x-2">
              <span>Powered by</span>
              <Badge variant="outline" className="text-xs">
                PDF.js
              </Badge>
              {isSignedUrl && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    Secure Access
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
