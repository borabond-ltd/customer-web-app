'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  CreditCard, 
  Building2, 
  Wallet,
  MapPin,
  Shield,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface DashboardBankLinkingWizardProps {
  onComplete?: (success: boolean) => void
  onCancel?: () => void
  onBeforePlaidOpen?: () => void // Callback to close dialog before Plaid opens
}

interface SetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  icon: React.ReactNode
}

interface AccountSetupResult {
  fiat_account?: any
  trading_account?: any
  deposit_address?: any
  bank_account?: any
}

export function DashboardBankLinkingWizard({ onComplete, onCancel, onBeforePlaidOpen }: DashboardBankLinkingWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null)
  const [setupResults, setSetupResults] = useState<AccountSetupResult>({})
  const [error, setError] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<any>(null)
  const [isPlaidLinkActive, setIsPlaidLinkActive] = useState(false)

  // Fetch customer data and initialize Plaid workflow on component mount
  useEffect(() => {
    const initializeBankLinking = async () => {
      // Debug: Log user object structure
      logger.log('DashboardBankLinkingWizard - User object:', user)
      
      // Get the correct user ID (could be in id or user_id field)
      const userId = user?.id || user?.user_id
      
      if (!userId) {
        logger.error('DashboardBankLinkingWizard - No user ID found:', { user })
        setError('User not found. Please ensure you are properly authenticated.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const workflowResult = await apiClient.startBankLink('web')

        if (workflowResult.success && (workflowResult.data as any)?.plaid_link_token) {
          setPlaidLinkToken((workflowResult.data as any).plaid_link_token)
          toast.success('Ready to link your bank account!')
        } else {
          throw new Error(workflowResult.message || 'Failed to initialize bank linking')
        }
      } catch (error) {
        logger.error('Error initializing bank linking:', error)
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
        toast.error('Failed to initialize bank linking')
      } finally {
        setIsLoading(false)
      }
    }

    // Only run if user object is available
    if (user) {
      initializeBankLinking()
    }
  }, [user?.id, user?.user_id, user?.customerGuid])

  const steps: SetupStep[] = [
    {
      id: 'bank-linking',
      title: 'Connect Bank Account',
      description: 'Securely link your bank account using Plaid',
      status: currentStep === 0 ? 'in_progress' : currentStep > 0 ? 'completed' : 'pending',
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      id: 'account-setup',
      title: 'Setup Accounts',
      description: 'Creating your investment accounts',
      status: currentStep === 1 ? 'in_progress' : currentStep > 1 ? 'completed' : 'pending',
      icon: <Building2 className="h-4 w-4" />
    },
    {
      id: 'bank-integration',
      title: 'Verify & Complete',
      description: 'Finalizing bank account connection',
      status: currentStep === 2 ? 'in_progress' : currentStep > 2 ? 'completed' : 'pending',
      icon: <Shield className="h-4 w-4" />
    }
  ]

  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    logger.log('✅ Plaid Link success:', { publicToken, metadata })
    setIsPlaidLinkActive(false)

    setIsLoading(true)
    setCurrentStep(1)

    try {
      const result = await apiClient.completeBankLink({
        publicToken,
        accountId: metadata.account_id,
        accountName: metadata.account?.name,
        accountMask: metadata.account?.mask,
      })

      if (result.success) {
        setSetupResults(result.data as AccountSetupResult)
        setCurrentStep(3)
        toast.success('Bank account linked successfully!')
        onComplete?.(true)
      } else {
        throw new Error(result.message || 'Setup failed')
      }
    } catch (error) {
      logger.error('Error setting up accounts:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      toast.error('Failed to setup accounts')
      onComplete?.(false)
    } finally {
      setIsLoading(false)
    }
  }, [onComplete])

  const onPlaidExit = useCallback((err: any, metadata: any) => {
    logger.log('🚪 Plaid Link exit:', { err, metadata })
    setIsPlaidLinkActive(false)
    
    if (err) {
      logger.error('❌ Plaid Link error:', err)
      setError(`Plaid Link error: ${err.error_code}`)
      toast.error('Bank linking failed')
      onComplete?.(false)
    } else {
      logger.log('👋 User cancelled or exited Plaid Link')
      // User cancelled or exited
      onCancel?.()
    }
  }, [onComplete, onCancel])

  const { open, ready } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  })

  // Debug logging for Plaid Link state
  useEffect(() => {
    logger.log('🔍 Plaid Link state changed:', { 
      ready, 
      hasToken: !!plaidLinkToken,
      currentStep,
      isLoading 
    })
  }, [ready, plaidLinkToken, currentStep, isLoading])

  const handleStartPlaidLink = () => {
    if (ready && plaidLinkToken) {
      logger.log('Opening Plaid Link...', { ready, plaidLinkToken: !!plaidLinkToken })
      
      // Mark Plaid Link as active
      setIsPlaidLinkActive(true)
      
      // Notify parent that Plaid Link is about to open
      if (onBeforePlaidOpen) {
        onBeforePlaidOpen()
      }
      
      // Open Plaid Link immediately
      logger.log('Calling Plaid Link open()...')
      open()
    } else {
      logger.log('Plaid Link not ready:', { ready, plaidLinkToken: !!plaidLinkToken })
    }
  }

  const getStepStatusIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <span className="h-4 w-4 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">{steps.findIndex(s => s.id === step.id) + 1}</span>
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  // Check if user is available
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-gray-600">Loading your account information...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check if user has customerGuid (this check might not be needed anymore since we fetch customer data)
  if (!user?.customerGuid && !customerData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Identity Verification Required</span>
          </CardTitle>
          <CardDescription>
            You need to complete identity verification before linking your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              To link your bank account, you must first complete the identity verification process.
              This ensures compliance with financial regulations and protects your account.
            </p>
            <div className="flex space-x-4">
              <Button 
                onClick={() => window.location.href = '/dashboard/verify-identity'}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Identity Verification
              </Button>
              <Button 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render minimal UI when Plaid Link is active to avoid interference
  if (isPlaidLinkActive) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Plaid Link is Active</h3>
            <p className="text-sm text-gray-600">
              Please complete the bank account connection in the Plaid window.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Progress Header */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Link Bank Account</h2>
              <p className="text-sm text-gray-600">Securely connect your bank account in 3 simple steps</p>
            </div>
            <Badge variant="outline" className="text-xs">{Math.round(progress)}% Complete</Badge>
          </div>
          <Progress value={progress} className="w-full h-2" />
        </CardContent>
      </Card>

      {/* Compact Steps Overview - Horizontal Layout */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`transition-all duration-200 ${
            step.status === 'in_progress' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}>
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center space-y-2">
                {getStepStatusIcon(step)}
                <div>
                  <h3 className="font-medium text-xs">{step.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{step.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content - Compact */}
      <Card className="flex-1">
        <CardContent className="p-4 h-full flex flex-col justify-center">
          {isLoading && !plaidLinkToken && (
            <div className="text-center space-y-3">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Preparing Bank Linking</h3>
                <p className="text-sm text-gray-600">
                  Fetching your customer information and initializing secure bank connection...
                </p>
              </div>
            </div>
          )}

          {currentStep === 0 && plaidLinkToken && (
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to Connect Your Bank Account</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  Click the button below to securely connect your bank account using Plaid.
                  Your information is encrypted and never stored on our servers.
                </p>
              </div>

              <div className="flex space-x-3 justify-center">
                <Button 
                  onClick={handleStartPlaidLink} 
                  disabled={!ready || isLoading}
                  className="flex items-center space-x-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Connect Bank Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onCancel} size="lg">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {currentStep >= 1 && currentStep <= 2 && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{steps[currentStep]?.title}</h3>
                <p className="text-sm text-gray-600">{steps[currentStep]?.description}</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-green-600">Setup Complete!</h3>
                <p className="text-sm text-gray-600">
                  Your bank account has been successfully linked and all accounts have been created.
                </p>
              </div>

              {setupResults && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {setupResults.fiat_account && (
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium">Fiat Account</span>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        {setupResults.fiat_account.state}
                      </Badge>
                    </div>
                  )}

                  {setupResults.trading_account && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium">Trading Account</span>
                      </div>
                      <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                        {setupResults.trading_account.state}
                      </Badge>
                    </div>
                  )}

                  {setupResults.deposit_address && (
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium">Deposit Address</span>
                      </div>
                      <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
                        {setupResults.deposit_address.state}
                      </Badge>
                    </div>
                  )}

                  {setupResults.bank_account && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-medium">Bank Account</span>
                      </div>
                      <Badge variant="default" className="bg-orange-100 text-orange-800 text-xs">
                        {setupResults.bank_account.state}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center pt-3">
                <Button onClick={() => onComplete?.(true)} className="bg-green-600 hover:bg-green-700" size="lg">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
