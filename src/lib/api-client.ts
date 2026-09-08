import { logger } from './logger'

/**
 * All customer-app traffic goes through api-gateway `/api/v1`.
 * Accepts `.../api/v1`, `.../api`, or a host-only value.
 */
function resolveApiBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    'http://localhost:9000/api/v1'
  )
    .trim()
    .replace(/\/$/, '')

  if (!raw) {
    return 'http://localhost:9000/api/v1'
  }
  if (/\/api\/v1$/i.test(raw)) {
    return raw
  }
  if (/\/api$/i.test(raw)) {
    return `${raw}/v1`
  }
  return `${raw}/api/v1`
}

const API_BASE_URL = resolveApiBaseUrl()

interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private refreshToken: string | null = null
  private isRefreshing: boolean = false
  private refreshPromise: Promise<string | null> | null = null

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    // Load tokens from all available storage locations
    if (typeof window !== 'undefined') {
      // Try to load from any available storage - this will set this.token internally
      this.getToken()
      this.getRefreshToken()
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        // Store in localStorage for client-side access
        localStorage.setItem('auth_token', token)
        
        // Set cookie with proper attributes for server-side middleware access
        const isSecure = window.location.protocol === 'https:'
        const expiry = 7 * 24 * 60 * 60 // 7 days in seconds
        const cookieString = `auth-token=${token}; path=/; max-age=${expiry}; ${isSecure ? 'secure;' : ''} samesite=strict`
        document.cookie = cookieString
        
        // Set a temporary flag to indicate recent authentication
        const authFlag = `auth-flag=${Date.now()}; path=/; max-age=60; ${isSecure ? 'secure;' : ''} samesite=strict`
        document.cookie = authFlag
        
        logger.log('Auth token set in storage and cookie:', cookieString)
        logger.log('Auth flag set:', authFlag)
        
        // Also attempt to set session storage for additional redundancy
        try {
          sessionStorage.setItem('auth_token', token)
        } catch (e) {
          logger.error('Failed to set sessionStorage item:', e)
        }
      } else {
        // Clear all storage locations
        localStorage.removeItem('auth_token')
        try { sessionStorage.removeItem('auth_token') } catch (e) {}
        
        // Clear the cookie by setting expired date
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict'
        document.cookie = 'auth-flag=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict'
        logger.log('Auth token cleared from all storage locations')
      }
    }
  }

  setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken
    if (typeof window !== 'undefined') {
      if (refreshToken) {
        // Store refresh token in localStorage (more persistent than sessionStorage)
        localStorage.setItem('refresh_token', refreshToken)
        logger.log('Refresh token stored in localStorage')
      } else {
        // Clear refresh token
        localStorage.removeItem('refresh_token')
        logger.log('Refresh token cleared from storage')
      }
    }
  }

  getRefreshToken(): string | null {
    // If we already have a refresh token in memory, return it
    if (this.refreshToken) {
      return this.refreshToken
    }

    // Otherwise, try to get from storage (if in browser)
    if (typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        this.refreshToken = refreshToken
      }
      return refreshToken
    }
    
    return null
  }

  getToken(): string | null {
    // If we already have a token in memory, return it
    if (this.token) {
      logger.log('🔑 Token found in memory')
      return this.token
    }

    // Otherwise, try to get from storage (if in browser)
    if (typeof window !== 'undefined') {
      // Try localStorage first
      let token = localStorage.getItem('auth_token')
      logger.log('🔍 Checking localStorage for token:', token ? 'found' : 'not found')
      
      // Try sessionStorage if not in localStorage
      if (!token) {
        try {
          token = sessionStorage.getItem('auth_token')
          logger.log('🔍 Checking sessionStorage for token:', token ? 'found' : 'not found')
        } catch (e) {
          logger.log('🔍 sessionStorage not available')
        }
      }
      
      // Try cookie if not in storage
      if (!token) {
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === 'auth-token' && value) {
            token = value
            logger.log('🔍 Token found in cookie')
            break
          }
        }
        if (!token) {
          logger.log('🔍 No token found in cookies')
        }
      }
      
      // Set the token in memory if found
      if (token) {
        this.token = token
        logger.log('✅ Token loaded from storage and set in memory')
      } else {
        logger.log('❌ No token found in any storage location')
      }
      
      return token || null
    }
    
    logger.log('❌ Not in browser environment, no token available')
    return null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnTokenExpiry: boolean = true,
    baseURLOverride?: string
  ): Promise<ApiResponse<T>> {
    const requestBase = (baseURLOverride || this.baseURL).replace(/\/$/, '')
    const url = `${requestBase}${endpoint}`
    
    // Generate unique request ID for debugging
    const requestId = Math.random().toString(36).substring(2, 8)
    
    // Log the request for debugging
    logger.log(`🌐 API Request [${requestId}]: ${options.method || 'GET'} ${endpoint}`, {
      baseURL: requestBase,
    })
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add Authorization header if token exists and not already provided
    const token = this.getToken() // Ensure token is loaded from storage
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`
      logger.log('🔑 Authorization header added to request:', endpoint)
    } else if (!token) {
      logger.warn('⚠️ No token available for request:', endpoint)
    }
    
    const config: RequestInit = {
      headers,
      credentials: 'include', // Include cookies in requests
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      // Handle token expiry - try to refresh token and retry request
      if (response.status === 401 && retryOnTokenExpiry && this.getRefreshToken()) {
        logger.log('Token expired, attempting to refresh...')
        const newToken = await this.refreshAccessToken()
        if (newToken) {
          // Retry the request with the new token
          headers.Authorization = `Bearer ${newToken}`
          const retryConfig: RequestInit = {
            ...config,
            headers
          }
          const retryResponse = await fetch(url, retryConfig)
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            return retryData
          } else {
            // If retry also fails, handle the error properly
            logger.log('Retry request also failed:', retryResponse.status)
            let retryErrorMessage = `HTTP error! status: ${retryResponse.status}`
            let retryErrorDetails: any = null
            
            try {
              const retryErrorData = await retryResponse.json()
              retryErrorMessage = retryErrorData.message || retryErrorData.error || retryErrorMessage
              retryErrorDetails = retryErrorData
            } catch (parseError) {
              retryErrorMessage = retryResponse.statusText || retryErrorMessage
              // try to read raw text for better diagnostics
              try {
                const raw = await retryResponse.clone().text()
                retryErrorDetails = { raw }
              } catch {}
            }
            
            const retryApiError: ApiError = {
              message: retryErrorMessage,
              status: retryResponse.status,
              code: retryResponse.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
              details: retryErrorDetails
            }
            
            logger.error('Retry request failed:', {
              url,
              status: retryResponse.status,
              message: retryErrorMessage,
              details: retryErrorDetails
            })
            
            throw retryApiError
          }
        } else {
          // Token refresh failed, clear tokens and redirect to login
          logger.log('Token refresh failed, clearing tokens')
          this.setToken(null)
          this.setRefreshToken(null)
          
          // Dispatch custom event to notify components about auth failure
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:token-expired'))
          }
        }
      }
      
      // Handle network errors
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        let errorDetails: any = null
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
          errorDetails = errorData
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage
          // try to read raw body for diagnostics
          try {
            const raw = await response.clone().text()
            if (raw) {
              errorDetails = { 
                raw,
                parseError: parseError instanceof Error ? parseError.message : String(parseError)
              }
            }
          } catch (textError) {
            errorDetails = { 
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
              textError: textError instanceof Error ? textError.message : String(textError)
            }
          }
        }
        
        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          code: response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
          details: errorDetails || undefined
        }
        
        // logger.error(`❌ API request failed [${requestId}]:`, {
        //   url,
        //   status: response.status,
        //   statusText: response.statusText,
        //   message: errorMessage,
        //   details: apiError.details,
        //   errorData: errorDetails,
        //   responseHeaders: Object.fromEntries(response.headers.entries()),
        //   requestId
        // })
        
        throw apiError
      }

      // Parse successful response
      const data = await response.json()
      logger.log(`✅ API request successful [${requestId}]: ${options.method || 'GET'} ${endpoint}`)
      return this.wrapResponse<T>(data)
    } catch (error) {
      // Handle network errors (no response from server)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiError = {
          message: 'Network error. Please check your connection and try again.',
          code: 'NETWORK_ERROR'
        }
        logger.error('Network error:', networkError)
        throw networkError
      }
      
      // Re-throw API errors as-is
      if (error && typeof error === 'object' && 'message' in error) {
        throw error
      }
      
      // Handle unexpected errors
      const unexpectedError: ApiError = {
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNEXPECTED_ERROR',
        details: {
          originalError: error,
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        }
      }
      logger.error(`❌ Unexpected error [${requestId}]:`, {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        url,
        requestId
      })
      throw unexpectedError
    }
  }

  /** Nest handlers that omit `{ success }` are wrapped so callers can keep using ApiResponse. */
  private wrapResponse<T>(data: any): ApiResponse<T> {
    if (data && typeof data === 'object' && typeof data.success === 'boolean') {
      return data as ApiResponse<T>
    }
    return { success: true, message: 'OK', data: data as T }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        logger.log('No refresh token available')
        return null
      }

      logger.log('Refreshing access token...')
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        logger.log('Token refresh failed:', response.status)
        // Clear tokens if refresh fails
        this.setToken(null)
        this.setRefreshToken(null)
        return null
      }

      const data = await response.json()
      logger.log('Token refresh response:', data)
      
      if (data.success && data.data?.tokens?.accessToken) {
        logger.log('Token refreshed successfully')
        this.setToken(data.data.tokens.accessToken)
        
        // Update refresh token if provided
        if (data.data.tokens.refreshToken) {
          this.setRefreshToken(data.data.tokens.refreshToken)
        }
        
        return data.data.tokens.accessToken
      } else if (data.success && data.data?.accessToken) {
        // Fallback for different response structure
        logger.log('Token refreshed successfully (fallback)')
        this.setToken(data.data.accessToken)
        
        // Update refresh token if provided
        if (data.data.refreshToken) {
          this.setRefreshToken(data.data.refreshToken)
        }
        
        return data.data.accessToken
      }

      logger.log('Token refresh response invalid:', data)
      return null
    } catch (error) {
      logger.error('Token refresh error:', error)
      // Clear tokens on error
      this.setToken(null)
      this.setRefreshToken(null)
      return null
    }
  }

  // Authentication endpoints
  async signUp(userData: {
    email: string
    password: string
    full_name?: string
    first_name?: string
    last_name?: string
    phone?: string
    phoneVerificationToken: string
  }) {
    const payload = {
      ...userData,
      phone_verification_token: userData.phoneVerificationToken,
    }
    delete (payload as any).phoneVerificationToken

    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async sendPhoneVerificationCode(phoneNumber: string) {
    return this.request('/auth/phone/send-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    })
  }

  async verifyPhoneVerificationCode(phoneNumber: string, code: string) {
    return this.request<{ verificationToken: string }>('/auth/phone/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    })
  }

  async signIn(credentials: {
    email: string
    password: string
  }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  /** GIS: exchange a verified Google ID token for identity-service JWT. */
  async signInWithGoogleIdToken(idToken: string) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
  }

  async signOut() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token: string, password: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  // User endpoints
  async getMe(token?: string) {
    if (token) {
      return this.request('/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } else {
      // Use the token from the API client's internal state
      return this.request('/me')
    }
  }

  async getCurrentUser() {
    return this.request('/me')
  }

  // Debug method to check token status
  debugTokenStatus() {
    const token = this.getToken()
    logger.log('🔍 Token Debug Status:')
    logger.log('   Token in memory:', this.token ? 'present' : 'missing')
    logger.log('   Token from getToken():', token ? 'present' : 'missing')
    logger.log('   Token value:', token ? token.substring(0, 20) + '...' : 'none')
    
    if (typeof window !== 'undefined') {
      const localStorageToken = localStorage.getItem('auth_token')
      const sessionStorageToken = sessionStorage.getItem('auth_token')
      logger.log('   localStorage token:', localStorageToken ? 'present' : 'missing')
      logger.log('   sessionStorage token:', sessionStorageToken ? 'present' : 'missing')
      
      // Check cookies
      const cookies = document.cookie.split(';')
      let cookieToken = null
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'auth-token' && value) {
          cookieToken = value
          break
        }
      }
      logger.log('   cookie token:', cookieToken ? 'present' : 'missing')
    }
    
    return {
      memoryToken: this.token,
      getTokenResult: token,
      localStorageToken: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
      sessionStorageToken: typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null
    }
  }

  // Debug method to check API request details
  debugApiRequest(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken()
    const url = `${this.baseURL}${endpoint}`
    
    logger.log('🔍 API Request Debug:')
    logger.log('   URL:', url)
    logger.log('   Method:', options.method || 'GET')
    logger.log('   Headers:', options.headers)
    logger.log('   Token present:', token ? 'yes' : 'no')
    logger.log('   Token preview:', token ? token.substring(0, 20) + '...' : 'none')
    logger.log('   Base URL:', this.baseURL)
    logger.log('   Endpoint:', endpoint)
    
    return {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      baseURL: this.baseURL,
      endpoint
    }
  }

  async getOnboardingStatus(_userId?: string): Promise<ApiResponse> {
    return this.request('/users/me/onboarding-status')
  }

  async addPhoneNumber(phone: string, phoneVerificationToken: string): Promise<ApiResponse<{ user: any }>> {
    return this.request<{ user: any }>('/users/add-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, phoneVerificationToken }),
    })
  }

  // Investment endpoints
  async getInvestmentStrategy(): Promise<ApiResponse> {
    return this.request('/investment/strategy', {
      method: 'GET',
    })
  }

  async saveInvestmentStrategy(investmentData: any): Promise<ApiResponse> {
    return this.request('/investment/save-strategy', {
      method: 'POST',
      body: JSON.stringify(investmentData),
    })
  }

  async getInvestmentStrategyWithConversion(currency: string = 'UGX'): Promise<ApiResponse> {
    const [strategyResponse, rateResponse] = await Promise.all([
      this.getInvestmentStrategy(),
      this.getExchangeRate(currency),
    ])
    if (!strategyResponse.success) {
      return strategyResponse
    }
    const strategy = (strategyResponse.data || {}) as Record<string, any>
    const rate = Number((rateResponse.data as any)?.rate_to_usd ?? (rateResponse.data as any)?.rate ?? 0)
    const monthlyUsd = Number(strategy.monthly_amount_usd ?? strategy.monthly_amount ?? 0)
    return {
      success: true,
      message: strategyResponse.message,
      data: {
        ...strategy,
        monthly_amount_usd: monthlyUsd,
        monthly_amount_ugx: rate > 0 ? monthlyUsd * rate : strategy.monthly_amount_ugx,
        rate_to_usd: rate || strategy.rate_to_usd,
      },
    }
  }

  // Currency conversion endpoints
  async getExchangeRate(currencyCode: string): Promise<ApiResponse> {
    return this.request(`/exchange-rate/${currencyCode}`, {
      method: 'GET',
    })
  }

  async convertCurrency(usdAmount: number, targetCurrency: string): Promise<ApiResponse> {
    return this.request('/exchange-rate/convert', {
      method: 'POST',
      body: JSON.stringify({
        usdAmount: usdAmount,
        targetCurrency: targetCurrency
      }),
    })
  }

  // Investment quote endpoints
  async createInvestmentQuote(quoteData: {
    selectedBonds: Array<{ bondId: string; amount: number }>
    totalAmount: number
  }): Promise<ApiResponse> {
    return this.request('/quotes', {
      method: 'POST',
      body: JSON.stringify(quoteData),
    })
  }

  // Purchase confirmation endpoints
  async confirmPurchase(purchaseData: {
    amount: number
    bondData: Array<{ bondId: string; amount: number; display_name?: string; name?: string }>
  }): Promise<ApiResponse> {
    return this.request('/purchase/confirm', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    })
  }

  // Transaction endpoints
  async getTransactions(params?: {
    status?: string
    sortBy?: string
    limit?: number
    page?: number
    search?: string
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    return this.request(`/portfolio/transactions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    })
  }

  async getTransactionById(transactionId: string): Promise<ApiResponse> {
    return this.request(`/portfolio/transactions/${transactionId}`, {
      method: 'GET',
    })
  }

  async getTransactionStats(): Promise<ApiResponse> {
    return this.request('/portfolio/transactions/stats', {
      method: 'GET',
    })
  }

  async exportTransactionsToCSV(params?: {
    status?: string
    sortBy?: string
  }): Promise<Blob> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    
    const response = await fetch(`${this.baseURL}/portfolio/transactions/export/csv${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to export transactions')
    }

    return response.blob()
  }

  // Monthly Deposit endpoints
  async getMonthlyDepositStatus(): Promise<ApiResponse> {
    return this.request('/monthlyDeposit/status', {
      method: 'GET',
    })
  }

  async getMonthlyDepositJobs(): Promise<ApiResponse> {
    return this.request('/monthlyDeposit/jobs', {
      method: 'GET',
    })
  }

  async scheduleMonthlyDeposit(monthlyAmount: number): Promise<ApiResponse> {
    return this.request('/monthlyDeposit/schedule', {
      method: 'POST',
      body: JSON.stringify({ monthlyAmount }),
    })
  }

  async submitCouponAction(purchaseId: string, action: 'withdraw' | 'reinvest'): Promise<ApiResponse> {
    return this.request('/coupons/action', {
      method: 'POST',
      body: JSON.stringify({ purchase_id: purchaseId, action })
    })
  }

  async getUserAgreements(): Promise<ApiResponse> {
    return this.request('/user/agreements', {
      method: 'GET',
    })
  }

  // Advisory Agreement endpoints
  async signAdvisoryAgreement(): Promise<ApiResponse> {
    return this.getUserAgreements()
  }

  async getSignedAdvisoryAgreement(_userId: string): Promise<ApiResponse> {
    return this.getUserAgreements()
  }

  // Notifications endpoints
  async getNotifications(limit: number = 10, unreadOnly: boolean = false): Promise<ApiResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (unreadOnly) params.append('unreadOnly', 'true')
    
    const queryString = params.toString()
    const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`

    return this.request(endpoint, {
      method: 'GET',
    })
  }

  async getUnreadCount(): Promise<ApiResponse> {
    return this.request('/notifications/unread-count', {
      method: 'GET',
    })
  }

  async createNotification(title: string, message: string, status: string = 'info'): Promise<ApiResponse> {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify({ title, message, status }),
    })
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    })
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    })
  }

  async markNotificationAsUnread(notificationId: string): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}/unread`, {
      method: 'PATCH',
    })
  }

  async toggleNotificationStar(notificationId: string): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}/star`, {
      method: 'PATCH',
    })
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    })
  }

  async checkBankAccountStatus(): Promise<ApiResponse> {
    return this.request('/investment/bank-account-status', {
      method: 'GET',
    })
  }

  async getProfile(_token?: string) {
    return this.request('/user/profile', {
      method: 'GET',
    })
  }

  async updateProfile(_token: string, profileData: any) {
    return this.request('/user/profile/update', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async syncProfile(_token?: string) {
    return this.request('/user/profile', {
      method: 'GET',
    })
  }

  // Onboarding API methods
  async submitOnboarding(data: {
    answers: Record<string, any>
    completedAt: string
  }): Promise<ApiResponse> {
    return this.request('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitOnboardingExternal(payload: any): Promise<ApiResponse> {
    return this.request('/onboarding/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  // New onboarding API methods
  async saveOnboardingDetails(data: {
    answers: Record<string, any>
  }): Promise<ApiResponse> {
    return this.request('/onboarding/save', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async markOnboardingCompleted(): Promise<ApiResponse> {
    return this.request('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async getOnboardingDetails(_userId?: string): Promise<ApiResponse> {
    return this.request('/onboarding/details')
  }

  async completeOnboardingFlow(data: {
    answers: Record<string, any>
    userData?: any
  }): Promise<ApiResponse> {
    return this.request('/onboarding/complete-flow', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // KYC / identity verification (compliance-service)
  async startKycVerification(_userId?: string, body: { productIntent?: string; country?: string } = {}) {
    const response = await this.request('/compliance/kyc/start', {
      method: 'POST',
      body: JSON.stringify({
        productIntent: body.productIntent || 'send_and_invest',
        country: body.country || 'US',
      }),
    })
    const raw = ((response.data as any) || response) as Record<string, any>
    const personaInquiryId = raw.personaInquiryId ?? raw.persona_inquiry_id ?? null
    return {
      success: true,
      message: response.message,
      data: {
        ...raw,
        personaInquiryId,
        persona_inquiry_id: personaInquiryId,
        verification_guid: raw.verificationId ?? raw.verification_guid ?? null,
        customer_guid: raw.providerCustomerId ?? raw.provider_customer_id ?? null,
      },
    }
  }

  async getKycStatus(sync = false) {
    const response = await this.request(`/compliance/kyc/status${sync ? '?sync=true' : ''}`, {
      method: 'GET',
    })
    const raw = ((response.data as any) || response) as Record<string, any>
    const status = String(raw.status || '').toUpperCase()
    const personaInquiryId = raw.personaInquiryId ?? raw.persona_inquiry_id ?? null
    const mappedStatus =
      status === 'APPROVED' ? 'verified'
        : status === 'REJECTED' ? 'rejected'
          : status === 'PENDING' || status === 'UNDER_REVIEW' ? 'pending'
            : 'not_started'
    return {
      success: true,
      message: response.message,
      data: {
        ...raw,
        status: mappedStatus,
        is_verified: status === 'APPROVED',
        can_resume: (status === 'PENDING' || status === 'UNDER_REVIEW') && Boolean(personaInquiryId),
        can_retry: status === 'REJECTED' || status === 'DRAFT' || !status,
        personaInquiryId,
        persona_inquiry_id: personaInquiryId,
        verificationId: raw.verificationId ?? raw.verification_guid ?? null,
        verification_guid: raw.verificationId ?? raw.verification_guid ?? null,
        customer_guid: raw.providerCustomerId ?? raw.provider_customer_id ?? raw.customer_guid ?? null,
        providerCustomerId: raw.providerCustomerId ?? raw.provider_customer_id ?? null,
      },
    }
  }

  async getCustomerInfo(userId: string) {
    return this.request(`/customers/user/${userId}`, {
      method: 'GET',
    })
  }

  async waitForVerified(_customerGuid?: string) {
    return this.getKycStatus(true)
  }

  async getExistingVerification(_userId?: string) {
    return this.getKycStatus(true)
  }

  async getCustomerStatus(_userId?: string) {
    return this.getKycStatus(true)
  }

  async getCustomerByGuid(_customerGuid?: string) {
    return this.getKycStatus()
  }

  async getExternalBankAccounts(_customerGuid?: string) {
    const response = await this.request('/payments/bank-accounts', {
      method: 'GET',
    })
    const raw = (response.data as any) || response
    const accounts = Array.isArray(raw) ? raw : (raw.accounts || raw.data || [])
    return {
      success: true,
      message: response.message,
      data: Array.isArray(accounts) ? accounts : [],
    }
  }

  async deleteExternalBankAccount(bankAccountId: string) {
    return this.request(`/payments/bank-accounts/${bankAccountId}`, {
      method: 'DELETE',
    })
  }

  async startBankLink(platform: 'web' | 'ios' | 'android' = 'web') {
    const response = await this.request('/payments/bank-accounts/link/start', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    })
    const raw = ((response.data as any) || response) as Record<string, any>
    return {
      success: true,
      message: response.message,
      data: {
        ...raw,
        linkToken: raw.linkToken ?? raw.plaid_link_token,
        plaid_link_token: raw.linkToken ?? raw.plaid_link_token,
      },
    }
  }

  async completeBankLink(payload: {
    publicToken: string
    accountId: string
    accountName?: string
    accountMask?: string
    holderName?: string
  }) {
    return this.request('/payments/bank-accounts/link/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async createPlaidWorkflow(_customerGuid?: string, _userDetails?: any) {
    return this.startBankLink('web')
  }

  async getPlaidWorkflowStatus(_workflowGuid?: string) {
    return this.request('/payments/bank-accounts', { method: 'GET' })
  }

  async exchangePlaidToken(publicToken: string, accountId: string) {
    return this.completeBankLink({ publicToken, accountId })
  }

  async setupCustomerAccounts(_customerGuid: string, plaidPublicToken: string, plaidAccountId: string) {
    return this.completeBankLink({ publicToken: plaidPublicToken, accountId: plaidAccountId })
  }


  // Bond endpoints
  async getAvailableBonds(options: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    country?: string
  } = {}) {
    const params = new URLSearchParams()
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.sortOrder) params.append('sortOrder', options.sortOrder)
    if (options.country) params.append('country', options.country)
    
    const queryString = params.toString()
    const endpoint = `/bonds/available${queryString ? `?${queryString}` : ''}`
    
    return this.request(endpoint)
  }

  async getBondPurchases(_userProfileId?: string, page: number = 1, limit: number = 50) {
    return this.request(`/portfolio/holdings?page=${page}&limit=${limit}`)
  }

  // Bond selling methods
  async sellBond(bondId: string, sellAmount?: number) {
    return this.request('/bonds/sell', {
      method: 'POST',
      body: JSON.stringify({
        bond_id: bondId,
        sell_amount: sellAmount
      })
    })
  }

  async getSoldBonds(page: number = 1, limit: number = 50) {
    return this.request(`/bonds/sold?page=${page}&limit=${limit}`)
  }

  async cancelBondSale(soldBondId: string) {
    return this.request(`/bonds/sold/${soldBondId}/cancel`, {
      method: 'PATCH'
    })
  }

  // Profile management
  async getUserProfile() {
    return this.request('/user/profile')
  }

  async updateUserProfile(profileData: {
    profile?: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      dob?: string
      gender?: string
      marital_status?: string
      occupation?: string
      employer?: string
      employment_status?: string
      citizenship?: string
      us_tax_residence_status?: string
      profile_picture_url?: string
      display_name?: string
    }
    address?: {
      street?: string
      street2?: string
      city?: string
      subdivision?: string
      postal_code?: string
      country_code?: string
    }
  }) {
    return this.request('/user/profile/update', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }

  // Profile picture management
  async getProfilePicture() {
    return this.request('/user/profile-picture')
  }

  async uploadProfilePicture(file: File) {
    const formData = new FormData()
    formData.append('profilePicture', file)
    
    // For FormData, we need to bypass the normal request method
    // and handle it directly to avoid JSON parsing issues
    const token = this.getToken()
    if (!token) {
      throw new Error('No authentication token available')
    }

    const url = `${this.baseURL}/user/profile-picture`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let browser set it with boundary for FormData
      },
      body: formData
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      let errorDetails: any = null
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        errorDetails = errorData
      } catch (parseError) {
        errorMessage = response.statusText || errorMessage
      }
      
      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        code: 'CLIENT_ERROR',
        details: errorDetails
      }
      
      throw apiError
    }

    const data = await response.json()
    return data
  }

  async deleteProfilePicture() {
    return this.request('/user/profile-picture', {
      method: 'DELETE'
    })
  }

  async getProfilePictureSignedUrl() {
    return this.request('/user/profile-picture/signed-url')
  }

  // Portfolio API methods
  async getPortfolioSummary(_userProfileId?: string, options?: { from?: string; to?: string }) {
    const params = new URLSearchParams()
    if (options?.from) params.append('from', options.from)
    if (options?.to) params.append('to', options.to)
    
    const queryString = params.toString()
    const url = `/portfolio/summary${queryString ? `?${queryString}` : ''}`
    
    return this.request(url)
  }

  async getPortfolioPerformance(_userProfileId?: string) {
    return this.request('/portfolio/performance')
  }

  async getPortfolioAllocation(_userProfileId?: string) {
    return this.request('/portfolio/allocation')
  }

  async getPortfolioGrowth(_userProfileId?: string, options?: {
    from?: string
    to?: string
    period?: '30d' | '6m' | '1y' | 'all'
  }) {
    const params = new URLSearchParams()
    if (options?.from) params.append('from', options.from)
    if (options?.to) params.append('to', options.to)
    if (options?.period) params.append('period', options.period)
    
    const queryString = params.toString()
    const url = `/portfolio/growth${queryString ? `?${queryString}` : ''}`
    
    return this.request(url)
  }

  async getCorrectGrowthPercentage(_userProfileId?: string, options?: {
    valuationDate?: string
  }) {
    const params = new URLSearchParams()
    if (options?.valuationDate) params.append('valuationDate', options.valuationDate)
    
    const queryString = params.toString()
    const url = `/portfolio/growth-percentage${queryString ? `?${queryString}` : ''}`
    
    return this.request(url)
  }

  async getCashFlowData(_userProfileId?: string) {
    return this.request('/portfolio/cashflow')
  }

  async getVerificationStatus() {
    return this.getKycStatus(true)
  }

  async completeOnboardingTour(_userId?: string) {
    return this.request('/onboarding/tour/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async getOnboardingTourStatus(_userId?: string) {
    const response = await this.request('/onboarding/tour/status', {
      method: 'GET',
    })
    return {
      success: response.success,
      hasSeenTour: (response as any).hasSeenTour ?? (response.data as any)?.hasSeenTour,
    }
  }

  async syncAllPendingTransactions() {
    return this.request('/purchase/history', { method: 'GET' })
  }

  async syncTransactionById(transferId: string) {
    return this.request(`/purchase/status/${transferId}`, { method: 'GET' })
  }

  async getSyncStatus() {
    return this.request('/purchase/history', { method: 'GET' })
  }

  async getPendingTransactions() {
    return this.request('/purchase/history', { method: 'GET' })
  }

  async getSyncHealthCheck() {
    return this.healthCheck()
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }

  // Statement endpoints
  async getStatements(limit: number = 12): Promise<ApiResponse> {
    return this.request(`/statements?limit=${limit}`, {
      method: 'GET',
    })
  }

  async getStatementDetails(statementId: string): Promise<ApiResponse> {
    return this.request(`/statements/${statementId}`, {
      method: 'GET',
    })
  }

  async generateStatement(month: number, year: number, sendEmail: boolean = true): Promise<ApiResponse> {
    return this.request('/statements/generate', {
      method: 'POST',
      body: JSON.stringify({ month, year, sendEmail }),
    })
  }

  async sendStatementEmail(statementId: string): Promise<ApiResponse> {
    return this.request(`/statements/${statementId}/send-email`, {
      method: 'POST'
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
