'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  Target, 
  DollarSign, 
  CheckCircle, 
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/protected-route'

import { logger } from '@/lib/logger'
export default function AutomaticInvestmentPage() {
  const router = useRouter()
  const [selectionType, setSelectionType] = useState<'automatic' | 'manual'>('automatic')
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [transactionData, setTransactionData] = useState<any>(null)

  const handleInvestmentSubmit = async () => {
    // Validate amount
    const amount = parseFloat(investmentAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid investment amount greater than $0')
      return
    }

    if (amount < 100) {
      toast.error('Minimum investment amount is $100')
      return
    }

    setIsLoading(true)

    try {
      logger.log('Submitting automatic investment:', { amount })

      const purchaseData = {
        amount: amount,
        bondData: [
          {
            bondId: "automatic-selection",
            amount: amount,
            display_name: "Automatic Bond Selection",
            name: "Automatic Selection"
          }
        ] // dummy data for automatic selection
      }

      const response = await apiClient.confirmPurchase(purchaseData)
      
      if (response.success) {
        setTransactionData(response.data)
        setShowSuccessModal(true)
        toast.success('Investment confirmed! Your funds are being processed.')
      } else {
        toast.error(response.message || 'Failed to process investment')
      }
    } catch (error) {
      logger.error('Error processing investment:', error)
      toast.error('Failed to process investment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    // Redirect to transactions page
    setTimeout(() => {
      router.push('/dashboard/transactions')
    }, 500)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Investment Selection</h1>
              <p className="text-sm text-muted-foreground">Choose your investment approach</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">Secure</Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex">Best Match</Badge>
            </div>
          </div>
          {/* Desktop two-column layout: method on left, content on right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" />Investment Method</CardTitle>
                <CardDescription>Pick automatic or manual selection. You can switch anytime.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                value={selectionType}
                onValueChange={(value: 'automatic' | 'manual') => setSelectionType(value)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="automatic" className="cursor-pointer">
                      <p className="text-xs text-muted-foreground mb-1">Let BoraBond select the best bonds automatically.</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">Automatic</span>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs shrink-0">Recommended</Badge>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors">
                  <RadioGroupItem value="manual" id="manual" />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="manual" className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Manual</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Browse and select specific bonds yourself.</p>
                    </Label>
                  </div>
                </div>
                </RadioGroup>

                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground">Your choice influences how allocation is computed. You can review allocations before confirming any purchase.</p>
              </CardContent>
            </Card>

            {selectionType === 'automatic' ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-600" />Automatic Investment</CardTitle>
                    <CardDescription>Enter an amount and we’ll optimize the allocation for you.</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="investment-amount" className="text-sm font-medium">Investment Amount</Label>
                      <TooltipProvider>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="investment-amount" type="number" placeholder="e.g., 5000" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} className="pl-10" min="100" step="100" aria-describedby="amount-hint" />
                        </div>
                        <div id="amount-hint" className="flex items-center gap-1 text-xs text-muted-foreground">
                          Minimum: $100
                        </div>
                      </TooltipProvider>
                    </div>

                    {investmentAmount && parseFloat(investmentAmount) >= 100 && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
                        <h4 className="font-medium text-purple-900 mb-2 text-sm">Summary</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-purple-700">Amount:</span><span className="font-medium text-purple-900">{formatCurrency(parseFloat(investmentAmount))}</span></div>
                          <div className="flex justify-between"><span className="text-purple-700">Method:</span><span className="font-medium text-purple-900">Automatic</span></div>
                          <div className="flex justify-between"><span className="text-purple-700">Allocation:</span><span className="font-medium text-purple-900">Auto-Selected</span></div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <div className="flex flex-col items-center gap-1 p-2 bg-green-50 rounded-lg"><Shield className="h-4 w-4 text-green-600" /><h4 className="font-medium text-green-900 text-xs">Diversified</h4><p className="text-xs text-green-700 text-center">Spread across bonds</p></div>
                    <div className="flex flex-col items-center gap-1 p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-4 w-4 text-blue-600" /><h4 className="font-medium text-blue-900 text-xs">Optimized</h4><p className="text-xs text-blue-700 text-center">Best performing</p></div>
                    <div className="flex flex-col items-center gap-1 p-2 bg-purple-50 rounded-lg"><Clock className="h-4 w-4 text-purple-600" /><h4 className="font-medium text-purple-900 text-xs">Fast</h4><p className="text-xs text-purple-700 text-center">Instant processing</p></div>
                  </div>

                  <Button onClick={handleInvestmentSubmit} disabled={!investmentAmount || parseFloat(investmentAmount) < 100 || isLoading} className="w-full mt-4" size="lg">
                    {isLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Processing...</>) : (<><CheckCircle className="h-4 w-4 mr-2" />Confirm Investment<ArrowRight className="h-4 w-4 ml-2" /></>)}
                  </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" />Manual Bond Selection</CardTitle>
                    <CardDescription>Browse and select specific bonds to build your portfolio.</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <Button onClick={() => router.push('/dashboard/available-bonds')} className="w-full">
                    <Target className="h-4 w-4 mr-2" />
                    Browse Available Bonds
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Investment Confirmed!
              </DialogTitle>
              <DialogDescription>
                Your automatic investment has been successfully processed.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {transactionData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Transaction Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Amount:</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency(transactionData.amount)}
                      </span>
                    </div>
                    {transactionData.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Transaction ID:</span>
                        <span className="font-mono text-xs text-green-900">
                          {transactionData.transactionId.slice(0, 8)}...
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-green-700">Status:</span>
                      <Badge className="bg-green-100 text-green-800">
                        Processing
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">What's Next?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your funds are being processed and allocated to the best available bonds. 
                      You'll receive a confirmation email once the process is complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSuccessModalClose} className="w-full">
                View Transactions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  )
}
