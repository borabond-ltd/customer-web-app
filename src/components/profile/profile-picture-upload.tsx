'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'

interface ProfilePictureUploadProps {
  currentPictureUrl?: string
  userName?: string
  onPictureUpdate?: (newUrl: string | null) => void
  size?: 'sm' | 'md' | 'lg'
}

export function ProfilePictureUpload({ 
  currentPictureUrl, 
  userName = 'User',
  onPictureUpdate,
  size = 'lg'
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imgLoadError, setImgLoadError] = useState<string | null>(null)
  const [refreshingUrl, setRefreshingUrl] = useState(false)
  const [loadingNewImage, setLoadingNewImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24', 
    lg: 'h-32 w-32'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB')
      return
    }

    setError(null)
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await apiClient.uploadProfilePicture(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success) {
        toast.success('Profile picture updated successfully!')
        
        // Clear preview and file input
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        
        // Immediately fetch the new signed URL to show the updated image
        setLoadingNewImage(true)
        try {
          const signedUrlResponse = await apiClient.getProfilePictureSignedUrl()
          if (signedUrlResponse.success) {
            setDisplayUrl((signedUrlResponse.data as any).signed_url)
            onPictureUpdate?.((signedUrlResponse.data as any).signed_url)
          }
        } catch (error) {
          logger.error('Failed to fetch new signed URL:', error)
          // Fallback to the response URL if available
          onPictureUpdate?.(response.url || null)
        } finally {
          setLoadingNewImage(false)
        }
      } else {
        throw new Error(response.error || 'Upload failed')
      }
    } catch (error: any) {
      logger.error('Upload error:', error)
      setError(error.message || 'Failed to upload profile picture')
      toast.error('Failed to upload profile picture')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async () => {
    if (!currentPictureUrl) return

    try {
      const response = await apiClient.deleteProfilePicture()
      
      if (response.success) {
        toast.success('Profile picture removed successfully!')
        onPictureUpdate?.(null)
      } else {
        throw new Error(response.error || 'Delete failed')
      }
    } catch (error: any) {
      logger.error('Delete error:', error)
      toast.error('Failed to remove profile picture')
    }
  }

  const handleCancel = () => {
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const refreshSignedUrl = async () => {
    if (!currentPictureUrl || refreshingUrl) return

    try {
      setRefreshingUrl(true)
      setImgLoadError(null)
      
      // For Google profile pictures, just refresh the display
      if (currentPictureUrl.includes('googleusercontent.com') || currentPictureUrl.includes('googleapis.com')) {
        setDisplayUrl(currentPictureUrl)
        toast.success('Profile picture refreshed')
        return
      }
      
      const response = await apiClient.getProfilePictureSignedUrl()
      
      if (response.success && (response.data as any)?.signed_url) {
        // Update the parent component with the new signed URL
        onPictureUpdate?.((response.data as any).signed_url)
        toast.success('Profile picture refreshed')
      } else {
        throw new Error('Failed to refresh profile picture URL')
      }
    } catch (error) {
      logger.error('Error refreshing signed URL:', error)
      toast.error('Failed to refresh profile picture')
    } finally {
      setRefreshingUrl(false)
    }
  }

  const handleImageError = () => {
    setImgLoadError('Failed to load image. The URL may have expired.')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Use preview URL or fetch signed URL for current profile picture
  const [displayUrl, setDisplayUrl] = useState<string | null>(previewUrl || null)
  
  // Fetch signed URL for current profile picture or use direct URL for Google pictures
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (currentPictureUrl && !previewUrl) {
        // Check if it's a Google profile picture (contains googleusercontent.com)
        if (currentPictureUrl.includes('googleusercontent.com') || currentPictureUrl.includes('googleapis.com')) {
          logger.debug('Using Google profile picture directly:', currentPictureUrl)
          setDisplayUrl(currentPictureUrl)
          return
        }
        
        // For other profile pictures, fetch signed URL
        try {
          logger.debug('Fetching signed URL for profile picture:', currentPictureUrl)
          const response = await apiClient.getProfilePictureSignedUrl()
          logger.debug('Signed URL response:', response)
          
          if (response.success) {
            setDisplayUrl((response.data as any).signed_url)
            logger.debug('Profile picture signed URL set:', (response.data as any).signed_url)
          } else {
            logger.error('Failed to get signed URL:', response.error)
            setDisplayUrl(null)
          }
        } catch (error) {
          logger.error('Failed to fetch profile picture signed URL:', error)
          setDisplayUrl(null)
        }
      } else if (!currentPictureUrl) {
        logger.debug('No current picture URL, setting displayUrl to null')
        setDisplayUrl(null)
      }
    }
    
    fetchSignedUrl()
  }, [currentPictureUrl, previewUrl])

  return (
    <Card className="w-fit">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar Display */}
          <div className="relative">
            <Avatar className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700`}>
              <AvatarImage 
                src={displayUrl || undefined}
                alt={userName}
                className="object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={handleImageError}
                onLoad={() => setImgLoadError(null)}
              />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <div className="text-center text-white">
                  <div className="text-xs mb-1">{uploadProgress}%</div>
                  <Progress value={uploadProgress} className="w-16 h-1" />
                </div>
              </div>
            )}
            
            {/* Loading New Image Overlay */}
            {loadingNewImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                  <div className="text-xs">Loading...</div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {(error || imgLoadError) && (
            <div className="flex flex-col items-center space-y-2 text-red-600 dark:text-red-400 text-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error || imgLoadError}</span>
              </div>
              {imgLoadError && currentPictureUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshSignedUrl}
                  disabled={refreshingUrl}
                  className="text-xs"
                >
                  {refreshingUrl ? (
                    <>
                      <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Image'
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 w-full">
            {!previewUrl && !isUploading && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className={`${iconSizes[size]} mr-2`} />
                  {currentPictureUrl ? 'Change Picture' : 'Upload Picture'}
                </Button>
                
                {currentPictureUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                  >
                    <X className={`${iconSizes[size]} mr-2`} />
                    Remove Picture
                  </Button>
                )}
              </>
            )}

            {previewUrl && !isUploading && (
              <>
                <Button
                  onClick={handleUpload}
                  className="w-full"
                >
                  <Upload className={`${iconSizes[size]} mr-2`} />
                  Upload Picture
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="w-full"
                >
                  <X className={`${iconSizes[size]} mr-2`} />
                  Cancel
                </Button>
              </>
            )}

            {isUploading && (
              <Button disabled className="w-full">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </div>
              </Button>
            )}
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-48">
            <p>Supported formats: JPEG, PNG, GIF, WebP</p>
            <p>Maximum size: 5MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
