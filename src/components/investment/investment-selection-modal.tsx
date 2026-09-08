'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Target, ArrowRight, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface InvestmentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InvestmentSelectionModal({ isOpen, onClose }: InvestmentSelectionModalProps) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<'automatic' | 'manual' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSelection = async (option: 'automatic' | 'manual') => {
    setSelectedOption(option)
    setIsLoading(true)

    try {
      if (option === 'manual') {
        // Navigate to available bonds page
        router.push('/dashboard/available-bonds')
      } else {
        // For automatic option, check if user has monthly amount set
        try {
          const response = await apiClient.getInvestmentStrategy()
          
          if (response.success && response.data) {
            const hasMonthlyAmount = response.data.monthly_amount && response.data.monthly_amount > 0
            
            if (hasMonthlyAmount) {
              // User has monthly amount set, redirect to automatic investment page
              router.push('/dashboard/automatic-investment')
            } else {
              // User doesn't have monthly amount set, redirect to investment page to configure
              router.push('/dashboard/investment')
            }
          } else {
            // No strategy found, redirect to investment page to configure
            router.push('/dashboard/investment')
          }
        } catch (error) {
          // Handle API error gracefully
          console.error('Error checking investment strategy:', error)
          toast.error('Unable to check your investment strategy. Please try again.')
          // Still redirect to investment page as fallback
          router.push('/dashboard/investment')
        }
      }
    } catch (error) {
      console.error('Error during navigation:', error)
      toast.error('Navigation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            How would you like to select your bonds?
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Choose your preferred investment approach
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Automatic Selection Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                selectedOption === 'automatic' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:border-green-300'
              }`}
              onClick={() => !isLoading && handleSelection('automatic')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                  <Sparkles className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Automatic Selection</CardTitle>
                <CardDescription className="text-base">
                  BoraBond will automatically select the best bonds based on your investment amount and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2 mb-4">
                 
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Optimized Returns
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Risk Balanced
                  </Badge>
                </div>
                <Button 
                  className="w-full" 
                  variant={selectedOption === 'automatic' ? 'default' : 'outline'}
                  disabled={isLoading}
                >
                  {isLoading && selectedOption === 'automatic' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking strategy...
                    </div>
                  ) : (
                    <>
                      Choose Automatic
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Manual Selection Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                selectedOption === 'manual' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'
              }`}
              onClick={() => !isLoading && handleSelection('manual')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Manual Selection</CardTitle>
                <CardDescription className="text-base">
                  Browse and select from available bonds to build your own investment portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2 mb-4">
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Full Control
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Custom Portfolio
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Detailed Analysis
                  </Badge>
                </div>
                <Button 
                  className="w-full" 
                  variant={selectedOption === 'manual' ? 'default' : 'outline'}
                  disabled={isLoading}
                >
                  {isLoading && selectedOption === 'manual' ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    <>
                      Choose Manual
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            You can change your selection method at any time
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
