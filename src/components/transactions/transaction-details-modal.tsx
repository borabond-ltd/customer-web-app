'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building2,
  Hash,
  FileText,
  Shield,
  ArrowRightLeft,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'

interface TransactionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: any
}

export function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  if (!transaction) return null

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Transaction completed successfully'
      case 'pending':
        return 'Transaction is being processed'
      case 'failed':
        return 'Transaction failed to complete'
      default:
        return 'Transaction status unknown'
    }
  }

  const getTransferTypeDescription = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Money deposited to your account'
      case 'withdrawal':
        return 'Money withdrawn from your account'
      case 'funding':
        return 'Account funding transaction'
      case 'investment':
        return 'Investment transaction'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'cybrid':
        return 'Cybrid Banking'
      case 'plaid':
        return 'Plaid'
      case 'stripe':
        return 'Stripe'
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1)
    }
  }

  const formatTransactionId = (id: string) => {
    if (!id) return 'N/A'
    return `${id.slice(0, 8)}...${id.slice(-8)}`
  }

  const formatReference = (ref: string) => {
    if (!ref) return 'N/A'
    if (ref.length > 20) {
      return `${ref.slice(0, 20)}...`
    }
    return ref
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Status Header */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(transaction.status)}
                  <div>
                    <h3 className="text-lg font-semibold">Transaction {transaction.status}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getStatusDescription(transaction.status)}
                    </p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(transaction.status)} text-sm px-3 py-1`}>
                  {transaction.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Amount and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Transaction Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </div>
                  {transaction.fee > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Fee: {formatCurrency(transaction.fee, transaction.currency)}
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Type</span>
                    <span className="text-sm">{getTransferTypeDescription(transaction.transfer_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Provider</span>
                    <span className="text-sm">{getProviderName(transaction.provider)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="h-5 w-5 text-blue-600" />
                  Transaction ID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <code className="text-sm font-mono text-gray-700">
                    {formatTransactionId(transaction.id)}
                  </code>
                </div>
                {transaction.provider_reference && (
                  <div>
                    <div className="text-sm font-medium mb-1">Reference</div>
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      {formatReference(transaction.provider_reference)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">Transaction Created</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                </div>
                
                {transaction.initiated_at && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Processing Started</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(transaction.initiated_at)}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.completed_at && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Transaction Completed</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(transaction.completed_at)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Provider Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Provider Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transaction.cybrid_customer_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                    <div className="mt-1 bg-gray-50 p-2 rounded text-sm font-mono">
                      {formatTransactionId(transaction.cybrid_customer_id)}
                    </div>
                  </div>
                )}
                
                {transaction.external_bank_account_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bank Account</label>
                    <div className="mt-1 bg-gray-50 p-2 rounded text-sm font-mono">
                      {formatTransactionId(transaction.external_bank_account_id)}
                    </div>
                  </div>
                )}

                {transaction.provider_payment_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                    <div className="mt-1 bg-gray-50 p-2 rounded text-sm font-mono">
                      {formatReference(transaction.provider_payment_id)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bond Information - Only show if it's an investment transaction */}
          {transaction.bond_id && typeof transaction.bond_id === 'object' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Investment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(transaction.bond_id) ? (
                    transaction.bond_id.map((bond: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="font-medium">Bond {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {bond.display_name && (
                            <div>
                              <span className="font-medium">Name:</span> {bond.display_name}
                            </div>
                          )}
                          {bond.amount && (
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(bond.amount)}
                            </div>
                          )}
                          {bond.bondId && (
                            <div>
                              <span className="font-medium">Bond ID:</span> {formatReference(bond.bondId)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {transaction.bond_id.display_name && (
                          <div>
                            <span className="font-medium">Name:</span> {transaction.bond_id.display_name}
                          </div>
                        )}
                        {transaction.bond_id.amount && (
                          <div>
                            <span className="font-medium">Amount:</span> {formatCurrency(transaction.bond_id.amount)}
                          </div>
                        )}
                        {transaction.bond_id.bondId && (
                          <div>
                            <span className="font-medium">Bond ID:</span> {formatReference(transaction.bond_id.bondId)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information - Only show if there's meaningful metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(transaction.metadata).map(([key, value]: [string, any]) => {
                    // Skip technical fields that users don't need to see
                    if (key.includes('api_version') || key.includes('integration_type') || key.includes('cybrid_full_response')) {
                      return null
                    }
                    
                    return (
                      <div key={key} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm text-right max-w-xs">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}