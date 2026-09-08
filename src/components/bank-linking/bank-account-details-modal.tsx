'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  DollarSign,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'

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

interface BankAccountDetailsModalProps {
  account: BankAccount | null
  isOpen: boolean
  onClose: () => void
  onRemove: (accountId: string) => void
}

export function BankAccountDetailsModal({ 
  account, 
  isOpen, 
  onClose, 
  onRemove 
}: BankAccountDetailsModalProps) {
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Helper function to mask GUIDs for security
  const maskGuid = (guid?: string | null): string => {
    if (!guid || typeof guid !== 'string') return 'N/A'
    const value = guid.trim()
    if (value.length <= 12) return value // Don't mask short GUIDs
    return `${value.slice(0, 8)}***${value.slice(-4)}`
  }

  if (!account) return null

  const handleRemoveAccount = async () => {
    setIsRemoving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      onRemove(account.id)
      onClose()
      toast.success('Bank account removed successfully')
    } catch {
      toast.error('Failed to remove bank account')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
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

  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(balance)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-semibold">{account.name}</div>
              <div className="text-sm text-gray-600">{account.bankName}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage your bank account details and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Account Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(account.status)}
                  <span className="font-medium">Verification Status</span>
                </div>
                {getStatusBadge(account.status)}
              </div>
              
              {account.status === 'verified' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Verified on {formatDate(account.updated_at)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Type</label>
                  <p className="text-sm font-semibold">{account.accountType}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Account Number</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-mono">
                      {account.accountNumber}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(account.accountNumber, 'Account number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {account.plaid_institution_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Institution ID</label>
                    <p className="text-sm font-mono">{account.plaid_institution_id}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600">Account GUID</label>
                  <div className="flex items-center space-x-2">
                    <Lock className="h-3 w-3 text-gray-400" />
                    <p className="text-sm font-mono text-gray-500">
                      {maskGuid(account.guid)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(account.guid, 'Account GUID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Customer GUID</label>
                  <div className="flex items-center space-x-2">
                    <Lock className="h-3 w-3 text-gray-400" />
                    <p className="text-sm font-mono text-gray-500">
                      {maskGuid(account.customer_guid)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(account.customer_guid, 'Customer GUID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {account.holder && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Holder</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold">{account.holder?.type || 'Unknown'}</p>
                      <Lock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-mono text-gray-500">
                        {maskGuid(account.holder?.guid || '')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(account.holder?.guid || '', 'Account holder GUID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Currency</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {account.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Bank Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-600">Bank Name</label>
                  <p className="text-sm font-semibold">{account.bankName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Bank GUID</label>
                  <div className="flex items-center space-x-2">
                    <Lock className="h-3 w-3 text-gray-400" />
                    <p className="text-sm font-mono text-gray-500">
                      {maskGuid(account.bank_guid)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(account.bank_guid, 'Bank GUID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Environment</label>
                  <p className="text-sm">{account.environment}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Activity Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Last Updated</span>
                <span className="text-sm">{formatDate(account.lastUpdated)}</span>
              </div>
              
              {account.linkedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Linked On</span>
                  <span className="text-sm">{formatDate(account.linkedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your bank account information is encrypted and secure. We use bank-level security to protect your data and never store your full account details on our servers. GUIDs are masked for additional security - click the copy button to access the full identifier when needed.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <Button
              variant="destructive"
              onClick={handleRemoveAccount}
              disabled={isRemoving}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isRemoving ? 'Removing...' : 'Remove Account'}</span>
            </Button>
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
