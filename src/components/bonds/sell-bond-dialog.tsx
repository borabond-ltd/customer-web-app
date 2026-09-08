'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, TrendingDown, Calendar, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface BondHolding {
  id: string
  available_bond_id: string
  amount: number
  country: string
  maturity_date: string
  net_income: number
}

interface SellBondDialogProps {
  isOpen: boolean
  onClose: () => void
  bond: BondHolding | null
  onSell: (bondId: string, sellAmount: number) => Promise<void>
}

export function SellBondDialog({ isOpen, onClose, bond, onSell }: SellBondDialogProps) {
  const [sellAmount, setSellAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSellAmount(0)
      setError(null)
    }
    onClose()
  }

  // Set default sell amount when bond changes
  const handleBondChange = () => {
    if (bond) {
      setSellAmount(bond.amount)
    }
  }

  // Update sell amount when bond changes
  if (bond && sellAmount === 0) {
    setSellAmount(bond.amount)
  }

  const handleSell = async () => {
    if (!bond) return

    setError(null)
    setIsLoading(true)

    try {
      // Validate sell amount
      if (sellAmount <= 0) {
        throw new Error('Sell amount must be greater than 0')
      }

      if (sellAmount > bond.amount) {
        throw new Error('Sell amount cannot exceed the bond amount')
      }

      await onSell(bond.id, sellAmount)
      
      toast.success('Bond sale request submitted successfully!')
      handleOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit bond sale request'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return 'UGX ' + new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!bond) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Sell Bond
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to sell this bond? The process will take up to 2 working days to complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bond Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Bond Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Bond ID:</span>
                <p className="font-mono text-xs bg-white p-1 rounded border">
                  {bond.available_bond_id}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Country:</span>
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-gray-400" />
                  <span>{bond.country}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Current Amount:</span>
                <p className="font-semibold text-green-600">
                  {formatCurrency(bond.amount)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Maturity Date:</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span>{formatDate(bond.maturity_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sell Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="sellAmount">Sell Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">UGX</span>
              <Input
                id="sellAmount"
                type="number"
                step="0.01"
                min="0"
                max={bond.amount}
                value={sellAmount}
                onChange={(e) => setSellAmount(parseFloat(e.target.value) || 0)}
                className="pl-12"
                placeholder="Enter sell amount"
              />
            </div>
            <p className="text-xs text-gray-500">
              Maximum: {formatCurrency(bond.amount)}
            </p>
          </div>

          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once you submit this request, it cannot be cancelled. 
              The sale will be processed within 2 working days and funds will be deposited into your bank account.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSell}
              disabled={isLoading || sellAmount <= 0}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell Bond
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
