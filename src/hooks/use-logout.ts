import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

import { logger } from '@/lib/logger'
export function useLogout() {
  const router = useRouter()
  const { signOut } = useAuth()

  const logout = async () => {
    try {
      // Call the auth context signOut
      await signOut()
      
      // Additional cleanup if needed
      // Clear any local storage items
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      sessionStorage.clear()
      
      // Force redirect to sign-in page
      router.push('/auth/signin')
      
      // Fallback redirect using window.location
      setTimeout(() => {
        if (window.location.pathname !== '/auth/signin') {
          window.location.href = '/auth/signin'
        }
      }, 200)
      
    } catch (error) {
      logger.error('Logout error:', error)
      
      // Even if logout fails, force redirect
      router.push('/auth/signin')
      setTimeout(() => {
        window.location.href = '/auth/signin'
      }, 200)
    }
  }

  return { logout }
}
