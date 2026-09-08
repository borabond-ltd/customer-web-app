'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { useAuth } from '@/contexts/auth-context'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  CreditCard, 
  Building2, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Eye,
  X
} from 'lucide-react'
import { DashboardBankLinkingWizard } from '@/components/bank-linking/dashboard-bank-linking-wizard'
import { BankAccountDetailsModal } from '@/components/bank-linking/bank-account-details-modal'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface BankAccount {
  // Cybrid API fields
  guid: string
  name: string
  asset: string
  account_kind: string
  environment: string
  customer_guid: string
  bank_guid: string
  state: string
  created_at: string
  updated_at: string
  plaid_institution_id?: string
  plaid_account_mask?: string
  plaid_account_name?: string
  holder?: {
    type: string
    guid: string
  }
  // Computed/derived fields for UI
  id: string // Same as guid for compatibility
  accountNumber: string // Derived from plaid_account_mask
  bankName: string // Derived from plaid_institution_id or name
  accountType: string // Derived from account_kind
  status: 'verified' | 'pending' | 'failed' | 'completed' | 'unverified' // Mapped from state
  currency: string // Same as asset
  lastUpdated: string // Same as updated_at
  linkedAt: string // Same as created_at
}

export default function BankPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddBankDialog, setShowAddBankDialog] = useState(false)
  const [isAddingBank, setIsAddingBank] = useState(false)
  const [isPlaidLinkOpen, setIsPlaidLinkOpen] = useState(false)
  const [showBankLinkingWizard, setShowBankLinkingWizard] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug logging for wizard state
  useEffect(() => {
    logger.log('🔍 Bank page state changed:', {
      showBankLinkingWizard,
      isAddingBank,
      isPlaidLinkOpen,
      showAddBankDialog
    })
  }, [showBankLinkingWizard, isAddingBank, isPlaidLinkOpen, showAddBankDialog])

  // Function to load bank accounts from API
  const loadBankAccounts = async () => {
    if (!user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Get user ID (could be in id or user_id field)
      const userId = user.id || user.user_id
      if (!userId) {
        throw new Error('User ID not found')
      }

      logger.log('Fetching linked bank accounts')
      const bankAccountsResponse = await apiClient.getExternalBankAccounts()
      
      if (!bankAccountsResponse.success) {
        throw new Error(bankAccountsResponse.message || 'Failed to fetch bank accounts')
      }

      const accountsData = bankAccountsResponse.data || []
      
      const transformedAccounts: BankAccount[] = Array.isArray(accountsData) 
        ? accountsData
            .filter((account: { status?: string; state?: string }) => {
              const state = String(account.status || account.state || '').toUpperCase()
              return state !== 'DELETED' && state !== 'REMOVED'
            })
            .map((account: Record<string, any>) => {
              const id = account.id || account.guid
              const mask = account.accountMask || account.plaid_account_mask || ''
              const created = account.createdAt || account.created_at || new Date().toISOString()
              const state = String(account.status || account.state || 'PENDING')
              return {
                guid: id,
                name: account.accountName || account.name || 'Bank account',
                asset: account.asset || 'USD',
                account_kind: account.account_kind || 'deposit',
                environment: account.environment || '',
                customer_guid: account.customer_guid || '',
                bank_guid: account.bank_guid || '',
                state,
                created_at: created,
                updated_at: account.updatedAt || account.updated_at || created,
                plaid_institution_id: account.plaid_institution_id,
                plaid_account_mask: mask,
                plaid_account_name: account.bankName || account.plaid_account_name || account.accountName,
                id,
                accountNumber: mask ? `****${String(mask).replace(/^\*+/, '')}` : '****',
                bankName: account.bankName || account.accountName || account.name || 'Unknown Bank',
                accountType: 'Checking',
                status: mapCybridStateToStatus(state),
                currency: account.asset || 'USD',
                lastUpdated: account.updatedAt || account.updated_at || created,
                linkedAt: created,
              }
            })
        : []
      
      logger.log('Successfully loaded bank accounts:', transformedAccounts.length)
      setBankAccounts(transformedAccounts)
      
    } catch (error) {
      logger.error('Error loading bank accounts:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load bank accounts'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Load bank accounts on component mount
  useEffect(() => {
    loadBankAccounts()
  }, [user])

  // Helper function to map Cybrid states to our UI status
  const mapCybridStateToStatus = (state: string): 'verified' | 'pending' | 'failed' | 'completed' | 'unverified' => {
    switch (state.toLowerCase()) {
      case 'completed':
      case 'verified':
      case 'linked':
        return 'verified'
      case 'pending':
      case 'pending_removal':
        return 'pending'
      case 'failed':
      case 'errored':
      case 'frozen':
        return 'failed'
      case 'unverified':
        return 'unverified'
      case 'deleted':
        // Note: deleted accounts are filtered out before this function is called
        return 'failed' // Fallback, though this shouldn't be reached
      default:
        return 'pending'
    }
  }

  const handleAddBankAccount = () => {
    setShowBankLinkingWizard(true)
    setIsAddingBank(true)
  }

  const handleBankLinkingComplete = async (success: boolean) => {
    setIsAddingBank(false)
    setShowAddBankDialog(false)
    setIsPlaidLinkOpen(false)
    setShowBankLinkingWizard(false)
    
    if (success) {
      toast.success('Bank account linked successfully!')
      // Refresh bank accounts list by refetching from API
      logger.log('Bank linking successful, refreshing bank accounts list...')
      await loadBankAccounts()
    } else {
      toast.error('Failed to link bank account')
    }
  }

  const handleRemoveBankAccount = (account: BankAccount) => {
    setAccountToDelete(account)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return

    setIsDeleting(true)
    try {
      const response = await apiClient.deleteExternalBankAccount(accountToDelete.guid)
      
      if (response.success) {
        toast.success('Bank account removed successfully')
        setShowDeleteDialog(false)
        setAccountToDelete(null)
        // Refresh bank accounts list to ensure consistency
        logger.log('Bank account deleted successfully, refreshing bank accounts list...')
        await loadBankAccounts()
      } else {
        throw new Error(response.message || 'Failed to delete bank account')
      }
    } catch (error) {
      logger.error('Error deleting bank account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete bank account'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteDialog(false)
    setAccountToDelete(null)
  }

  const handleViewAccountDetails = (account: BankAccount) => {
    setSelectedAccount(account)
    setShowDetailsModal(true)
  }

  const handleCloseDetailsModal = () => {
    setSelectedAccount(null)
    setShowDetailsModal(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header - Only show when wizard is not active */}
          {!showBankLinkingWizard && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
               
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
                    <p className="text-gray-600">Manage your connected bank accounts</p>
                  </div>
                </div>
                {/* <Button 
                  onClick={handleAddBankAccount}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Bank Account</span>
                </Button> */}
              </div>

              {/* Security Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your bank account information is encrypted and secure. We use bank-level security to protect your data.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Plaid Link Status */}
          {isPlaidLinkOpen && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Bank Account Linking in Progress</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Plaid Link is now open. Please complete the bank account connection process in the popup window.
                    If you don't see the Plaid window, check for popup blockers or try refreshing the page.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    setIsPlaidLinkOpen(false)
                    setIsAddingBank(false)
                    setShowBankLinkingWizard(false)
                  }}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Bank Linking Wizard - Within Dashboard Layout */}
          {showBankLinkingWizard ? (
            <div className="space-y-6">
              {/* Clean Wizard Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBankLinkingWizard(false)
                      setIsAddingBank(false)
                      setIsPlaidLinkOpen(false)
                    }}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Bank Accounts</span>
                  </Button> */}
                  {/* <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add Bank Account</h1>
                    <p className="text-gray-600 mt-1">
                      Securely connect your bank account using our Plaid integration
                    </p>
                  </div> */}
                </div>
              </div>
              
              {/* Security Notice for Wizard */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your bank account information is encrypted and secure. We use bank-level security to protect your data.
                </AlertDescription>
              </Alert>
              
              {/* Wizard Content */}
              <DashboardBankLinkingWizard 
                onComplete={handleBankLinkingComplete}
                onCancel={() => {
                  setShowBankLinkingWizard(false)
                  setIsAddingBank(false)
                  setIsPlaidLinkOpen(false)
                }}
                onBeforePlaidOpen={() => {
                  // Mark Plaid Link as active but keep wizard open
                  setIsPlaidLinkOpen(true)
                }}
              />
            </div>
          ) : (
            <>
              {/* Regular Bank Accounts View */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Plaid Link Status */}
              {isPlaidLinkOpen && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">Bank Account Linking in Progress</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Plaid Link is now open. Please complete the bank account connection process in the popup window.
                        If you don't see the Plaid window, check for popup blockers or try refreshing the page.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => {
                        setIsPlaidLinkOpen(false)
                        setIsAddingBank(false)
                        setShowBankLinkingWizard(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Bank Accounts List */}
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bank Accounts Connected</h3>
                  <p className="text-gray-600 mb-6">
                    Connect your bank account to start managing your finances securely.
                  </p>
                  <Button onClick={handleAddBankAccount} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {bankAccounts.map((account) => (
                    <Card key={account.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{account.bankName}</CardTitle>
                              <CardDescription>{account.accountType}</CardDescription>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewAccountDetails(account)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveBankAccount(account)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Account Number</span>
                            <span className="text-sm font-mono">{account.accountNumber}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status</span>
                            <Badge 
                              variant={account.status === 'verified' ? 'default' : 
                                     account.status === 'pending' ? 'secondary' : 'destructive'}
                            >
                              {account.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Currency</span>
                            <span className="text-sm font-medium">{account.currency}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Last Updated</span>
                            <span className="text-sm text-gray-500">
                              {new Date(account.lastUpdated).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Add Bank Account Card */}
                  <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer" onClick={handleAddBankAccount}>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <div className="p-3 bg-gray-100 rounded-full mb-4">
                        <Plus className="h-6 w-6 text-gray-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Add Bank Account</h3>
                      <p className="text-sm text-gray-600 text-center">
                        Connect another bank account to manage all your finances in one place
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Bank Account Details Modal */}
          <BankAccountDetailsModal
            account={selectedAccount}
            isOpen={showDetailsModal}
            onClose={handleCloseDetailsModal}
            onRemove={(accountId: string) => {
              const account = bankAccounts.find(acc => acc.guid === accountId)
              if (account) {
                handleRemoveBankAccount(account)
              }
            }}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Bank Account</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this bank account? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              {accountToDelete && (
                <div className="py-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{accountToDelete.bankName}</h4>
                        <p className="text-sm text-gray-600">{accountToDelete.accountType}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Account: {accountToDelete.accountNumber}
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
