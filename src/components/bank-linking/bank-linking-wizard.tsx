'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  User
} from 'lucide-react'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface BankLinkingWizardProps {}

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

export function BankLinkingWizard({}: BankLinkingWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null)
  const [setupResults, setSetupResults] = useState<AccountSetupResult>({})
  const [error, setError] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<any>(null)

  // Fetch customer data and initialize Plaid workflow on component mount
  useEffect(() => {
    const initializeBankLinking = async () => {
      // Debug: Log user object structure
      logger.log('BankLinkingWizard - User object:', user)
      
      // Get the correct user ID (could be in id or user_id field)
      const userId = user?.id || user?.user_id
      
      if (!userId) {
        logger.error('BankLinkingWizard - No user ID found:', { user })
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
      title: 'Bank Account Linking',
      description: 'Securely connect your bank account using Plaid',
      status: currentStep === 0 ? 'in_progress' : currentStep > 0 ? 'completed' : 'pending',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'account-setup',
      title: 'Account Setup',
      description: 'Setting up your accounts and deposit address',
      status: currentStep === 1 ? 'in_progress' : currentStep > 1 ? 'completed' : 'pending',
      icon: <Building2 className="h-5 w-5" />
    },
    {
      id: 'bank-integration',
      title: 'Bank Integration',
      description: 'Finalizing bank account connection',
      status: currentStep === 2 ? 'in_progress' : currentStep > 2 ? 'completed' : 'pending',
      icon: <CreditCard className="h-5 w-5" />
    }
  ]

  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    logger.log('Plaid Link success:', { publicToken, metadata })

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
      } else {
        throw new Error(result.message || 'Setup failed')
      }
    } catch (error) {
      logger.error('Error setting up accounts:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      toast.error('Failed to setup accounts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const onPlaidExit = useCallback((err: any, metadata: any) => {
    if (err) {
      logger.error('Plaid Link error:', err)
      setError(`Plaid Link error: ${err.error_code}`)
      toast.error('Bank linking failed')
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  })

  const handleStartPlaidLink = () => {
    if (ready && plaidLinkToken) {
      open()
    }
  }

  const getStepStatusIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return step.icon
    }
  }

  const getStepStatusColor = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  // Check if user is available
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>
            Please wait while we load your account information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-gray-600">
              Loading your account information...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Setup Progress</span>
            <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
          </CardTitle>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Steps Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`transition-all duration-200 ${
            step.status === 'in_progress' ? 'ring-2 ring-blue-500' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {getStepStatusIcon(step)}
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{step.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep]?.title}</CardTitle>
          <CardDescription>{steps[currentStep]?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !plaidLinkToken && (
            <div className="text-center space-y-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Preparing Bank Linking</h3>
                <p className="text-gray-600">
                  Fetching your customer information and initializing secure bank connection...
                </p>
              </div>
            </div>
          )}

          {currentStep === 0 && plaidLinkToken && (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to Link Your Bank Account</h3>
                <p className="text-gray-600">
                  Click the button below to securely connect your bank account using Plaid.
                  Your information is encrypted and never stored on our servers.
                </p>
              </div>

              <Button 
                onClick={handleStartPlaidLink} 
                disabled={!ready || isLoading}
                size="lg"
                className="w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Connect Bank Account
                  </>
                )}
              </Button>
            </div>
          )}

          {currentStep >= 1 && currentStep <= 2 && (
            <div className="text-center space-y-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{steps[currentStep]?.title}</h3>
                <p className="text-gray-600">{steps[currentStep]?.description}</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-600">Setup Complete!</h3>
                <p className="text-gray-600">
                  Your bank account has been successfully linked and all accounts have been created.
                </p>
              </div>

              {setupResults && (
                <div className="grid md:grid-cols-2 gap-4 mt-8">
                  {setupResults.fiat_account && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Fiat Account</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {setupResults.fiat_account.asset} • {setupResults.fiat_account.state}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {setupResults.trading_account && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Wallet className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Trading Account</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {setupResults.trading_account.asset} • {setupResults.trading_account.state}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {setupResults.deposit_address && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Deposit Address</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {setupResults.deposit_address.address?.slice(0, 8)}...
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {setupResults.bank_account && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">Bank Account</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {setupResults.bank_account.asset} • {setupResults.bank_account.state}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Button 
                onClick={() => window.location.href = '/dashboard'}
                className="w-full md:w-auto"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
