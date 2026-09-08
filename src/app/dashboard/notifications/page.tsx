'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Search, 
  Filter, 
  MoreVertical, 
  Star, 
  StarOff, 
  Trash2, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Settings,
  Mail,
  MailOpen,
  Clock,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { Layout } from '@/components/layout'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
// Notification types
interface Notification {
  id: string
  title: string
  message: string
  type: 'Transaction' | 'System' | 'Promotion' | 'Alert'
  is_read: boolean
  is_starred: boolean
  created_at: string
  sender?: string
  action_url?: string
  action_text?: string
}

// Sidebar categories
const notificationCategories = [
  { 
    id: 'all', 
    label: 'All Notifications', 
    icon: Bell, 
    count: 0,
    color: 'text-gray-600'
  },
  { 
    id: 'unread', 
    label: 'Unread', 
    icon: Mail, 
    count: 0,
    color: 'text-blue-600'
  },
  { 
    id: 'system', 
    label: 'System Alerts', 
    icon: AlertCircle, 
    count: 0,
    color: 'text-orange-600'
  },
  { 
    id: 'transaction', 
    label: 'Transactions', 
    icon: CreditCard, 
    count: 0,
    color: 'text-green-600'
  },
  { 
    id: 'promotion', 
    label: 'Promotions', 
    icon: TrendingUp, 
    count: 0,
    color: 'text-purple-600'
  }
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const notificationsPerPage = 5

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.user_id) return

      try {
        setIsLoading(true)
        const response = await apiClient.getNotifications(50, false)
        
        if (response.success && response.data) {
          const notificationsData = Array.isArray(response.data) ? response.data : response.data.notifications || []
          setNotifications(notificationsData)
          setFilteredNotifications(notificationsData)
        } else {
          logger.error('Failed to load notifications:', response.message)
          setNotifications([])
          setFilteredNotifications([])
        }
      } catch (error) {
        logger.error('Error loading notifications:', error)
        setNotifications([])
        setFilteredNotifications([])
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [user?.user_id])

  // Filter notifications based on category and search
  useEffect(() => {
    let filtered = notifications

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(notification => {
        switch (selectedCategory) {
          case 'unread':
            return !notification.is_read
          case 'system':
            return notification.type === 'System'
          case 'transaction':
            return notification.type === 'Transaction'
          case 'promotion':
            return notification.type === 'Promotion'
          default:
            return true
        }
      })
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.sender?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredNotifications(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [notifications, selectedCategory, searchTerm])

  // Calculate pagination
  const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage)
  const startIndex = (currentPage - 1) * notificationsPerPage
  const endIndex = startIndex + notificationsPerPage
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex)

  // Update category counts
  useEffect(() => {
    notificationCategories.forEach(category => {
      switch (category.id) {
        case 'all':
          category.count = notifications.length
          break
        case 'unread':
          category.count = notifications.filter(n => !n.is_read).length
          break
        case 'system':
          category.count = notifications.filter(n => n.type === 'System').length
          break
        case 'transaction':
          category.count = notifications.filter(n => n.type === 'Transaction').length
          break
        case 'promotion':
          category.count = notifications.filter(n => n.type === 'Promotion').length
          break
      }
    })
  }, [notifications])

  // Handle notification actions
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await apiClient.markNotificationAsRead(notificationId)
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
      } else {
        logger.error('Failed to mark notification as read:', response.message)
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      const response = await apiClient.markNotificationAsUnread(notificationId)
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: false } : n
          )
        )
      } else {
        logger.error('Failed to mark notification as unread:', response.message)
      }
    } catch (error) {
      logger.error('Error marking notification as unread:', error)
    }
  }

  const handleToggleStar = async (notificationId: string) => {
    try {
      const response = await apiClient.toggleNotificationStar(notificationId)
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_starred: !n.is_starred } : n
          )
        )
      } else {
        logger.error('Failed to toggle notification star:', response.message)
      }
    } catch (error) {
      logger.error('Error toggling notification star:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await apiClient.deleteNotification(notificationId)
      
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        // Close detail panel if deleted notification was selected
        if (selectedNotification?.id === notificationId) {
          setShowDetailPanel(false)
          setSelectedNotification(null)
        }
      } else {
        logger.error('Failed to delete notification:', response.message)
      }
    } catch (error) {
      logger.error('Error deleting notification:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await apiClient.markAllNotificationsAsRead()
      
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        )
      } else {
        logger.error('Failed to mark all notifications as read:', response.message)
      }
    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Transaction':
        return CreditCard
      case 'System':
        return Settings
      case 'Promotion':
        return TrendingUp
      case 'Alert':
        return AlertCircle
      default:
        return Bell
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Transaction':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'System':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'Promotion':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'Alert':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Notifications
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Stay updated with your account activity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={notifications.filter(n => !n.is_read).length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="lg:col-span-1">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Categories</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {notificationCategories.map((category) => {
                      const Icon = category.icon
                      const isActive = selectedCategory === category.id
                      
                      return (
                        <motion.button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                            isActive && "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : category.color)} />
                            <span className={cn(
                              "text-sm font-medium",
                              isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"
                            )}>
                              {category.label}
                            </span>
                          </div>
                          {category.count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {category.count}
                            </Badge>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search notifications..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-gray-500">Loading notifications...</p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Bell className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {searchTerm ? 'No notifications found' : "You're all caught up!"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm 
                          ? 'Try adjusting your search terms'
                          : 'No new notifications at the moment'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        <AnimatePresence>
                          {currentNotifications.map((notification) => {
                            const TypeIcon = getTypeIcon(notification.type)
                            const typeColor = getTypeColor(notification.type)
                            
                            return (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                  "p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group",
                                  !notification.is_read && "bg-blue-50/30 dark:bg-blue-900/10"
                                )}
                                onClick={() => {
                                  setSelectedNotification(notification)
                                  setShowDetailPanel(true)
                                  if (!notification.is_read) {
                                    handleMarkAsRead(notification.id)
                                  }
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Unread indicator */}
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                  )}
                                  
                                  {/* Type icon */}
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0",
                                    typeColor
                                  )}>
                                    <TypeIcon className="h-4 w-4" />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3 className={cn(
                                            "text-sm font-medium truncate",
                                            !notification.is_read ? "font-semibold" : "font-normal"
                                          )}>
                                            {notification.title}
                                          </h3>
                                          {notification.is_starred && (
                                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                          {notification.sender || 'Borabond'}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                          {notification.message}
                                        </p>
                                      </div>
                                      
                                      {/* Timestamp and actions */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-gray-400">
                                          {formatTimestamp(notification.created_at)}
                                        </span>
                                        
                                        {/* Quick actions */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                          {/* Star/Unstar button */}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleToggleStar(notification.id)
                                            }}
                                          >
                                            {notification.is_starred ? (
                                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            ) : (
                                              <Star className="h-3 w-3" />
                                            )}
                                          </Button>
                                          
                                          {/* Mark as read/unread button */}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              notification.is_read 
                                                ? handleMarkAsUnread(notification.id)
                                                : handleMarkAsRead(notification.id)
                                            }}
                                          >
                                            {notification.is_read ? (
                                              <EyeOff className="h-3 w-3" />
                                            ) : (
                                              <Eye className="h-3 w-3" />
                                            )}
                                          </Button>
                                          
                                          {/* Delete button */}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDelete(notification.id)
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                          
                                          {/* More options dropdown */}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  notification.is_read 
                                                    ? handleMarkAsUnread(notification.id)
                                                    : handleMarkAsRead(notification.id)
                                                }}
                                              >
                                                {notification.is_read ? (
                                                  <>
                                                    <EyeOff className="h-4 w-4 mr-2" />
                                                    Mark as Unread
                                                  </>
                                                ) : (
                                                  <>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Mark as Read
                                                  </>
                                                )}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleToggleStar(notification.id)
                                                }}
                                              >
                                                {notification.is_starred ? (
                                                  <>
                                                    <StarOff className="h-4 w-4 mr-2" />
                                                    Remove Star
                                                  </>
                                                ) : (
                                                  <>
                                                    <Star className="h-4 w-4 mr-2" />
                                                    Star
                                                  </>
                                                )}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleDelete(notification.id)
                                                }}
                                                className="text-red-600"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="flex items-center gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="flex items-center gap-1"
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Notification Detail Panel */}
          <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              {selectedNotification && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          getTypeColor(selectedNotification.type)
                        )}>
                          {(() => {
                            const TypeIcon = getTypeIcon(selectedNotification.type)
                            return <TypeIcon className="h-5 w-5" />
                          })()}
                        </div>
                        <div>
                          <DialogTitle className="text-lg">
                            {selectedNotification.title}
                          </DialogTitle>
                          <DialogDescription>
                            {selectedNotification.sender || 'Borabond'} • {formatTimestamp(selectedNotification.created_at)}
                          </DialogDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStar(selectedNotification.id)}
                        >
                          {selectedNotification.is_starred ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleDelete(selectedNotification.id)
                            setShowDetailPanel(false)
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </DialogHeader>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Message</h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {selectedNotification.message}
                      </p>
                    </div>
                    
                    {selectedNotification.action_url && selectedNotification.action_text && (
                      <div className="pt-4">
                        <Button 
                          className="w-full"
                          onClick={() => {
                            window.location.href = selectedNotification.action_url!
                          }}
                        >
                          {selectedNotification.action_text}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}