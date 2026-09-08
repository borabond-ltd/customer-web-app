'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLogout } from '@/hooks/use-logout'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown'
import { Logo } from '@/components/logo'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'

interface NavbarProps {
  onMenuToggle: () => void
  isSidebarOpen: boolean
  onInvestNow?: () => void
}

export function Navbar({ onMenuToggle, isSidebarOpen, onInvestNow }: NavbarProps) {
  const { user } = useAuth()
  const { logout } = useLogout()
  const { theme, setTheme } = useTheme()
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleSignOut = async () => {
    await logout()
  }

  // Handle profile picture display
  useEffect(() => {
    const handleProfilePicture = async () => {
      if (user?.profile_picture_url) {
        // Check if it's a Google profile picture (contains googleusercontent.com)
        if (user.profile_picture_url.includes('googleusercontent.com') || user.profile_picture_url.includes('googleapis.com')) {
          logger.debug('Using Google profile picture directly in navbar:', user.profile_picture_url)
          setProfilePictureUrl(user.profile_picture_url)
          return
        }
        
        // For other profile pictures, fetch signed URL
        try {
          logger.debug('Fetching signed URL for navbar profile picture:', user.profile_picture_url)
          const response = await apiClient.getProfilePictureSignedUrl()
          
          if (response.success) {
            setProfilePictureUrl((response.data as any).signed_url)
            logger.debug('Navbar profile picture signed URL set:', (response.data as any).signed_url)
          } else {
            logger.error('Failed to get signed URL for navbar:', response.error)
            setProfilePictureUrl(null)
          }
        } catch (error) {
          logger.error('Failed to fetch profile picture signed URL for navbar:', error)
          setProfilePictureUrl(null)
        }
      } else {
        setProfilePictureUrl(null)
      }
    }
    
    handleProfilePicture()
  }, [user?.profile_picture_url])

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 py-3 sm:py-4 sticky top-0 z-30 shadow-sm relative w-full">
      {/* Logo - Top Left Corner Above Sidebar */}
      <div className="absolute top-4 left-4 z-50 hidden sm:block">
        <Logo size="md" />
      </div>
      
      <div className="flex items-center justify-between w-full px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Left Side - Mobile Menu Button and Logo */}
        <div className="flex items-center">
          {/* Mobile Hamburger Menu - Always shows hamburger icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="md:hidden p-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors mr-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md"
            title="Open Menu"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>
          
          {/* Mobile Logo - Next to hamburger menu */}
          <div className="sm:hidden">
            <Logo size="sm" />
          </div>

          {/* Personalized Greeting */}
          {user && (
            <div className="hidden lg:block ml-12 pl-8 border-l border-gray-200 dark:border-gray-700">
              {/* <p className="text-base font-medium text-gray-900 dark:text-white">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.full_name ? user.full_name.split(' ')[0] : 'User'}
              </p> */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {/* Signed in as: {user.email} */}
              </p>
            </div>
          )}
        </div>

        {/* Right Side - Action Buttons and Controls */}
        <div className="flex items-center space-x-3">
          {/* Invest Now Button */}
          <Button
            onClick={onInvestNow || (() => logger.debug('Invest Now clicked - no handler provided'))}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 hover:scale-105 shadow-md"
          >
            Invest Now
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors rounded-lg"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Moon className="h-5 w-5 text-green-600 dark:text-green-400" />}
          </Button>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Profile */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-105">
                  <Avatar className="h-10 w-10 ring-2 ring-green-100 dark:ring-green-900/30 hover:ring-green-200 dark:hover:ring-green-800/50 transition-all">
                    <AvatarImage 
                      src={profilePictureUrl || undefined} 
                      alt={user.full_name || user.email || ''}
                      className="object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-green-500 to-green-600 text-white">
                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}
