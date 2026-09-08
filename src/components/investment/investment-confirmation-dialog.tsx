'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Shield,
  CheckCircle,
  X
} from 'lucide-react'
import { motion } from 'framer-motion'

interface InvestmentConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onCancel: () => void
  investmentData: {
    initialAmount: number
    monthlyAmount: number
    reinvestCoupons: boolean
    investmentType: 'managed' | 'self-directed'
    selectedBonds?: Array<{
      id: string
      display_name: string
      country: string
      offer_yield: number
    }>
  }
  isLoading?: boolean
}

export function InvestmentConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  investmentData,
  isLoading = false
}: InvestmentConfirmationDialogProps) {
  const handleCancel = () => {
    onCancel()
    onClose()
  }

  const handleConfirm = () => {
    onConfirm()
    // Don't close the dialog here - let the parent handle it after MFA
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-green-600" />
            Confirm Your Investment
          </DialogTitle>
          <DialogDescription>
            Please review your investment details before proceeding. You'll need to verify your email to complete this transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Investment Type Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className={`px-4 py-2 text-sm ${
                investmentData.investmentType === 'managed' 
                  ? 'border-green-200 bg-green-50 text-green-700' 
                  : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {investmentData.investmentType === 'managed' ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Managed Investment
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Self-Directed Investment
                </>
              )}
            </Badge>
          </div>

          {/* Investment Details */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center p-3 border rounded-lg"
                >
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-gray-900">
                    ${investmentData.initialAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Initial Investment</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center p-3 border rounded-lg"
                >
                  <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold text-gray-900">
                    ${investmentData.monthlyAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Monthly Deposit</div>
                </motion.div>


                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center p-3 border rounded-lg"
                >
                  <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${
                    investmentData.reinvestCoupons ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div className="text-lg font-semibold text-gray-900">
                    {investmentData.reinvestCoupons ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-gray-600">Reinvest Coupons</div>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Bonds (for self-directed) */}
          {investmentData.investmentType === 'self-directed' && investmentData.selectedBonds && investmentData.selectedBonds.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Selected Bonds ({investmentData.selectedBonds.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {investmentData.selectedBonds.map((bond, index) => (
                    <motion.div
                      key={bond.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{bond.display_name}</span>
                        <span className="text-xs text-gray-500">({bond.country})</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {bond.offer_yield.toFixed(1)}% yield
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Security Verification Required</h4>
                <p className="text-sm text-blue-700">
                  To complete your investment, we'll send a verification code to your registered email address. 
                  This helps protect your account and ensures secure transactions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, Proceed
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
