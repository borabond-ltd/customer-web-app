'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { AnimatedPage, AnimatedCard } from '@/components/animated-page'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Target, 
  Sparkles, 
  Shield, 
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  RefreshCw,
  Eye
} from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { InvestmentConfirmationDialog } from '@/components/investment/investment-confirmation-dialog'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
// Country flag mapping
const countryFlags: Record<string, string> = {
  'Nigeria': '🇳🇬',
  'South Africa': '🇿🇦',
  'Ghana': '🇬🇭',
  'Kenya': '🇰🇪',
  'Egypt': '🇪🇬',
  'Uganda': '🇺🇬',
  'Morocco': '🇲🇦',
  'Tunisia': '🇹🇳'
}

// Risk level mapping based on yield ranges
const getRiskLevel = (yieldValue: number): string => {
  if (yieldValue < 8) return 'Low'
  if (yieldValue < 12) return 'Medium'
  return 'High'
}

interface Bond {
  id: string
  instrument_code: string
  display_name: string
  country: string
  currency: string
  maturity_date: string
  tenor: number
  coupon_rate: number
  bid_yield: number
  offer_yield: number
  available_amount: number
  is_active: boolean
  price_update_date: string
  ISIN: string
  withholding_tax: number
  created_at: string
  updated_at: string
}

interface InvestmentForm {
  initialAmount: number
  monthlyAmount: number
  holdingPeriod: number
  riskTolerance: string
  investmentGoal: string
  reinvestCoupons: boolean
  selectedBonds: string[]
  projectionYears: number
}

// Scenarios for investment projections
const scenarios = [
  { label: "Best", rate: 0.16, color: "#10b981" },
  { label: "Expected", rate: 0.145, color: "#3b82f6" },
  { label: "Worst", rate: 0.13, color: "#8b5cf6" }
]

interface ProjectionResult {
  label: string
  rate: number
  color: string
  totalInvested: number
  projectedValue: number
  interestEarned: number
  totalReturnPct: number
  series: number[]
  labels: number[]
}

interface InvestmentProjection {
  year: number
  totalInvestment: number
  projectedValue: number
  interestEarned: number
  monthlyValue: number
}

export default function InvestmentPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'managed' | 'self-directed'>('managed')
  const [isLoading] = useState(false)
  const [bondsLoading, setBondsLoading] = useState(false)
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([])
  const [bondsError, setBondsError] = useState<string | null>(null)
  const [formData, setFormData] = useState<InvestmentForm>({
    initialAmount: 0,
    monthlyAmount: 100,
    holdingPeriod: 5,
    riskTolerance: 'moderate',
    investmentGoal: 'growth',
    reinvestCoupons: true, // Default to reinvest
    selectedBonds: [],
    projectionYears: 5
  })
  const [hasExistingInitialAmount, setHasExistingInitialAmount] = useState(false)
  const [originalInitialAmount, setOriginalInitialAmount] = useState<number | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [projectionResults, setProjectionResults] = useState<ProjectionResult[]>([])
  
  // Currency conversion state
  const [currencyRate, setCurrencyRate] = useState<number>(3850) // UGX to USD rate (fallback)
  const [displayCurrency, setDisplayCurrency] = useState<'UGX' | 'USD'>('UGX')
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [monthlyDepositStatus, setMonthlyDepositStatus] = useState<{
    isActive: boolean
    amount: number
    nextExecutionDate?: string
    status?: string
    hasUpcomingJob?: boolean
    daysUntilNext?: number
    nextJob?: {
      amount: number
      executionDate: string
      job_year?: number
      job_month?: number
    }
  } | null>(null)

  // Currency conversion functions
  const convertToUGX = (usdAmount: number): number => {
    return usdAmount * currencyRate
  }

  const convertToUSD = (ugxAmount: number): number => {
    return ugxAmount / currencyRate
  }

  const formatCurrency = (amount: number, currency: 'UGX' | 'USD' = displayCurrency): string => {
    if (currency === 'UGX') {
      return `UGX ${Math.round(amount).toLocaleString()}`
    } else {
        return `$${Math.round(amount).toLocaleString()}`
    }
  }

  const getConvertedAmount = (amount: number, fromCurrency: 'UGX' | 'USD', toCurrency: 'UGX' | 'USD'): number => {
    if (fromCurrency === toCurrency) return amount
    if (fromCurrency === 'USD' && toCurrency === 'UGX') return convertToUGX(amount)
    if (fromCurrency === 'UGX' && toCurrency === 'USD') return convertToUSD(amount)
    return amount
  }

  // Projection calculation helper functions
  const projectScenario = ({
    initialUGX,
    monthlyUGX,
    rate,
    projectionYears,
    reinvest
  }: {
    initialUGX: number
    monthlyUGX: number
    rate: number
    projectionYears: number
    reinvest: boolean
  }): ProjectionResult => {
    const projectionMonths = projectionYears * 12
    const rMonth = rate / 12
    const totalInvested = initialUGX + monthlyUGX * projectionMonths
    const series: number[] = []
    const labels: number[] = []

    if (reinvest) {
      // Compounding calculation
      series[0] = initialUGX
      for (let m = 1; m <= projectionMonths; m++) {
        series[m] = series[m - 1] * (1 + rMonth) + monthlyUGX
        labels.push(m)
      }
    } else {
      // Simple interest calculation
      series[0] = initialUGX
      for (let m = 1; m <= projectionMonths; m++) {
        series[m] = series[m - 1] + monthlyUGX
        labels.push(m)
      }

      // Add simple interest
      const interestInitial = initialUGX * rate * projectionYears
      let interestMonthlies = 0
      for (let m = 1; m <= projectionMonths; m++) {
        const monthsHeld = projectionMonths - m
        interestMonthlies += monthlyUGX * rate * (monthsHeld / 12)
      }
      
      const finalValue = totalInvested + interestInitial + interestMonthlies
      series[projectionMonths] = finalValue
    }

    const projectedValue = series[projectionMonths]
    const interestEarned = projectedValue - totalInvested
    const totalReturnPct = (interestEarned / totalInvested) * 100

    return {
      label: '',
      rate,
      color: '',
      totalInvested,
      projectedValue,
      interestEarned,
      totalReturnPct,
      series,
      labels
    }
  }

  const projectAll = (initialUGX: number, monthlyUGX: number, projectionYears: number, reinvest: boolean): ProjectionResult[] => {
    return scenarios.map(scenario => ({
      ...projectScenario({
        initialUGX,
        monthlyUGX,
        rate: scenario.rate,
        projectionYears,
        reinvest
      }),
      label: scenario.label,
      color: scenario.color
    }))
  }

  // Calculate projections when inputs change
  useEffect(() => {
    const initialUGX = convertToUGX(formData.initialAmount)
    const monthlyUGX = convertToUGX(formData.monthlyAmount)
    
    if (initialUGX > 0 || monthlyUGX > 0) {
      const results = projectAll(initialUGX, monthlyUGX, formData.projectionYears, formData.reinvestCoupons)
      setProjectionResults(results)
    } else {
      setProjectionResults([])
    }
  }, [formData.initialAmount, formData.monthlyAmount, formData.projectionYears, formData.reinvestCoupons, currencyRate])

  // Fetch currency conversion rate from backend
  const fetchCurrencyRate = async () => {
    try {
      setIsLoadingRate(true)
      setCurrencyError(null)
      
      const response = await apiClient.getExchangeRate('UGX')
      
      if (response.success && response.data) {
        setCurrencyRate(response.data.rate_to_usd)
        logger.log('Currency rate fetched successfully:', response.data.rate_to_usd)
      } else {
        logger.warn('Failed to fetch currency rate, using fallback:', response.message)
        setCurrencyError('Using fallback rate - live rates unavailable')
        // Keep the fallback rate
      }
    } catch (error) {
      logger.error('Error fetching currency rate:', error)
      setCurrencyError('Currency rates unavailable - using fallback')
      // Keep the fallback rate
    } finally {
      setIsLoadingRate(false)
    }
  }

  // Convert currency using backend API
  const convertCurrencyWithAPI = async (usdAmount: number, targetCurrency: string = 'UGX') => {
    try {
      const response = await apiClient.convertCurrency(usdAmount, targetCurrency)
      
      if (response.success && response.data) {
        return {
          success: true,
          convertedAmount: response.data.converted_amount,
          rate: response.data.rate_to_usd
        }
      } else {
        // Fallback to local calculation
        return {
          success: false,
          convertedAmount: usdAmount * currencyRate,
          rate: currencyRate
        }
      }
    } catch (error) {
      logger.error('Error converting currency:', error)
      // Fallback to local calculation
      return {
        success: false,
        convertedAmount: usdAmount * currencyRate,
        rate: currencyRate
      }
    }
  }
  
  // Dialog states
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)

  // Calculate investment projections (all amounts in UGX)
  const calculateProjections = useMemo((): InvestmentProjection[] => {
    const projections: InvestmentProjection[] = []
    const { initialAmount, monthlyAmount, holdingPeriod, reinvestCoupons, selectedBonds } = formData
    
    // Convert USD amounts to UGX for calculations
    const safeInitialAmount = Math.max(0, convertToUGX(initialAmount || 0))
    const safeMonthlyAmount = Math.max(0, convertToUGX(monthlyAmount || 0))
    const safeHoldingPeriod = Math.max(1, holdingPeriod || 1)
    
    // Calculate average yield based on selected bonds or use default for managed
    let averageYield = 0.08 // 8% default for managed
    if (activeTab === 'self-directed' && selectedBonds.length > 0) {
      const selectedBondData = availableBonds.filter(bond => selectedBonds.includes(bond.id))
      if (selectedBondData.length > 0) {
        averageYield = selectedBondData.reduce((sum, bond) => sum + bond.offer_yield, 0) / selectedBondData.length / 100
      }
    }

    let totalInvestment = safeInitialAmount
    let projectedValue = safeInitialAmount
    let interestEarned = 0

    for (let year = 1; year <= safeHoldingPeriod; year++) {
      // Add monthly contributions
      totalInvestment += safeMonthlyAmount * 12
      
      // Calculate interest for the year
      const yearlyInterest = projectedValue * averageYield
      interestEarned += yearlyInterest
      
      // Add interest to projected value
      if (reinvestCoupons) {
        projectedValue += yearlyInterest
      }
      
      // Add monthly contributions to projected value
      projectedValue += safeMonthlyAmount * 12
      
      projections.push({
        year,
        totalInvestment,
        projectedValue,
        interestEarned,
        monthlyValue: projectedValue
      })
    }

    return projections
  }, [formData, activeTab, currencyRate])

  // Fetch currency rate on component mount
  useEffect(() => {
    fetchCurrencyRate()
  }, [])

  const handleFormChange = (field: keyof InvestmentForm, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBondSelection = (bondId: string, selected: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedBonds: selected 
        ? [...prev.selectedBonds, bondId]
        : prev.selectedBonds.filter(id => id !== bondId)
    }))
  }

  // Load monthly deposit status
  const loadMonthlyDepositStatus = async () => {
    try {
      const response = await apiClient.getMonthlyDepositStatus()
      if (response.success && response.data) {
        setMonthlyDepositStatus(response.data)
        logger.log('Monthly deposit status loaded:', response.data)
      }
    } catch (error: unknown) {
      logger.error('Error loading monthly deposit status:', error instanceof Error ? error.message : String(error))
      // Don't show error to user, just log it
    }
  }

  // Load existing investment strategy data
  const loadInvestmentData = async () => {
    setDataLoading(true)
    setDataError(null)
    
    try {
      const response = await apiClient.getInvestmentStrategy()
      if (response.success && response.data) {
        const strategyData = response.data
        setFormData({
          initialAmount: strategyData.initial_amount || 0,
          monthlyAmount: strategyData.monthly_amount || 100, // Default to 100 if no amount set
          holdingPeriod: 5, // Default value
          riskTolerance: strategyData.risk_tolerance || 'moderate',
          investmentGoal: strategyData.investment_goal || 'growth',
          reinvestCoupons: true, // Always default to reinvest coupons
          selectedBonds: strategyData.selected_bonds || [],
          projectionYears: 5 // Default value
        })
        
        // Check if user already has an initial amount set
        if (strategyData.initial_amount && strategyData.initial_amount > 0) {
          setHasExistingInitialAmount(true)
          setOriginalInitialAmount(strategyData.initial_amount)
        }
        
        // Set the active tab based on strategy type
        if (strategyData.strategy_type) {
          setActiveTab(strategyData.strategy_type as 'managed' | 'self-directed')
        }
        
        logger.log('Investment data loaded successfully:', strategyData)
      } else {
        // No strategy found - use default values
        logger.log('No investment strategy found, using default values')
      }

      // Load monthly deposit status
      await loadMonthlyDepositStatus()
    } catch (error: unknown) {
      logger.error('Error loading investment strategy:', error instanceof Error ? error.message : String(error))
      setDataError('Failed to load investment data. Using default values.')
      // Continue with default values
    } finally {
      setDataLoading(false)
    }
  }

  // Fetch available bonds from API
  const fetchAvailableBonds = async () => {
    setBondsLoading(true)
    setBondsError(null)
    
    try {
      const response = await apiClient.getAvailableBonds({
        sortBy: 'maturity_date',
        sortOrder: 'asc',
        limit: 100
      })
      
      if (response.success) {
        // The API returns bonds directly in the response, not nested in data
        setAvailableBonds((response as unknown as { bonds: Bond[] }).bonds || [])
      } else {
        setBondsError(response.message || 'Failed to fetch available bonds')
      }
    } catch (error) {
      logger.error('Error fetching bonds:', error instanceof Error ? error.message : String(error))
      setBondsError('Failed to fetch available bonds')
    } finally {
      setBondsLoading(false)
    }
  }

  // Load investment data on component mount
  useEffect(() => {
    loadInvestmentData()
  }, [])

  // Fetch bonds when component mounts or when switching to self-directed tab
  useEffect(() => {
    if (activeTab === 'self-directed' && availableBonds.length === 0) {
      fetchAvailableBonds()
    }
  }, [activeTab])

  const handleSaveInvestment = async () => {
    // Validate form data
    if (activeTab === 'self-directed' && formData.selectedBonds.length === 0) {
      toast.error('Please select at least one bond for self-directed investment')
      return
    }

    if (formData.monthlyAmount <= 0) {
      toast.error('Please enter a valid monthly investment amount')
      return
    }

    if (formData.monthlyAmount < 50) {
      toast.error('Monthly investment amount must be at least $50')
      return
    }

    // Check if this is just a monthly amount update (initial amount already exists and hasn't changed)
    const isMonthlyAmountUpdateOnly = hasExistingInitialAmount && 
                                      originalInitialAmount !== null && 
                                      formData.initialAmount === originalInitialAmount

    if (isMonthlyAmountUpdateOnly) {
      // Skip MFA and directly update monthly amount
      logger.log('Monthly amount update only - skipping MFA and directly updating')
      try {
        await saveInvestmentData()
      } catch (error) {
        logger.error('Error updating monthly amount:', error)
        // Error is already handled in saveInvestmentData
      }
      return
    }

    // First time setup or initial amount changed — save after confirmation (no MFA on gateway)
    setShowConfirmationDialog(true)
  }

  const handleConfirmInvestment = async () => {
    setShowConfirmationDialog(false)
    try {
      await saveInvestmentData()
    } catch (error) {
      logger.error('Error saving investment:', error instanceof Error ? error.message : String(error))
    }
  }

  const handleCancelInvestment = () => {
    setShowConfirmationDialog(false)
    toast.info('Investment cancelled')
  }

  const saveInvestmentData = async () => {
    try {
      logger.log('Saving investment data:', {
        initialAmount: formData.initialAmount,
        monthlyAmount: formData.monthlyAmount,
        holdingPeriod: formData.holdingPeriod,
        reinvestCoupons: formData.reinvestCoupons,
        investmentType: activeTab,
        selectedBonds: activeTab === 'self-directed' ? selectedBondsData : undefined
      })

      // Check if this is just a monthly amount update (initial amount already exists and hasn't changed)
      const isMonthlyAmountUpdateOnly = hasExistingInitialAmount && 
                                        originalInitialAmount !== null && 
                                        formData.initialAmount === originalInitialAmount

      logger.log('Investment save context:', {
        hasExistingInitialAmount,
        originalInitialAmount,
        currentInitialAmount: formData.initialAmount,
        isMonthlyAmountUpdateOnly
      })

      // Prepare investment data based on investment type
      const investmentPayload: {
        initialAmount: number
        monthlyAmount: number
        holdingPeriod: number
        riskTolerance: string
        investmentGoal: string
        reinvestCoupons: boolean
        investmentType: string
        selectedBonds?: Bond[]
      } = {
        initialAmount: formData.initialAmount,
        monthlyAmount: formData.monthlyAmount,
        holdingPeriod: formData.holdingPeriod,
        riskTolerance: formData.riskTolerance,
        investmentGoal: formData.investmentGoal,
        reinvestCoupons: formData.reinvestCoupons,
        investmentType: activeTab
      }

      // For self-directed investments, include selected bonds
      if (activeTab === 'self-directed' && selectedBondsData && selectedBondsData.length > 0) {
        investmentPayload.selectedBonds = selectedBondsData
      }

      const response = await apiClient.saveInvestmentStrategy(investmentPayload)

      if (response.success) {
        logger.log('Investment strategy saved successfully:', response.data)
        
        // Schedule monthly deposit if monthly amount is set
        if (formData.monthlyAmount > 0) {
          try {
            await apiClient.scheduleMonthlyDeposit(formData.monthlyAmount)
            logger.log('Monthly deposit scheduled successfully')
          } catch (error: unknown) {
            logger.error('Error scheduling monthly deposit:', error instanceof Error ? error.message : String(error))
            // Don't fail the entire operation, just log the error
          }
        }
        
        // Reload monthly deposit status
        await loadMonthlyDepositStatus()
        
        // If this is just a monthly amount update, skip Cybrid flow
        if (isMonthlyAmountUpdateOnly) {
          toast.success('Monthly investment amount has been updated successfully!')
          logger.log('Monthly amount update only - skipping Cybrid flow')
          
          // Reload investment data to refresh UI with updated monthly amount
          await loadInvestmentData()
          
          return response.data
        }
        
        // First time setup or initial amount changed - proceed with normal flow
        toast.success('Investment strategy saved successfully!')
        
        // Handle post-save logic (check bank account and redirect)
        await handlePostSaveLogic()
        
        return response.data
      } else {
        throw new Error(response.message || 'Failed to save investment strategy')
      }
    } catch (error: unknown) {
      logger.error('Error saving investment data:', error instanceof Error ? error.message : String(error))
      toast.error('Failed to save investment strategy. Please try again.')
      throw error
    }
  }

  const handlePostSaveLogic = async () => {
    logger.log('🚀 handlePostSaveLogic - Starting bank account check')
    try {
      // Check bank account status
      logger.log('📞 Calling apiClient.checkBankAccountStatus()...')
      const bankResponse = await apiClient.checkBankAccountStatus()
      
      // 🔍 COMPREHENSIVE DEBUGGING - Log the entire response
      logger.log('📊 FULL BANK RESPONSE:', bankResponse)
      logger.log('📊 Bank response type:', typeof bankResponse)
      logger.log('📊 Bank response keys:', Object.keys(bankResponse))
      logger.log('📊 Bank response.success:', bankResponse.success)
      logger.log('📊 Bank response.data:', bankResponse.data)
      logger.log('📊 Bank response.message:', bankResponse.message)
      
      // 🔍 CRITICAL DEBUGGING - Check if response is wrapped
      logger.log('🔍 bankResponse === bankResponse.data:', bankResponse === bankResponse.data)
      logger.log('🔍 bankResponse.data type:', typeof bankResponse.data)
      logger.log('🔍 bankResponse.data keys:', bankResponse.data ? Object.keys(bankResponse.data) : 'null/undefined')
      
      if (bankResponse.success) {
        // 🔍 DEBUG: Check if response is wrapped or direct
        logger.log('🔍 bankResponse.data exists:', !!bankResponse.data)
        logger.log('🔍 bankResponse.hasBankAccount exists:', 'hasBankAccount' in bankResponse)
        
        // Try to get bank data from either wrapped or direct response
        const bankData = (bankResponse.data || bankResponse) as {
          hasBankAccount: boolean
          bankAccountData?: {
            external_bank_account_id: string
            status: string
            bank_account_number: string
            user_id: string
            cybrid_customer_id: string
          }
          message?: string
        }
        
        // 🔍 CRITICAL: Log the exact hasBankAccount value we're working with
        logger.log('🔍 FINAL bankData.hasBankAccount:', bankData.hasBankAccount)
        logger.log('🔍 FINAL bankData.hasBankAccount type:', typeof bankData.hasBankAccount)
        
        // 🔍 DEBUG: Log the bank data structure
        logger.log('📊 BANK DATA:', bankData)
        logger.log('📊 Bank data type:', typeof bankData)
        logger.log('📊 Bank data keys:', bankData ? Object.keys(bankData) : 'null/undefined')
        logger.log('📊 Bank data.hasBankAccount:', bankData?.hasBankAccount)
        logger.log('📊 Bank data.bankAccountData:', bankData?.bankAccountData)
        logger.log('📊 Bank data.message:', bankData?.message)
        
        // 🔍 ADDITIONAL DEBUGGING - Check the exact values
        logger.log('🔍 hasBankAccount value:', bankData?.hasBankAccount)
        logger.log('🔍 hasBankAccount type:', typeof bankData?.hasBankAccount)
        logger.log('🔍 hasBankAccount === true:', bankData?.hasBankAccount === true)
        logger.log('🔍 hasBankAccount == true:', bankData?.hasBankAccount == true)
        logger.log('🔍 Boolean(hasBankAccount):', Boolean(bankData?.hasBankAccount))
        
        // Updated logic: Only redirect if NO completed external bank account exists
        logger.log('🚨 DECISION POINT: About to check bankData?.hasBankAccount')
        logger.log('🚨 bankData?.hasBankAccount value:', bankData?.hasBankAccount)
        logger.log('🚨 bankData?.hasBankAccount type:', typeof bankData?.hasBankAccount)
        logger.log('🚨 bankData?.hasBankAccount === true:', bankData?.hasBankAccount === true)
        
        // 🔍 ROBUST CHECK: Handle different possible values
        const hasBankAccount = Boolean(bankData?.hasBankAccount)
        
        // 🔍 FALLBACK CHECK: Also check the message for completed bank account
        const messageIndicatesCompleted = bankData?.message?.includes('completed') || 
                                         bankData?.message?.includes('verified')
        
        const finalHasBankAccount = hasBankAccount || messageIndicatesCompleted
        
        logger.log('🔍 ROBUST CHECK - hasBankAccount result:', hasBankAccount)
        logger.log('🔍 FALLBACK CHECK - message indicates completed:', messageIndicatesCompleted)
        logger.log('🔍 FINAL DECISION - finalHasBankAccount:', finalHasBankAccount)
        
        if (finalHasBankAccount) {
          // ✅ User has a completed external bank account - proceed with Cybrid funding flow
          logger.log('✅ COMPLETED EXTERNAL BANK ACCOUNT FOUND!')
          logger.log('✅ Bank account details:', bankData.bankAccountData)
          logger.log('✅ Proceeding with Cybrid funding flow...')
          toast.success('Investment setup complete! Your bank account is ready.')
          
          // Proceed with Cybrid funding flow (same as automatic investment)
          await handleCybridFundingFlow()
          
        } else {
          // ❌ No completed external bank account exists - redirect to bank setup
          logger.log('❌ NO COMPLETED EXTERNAL BANK ACCOUNT FOUND!')
          logger.log('❌ Bank data that was received:', bankData)
          logger.log('❌ hasBankAccount value:', bankData?.hasBankAccount)
          logger.log('❌ hasBankAccount type:', typeof bankData?.hasBankAccount)
          logger.log('❌ Redirecting to bank setup...')
          toast.info('Please complete your bank account setup to finalize your investment.')
          
          // Redirect to bank setup page
          setTimeout(() => {
            router.push('/dashboard/bank')
          }, 2000)
        }
      } else {
        logger.error('❌ BANK RESPONSE FAILED!')
        logger.error('❌ Failed to check bank account status:', bankResponse.message)
        logger.error('❌ Full failed response:', bankResponse)
        toast.error('Unable to verify bank account status. Please try again.')
      }
    } catch (error: unknown) {
      logger.error('💥 ERROR IN POST-SAVE LOGIC!')
      logger.error('💥 Error details:', error)
      logger.error('💥 Error message:', error instanceof Error ? error.message : String(error))
      logger.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
      toast.error('Failed to complete setup verification. Please try again.')
    }
  }

  const handleCybridFundingFlow = async () => {
    try {
      logger.log('🚀 Starting Cybrid funding flow...')
      
      // Use the same logic as automatic investment page
      const purchaseData = {
        amount: formData.initialAmount,
        bondData: [
          {
            bondId: "investment-strategy",
            amount: formData.initialAmount,
            display_name: "Investment Strategy",
            name: "Strategy Investment"
          }
        ]
      }

      logger.log('📞 Calling confirmPurchase with data:', purchaseData)
      const response = await apiClient.confirmPurchase(purchaseData)
      
      if (response.success) {
        logger.log('✅ Investment confirmed successfully:', response.data)
        toast.success('Investment processed successfully! Your funds are being transferred.')
        
        // Redirect to transactions page after a short delay
        setTimeout(() => {
          router.push('/dashboard/transactions')
        }, 2000)
      } else {
        throw new Error(response.message || 'Failed to process investment')
      }
      
    } catch (error: unknown) {
      logger.error('💥 Error in Cybrid funding flow:', error instanceof Error ? error.message : String(error))
      toast.error('Failed to process investment funding. Please try again.')
      
      // Still redirect to transactions page to show the saved investment strategy
      setTimeout(() => {
        router.push('/dashboard/transactions')
      }, 2000)
    }
  }

  const currentProjection = calculateProjections[calculateProjections.length - 1]
  const selectedBondsData = availableBonds.filter(bond => formData.selectedBonds.includes(bond.id))
  logger.log('Selected bonds data:', selectedBondsData)

  return (
    <ProtectedRoute>
      <Layout>
        <AnimatedPage>
          {/* Compact Page Header */}
          <div className="mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Recurring Investment
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Set up and manage your recurring investment strategy to grow your wealth over time.
                </p>
              </div>
            </div>
          </div>

          {/* Data Loading and Error Handling */}
          {dataLoading && (
            <div className="mb-6">
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">Loading your investment data...</span>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>
          )}

          {dataError && (
            <div className="mb-6">
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">Data Loading Issue</p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">{dataError}</p>
                      <Button 
                        onClick={loadInvestmentData} 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>
          )}

          {/* Monthly Deposit Status */}
          {monthlyDepositStatus && (
            <div className="mb-4">
              <AnimatedCard delay={0.1}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>Monthly Recurring Investment Status</span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href="/dashboard/investment/monthly-deposits">View All Deposits</a>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyDepositStatus?.hasUpcomingJob && monthlyDepositStatus?.daysUntilNext !== null ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        Next Recurring Investment: $ {(monthlyDepositStatus?.nextJob?.amount || 0).toLocaleString()} USD
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Scheduled for {monthlyDepositStatus?.nextJob?.job_year && monthlyDepositStatus?.nextJob?.job_month ? new Date(monthlyDepositStatus.nextJob.job_year, monthlyDepositStatus.nextJob.job_month - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {monthlyDepositStatus.daysUntilNext}
                      </div>
                      <div className="text-sm text-blue-500">
                        {monthlyDepositStatus.daysUntilNext === 1 ? 'day' : 'days'} left
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No upcoming monthly investments scheduled
                    </p>
                  </div>
                )}
              </CardContent>
              </AnimatedCard>
            </div>
          )}

          {/* Investment Tabs */}
          <AnimatedCard delay={0.2}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'managed' | 'self-directed')} className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-4">
                <TabsTrigger value="managed" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Managed Recurring Investment
                </TabsTrigger>
                {/* Temporarily hidden - Self-Directed Investment tab */}

                {/* Easy to Restore
To show the Self-Directed Investment tab again, simply:
Remove the hidden attribute from the TabsTrigger
Change grid-cols-1 back to grid-cols-2 in the TabsList
Remove the comment if desired */}
                <TabsTrigger value="self-directed" className="flex items-center gap-2" hidden>
                  <Target className="h-4 w-4" />
                  Self-Directed Investment
                </TabsTrigger>
              </TabsList>

              {/* Managed Investment Tab */}
              <TabsContent value="managed" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Investment Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Managed Recurring Investment
                      </CardTitle>
                      <CardDescription>
                        Let Borabond manage your investments with our expert strategies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="initial-amount" className="flex items-center gap-2">
                            Initial Amount (USD)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Your starting investment amount</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="initial-amount"
                            type="number"
                            value={formData.initialAmount || ''}
                            onChange={(e) => handleFormChange('initialAmount', Number(e.target.value) || 0)}
                            placeholder="Enter initial amount"
                            disabled={hasExistingInitialAmount}
                            className={hasExistingInitialAmount ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}
                          />
                          {formData.initialAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>≈ UGX {Math.round(convertToUGX(formData.initialAmount)).toLocaleString()}</span>
                            </div>
                          )}
                          {hasExistingInitialAmount && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {/* Initial amount cannot be changed once set. Contact support if needed. */}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="monthly-amount" className="flex items-center gap-2">
                            Monthly Amount (USD)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Regular monthly investment amount</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Input
                            id="monthly-amount"
                            type="number"
                            value={formData.monthlyAmount}
                            onChange={(e) => handleFormChange('monthlyAmount', Number(e.target.value))}
                            placeholder="$100"
                            min="50"
                          />
                          {formData.monthlyAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>≈ UGX {Math.round(convertToUGX(formData.monthlyAmount)).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Projection Period moved to Recurring Investment Projections card */}

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <Label htmlFor="reinvest-coupons" className="flex items-center gap-2">
                              Reinvest Coupons
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Automatically reinvest coupon payments to compound your returns</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formData.reinvestCoupons ? 'Coupons will be reinvested' : 'Coupons will be withdrawn'}
                            </p>
                          </div>
                          <Switch
                            id="reinvest-coupons"
                            checked={formData.reinvestCoupons}
                            onCheckedChange={(checked) => handleFormChange('reinvestCoupons', checked)}
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleSaveInvestment} 
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving Investment...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Investment
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Investment Projections */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Investment Projections
                          </CardTitle>
                      
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Currency Toggle */}
                          <div className="flex items-center gap-2">
                            <Label htmlFor="currency-toggle" className="text-xs">Currency:</Label>
                            <div className="flex items-center border rounded-lg p-1">
                              <Button
                                variant={displayCurrency === 'UGX' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDisplayCurrency('UGX')}
                              >
                                UGX
                              </Button>
                              <Button
                                variant={displayCurrency === 'USD' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDisplayCurrency('USD')}
                              >
                                USD
                              </Button>
                            </div>
                            {isLoadingRate && (
                              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
                            )}
                            {currencyError && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{currencyError}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={fetchCurrencyRate}
                              disabled={isLoadingRate}
                            >
                              <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                          
                          {/* Projection Years Slider */}
                          <div className="w-full sm:w-48">
                            <Label htmlFor="projection-years" className="text-xs mb-1 block">
                              Projection Period: {formData.projectionYears} years
                            </Label>
                            <input
                              id="projection-years"
                              type="range"
                              min="0.25"
                              max="20"
                              step="0.25"
                              value={formData.projectionYears}
                              onChange={(e) => handleFormChange('projectionYears', Number(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((formData.projectionYears - 0.25) / (20 - 0.25)) * 100}%, #e5e7eb ${((formData.projectionYears - 0.25) / (20 - 0.25)) * 100}%, #e5e7eb 100%)`
                              }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>3m</span>
                              <span>20y</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Compact Scenario KPI Cards */}
                      {projectionResults.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {projectionResults.map((scenario) => (
                            <div key={scenario.label} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: scenario.color }}
                                />
                                <h4 className="font-semibold text-xs">{scenario.label} Case</h4>
                              </div>
                              <div className="space-y-1">
                                <div className="text-center">
                                  <div className="text-sm font-bold" style={{ color: scenario.color }}>
                                    {formatCurrency(
                                      getConvertedAmount(scenario.projectedValue, 'UGX', displayCurrency)
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Projected</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-gray-700">
                                    {formatCurrency(
                                      getConvertedAmount(scenario.interestEarned, 'UGX', displayCurrency)
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">Interest</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-semibold text-green-600">
                                    Return: {Math.round(scenario.totalReturnPct)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Multi-Scenario Chart - Compact */}
                      {projectionResults.length > 0 && (
                        <div className="h-64 pl-4 pr-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionResults[0]?.series.map((value, index) => {
                              const initialUGX = convertToUGX(formData.initialAmount)
                              const monthlyUGX = convertToUGX(formData.monthlyAmount)
                              const cumulativeInvested = initialUGX + (monthlyUGX * index)
                              
                              return {
                                year: index / 12,
                                best: projectionResults[0]?.series[index] || 0,
                                expected: projectionResults[1]?.series[index] || 0,
                                worst: projectionResults[2]?.series[index] || 0,
                                projection: cumulativeInvested
                              }
                            })}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="year" 
                                tickFormatter={(value) => `${value.toFixed(1)}y`}
                                interval={11}
                              />
                              <YAxis 
                                tickFormatter={(value) => {
                                  const convertedValue = getConvertedAmount(value, 'UGX', displayCurrency)
                                  return displayCurrency === 'UGX' 
                                    ? `UGX ${(convertedValue / 1000000).toFixed(0)}M`
                                    : `$${(convertedValue / 1000).toFixed(0)}K`
                                }}
                                width={90}
                                tick={{ fontSize: 12, fill: '#374151' }}
                                axisLine={{ stroke: '#e5e7eb' }}
                                tickLine={{ stroke: '#e5e7eb' }}
                              />
                              <RechartsTooltip 
                                formatter={(value, name) => {
                                  const convertedValue = getConvertedAmount(Number(value), 'UGX', displayCurrency)
                                  return [
                                    `${formatCurrency(convertedValue)}`, 
                                    name === 'best' ? 'Best Case' : 
                                    name === 'expected' ? 'Expected Case' : 
                                    name === 'worst' ? 'Worst Case' : 
                                    name === 'projection' ? 'Total Invested' : name
                                  ]
                                }}
                                labelFormatter={(label) => `Year ${label.toFixed(1)}`}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="best" 
                                stroke="#10b981" 
                                fill="#10b981"
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="expected" 
                                stroke="#3b82f6" 
                                fill="#3b82f6"
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="worst" 
                                stroke="#8b5cf6" 
                                fill="#8b5cf6"
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="projection" 
                                stroke="#f59e0b" 
                                fill="transparent"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={false}
                                connectNulls={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Compact Reinvest Toggle */}
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <Label htmlFor="reinvest-coupons-projection" className="flex items-center gap-2 text-sm">
                            Reinvest Coupons
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Toggle between compounding (reinvest=true) and simple interest (reinvest=false)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formData.reinvestCoupons ? 'Compounding returns' : 'Simple interest'}
                          </p>
                        </div>
                        <Switch
                          id="reinvest-coupons-projection"
                          checked={formData.reinvestCoupons}
                          onCheckedChange={(checked) => handleFormChange('reinvestCoupons', checked)}
                        />
                      </div>

                      {/* Disclosure */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p>
                        Scenarios are illustrative and assume fixed annual yields for display purposes. Based on monthly end-of-month deposits and the selected reinvest setting. Figures are shown after fees and taxes. USD values reflect current FX rates for display only. Actual results may differ, and past performance does not guarantee future results
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Self-Directed Investment Tab */}
              <TabsContent value="self-directed" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {/* Bond Selection */}
                  <Card className="xl:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-4 w-4" />
                        Available Bonds ({availableBonds.length})
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Select bonds for your self-directed investment portfolio
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                      {bondsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-3 border rounded-lg animate-pulse">
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                  <div className="flex gap-4">
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                  </div>
                                </div>
                                <div className="w-12 h-5 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : bondsError ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                          <p className="text-red-600 dark:text-red-400 mb-4">{bondsError}</p>
                          <Button onClick={fetchAvailableBonds} variant="outline">
                            Try Again
                          </Button>
                        </div>
                      ) : availableBonds.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">No bonds available right now</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                          {availableBonds.map((bond) => {
                            const riskLevel = getRiskLevel(bond.offer_yield)
                            return (
                              <motion.div
                                key={bond.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-2 border rounded-lg transition-all duration-200 cursor-pointer ${
                                  formData.selectedBonds.includes(bond.id) 
                                    ? 'border-green-300 bg-green-50 dark:bg-green-900/10' 
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                                onClick={() => handleBondSelection(bond.id, !formData.selectedBonds.includes(bond.id))}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`bond-${bond.id}`}
                                    checked={formData.selectedBonds.includes(bond.id)}
                                    onCheckedChange={(checked) => handleBondSelection(bond.id, checked as boolean)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm">{countryFlags[bond.country] || '🌍'}</span>
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {bond.display_name}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                      <span>
                                        <span className="font-medium text-green-600">{bond.coupon_rate.toFixed(1)}%</span> coupon
                                      </span>
                                      <span>
                                        <span className="font-medium text-blue-600">{bond.offer_yield.toFixed(1)}%</span> yield
                                      </span>
                                      <span>
                                        {bond.tenor}y
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Matures: {new Date(bond.maturity_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                  </div>
                                  <Badge 
                                    className={`text-xs ${
                                      riskLevel === 'Low' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        : riskLevel === 'Medium'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    }`}
                                  >
                                    {riskLevel}
                                  </Badge>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Investment Summary */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Investment Summary
                      </CardTitle>
                      <CardDescription>
                        Your selected bonds and investment details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Selected Bonds */}
                      <div>
                        <Label className="text-sm font-medium">Selected Bonds ({selectedBondsData.length})</Label>
                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                          {selectedBondsData.length > 0 ? (
                            selectedBondsData.map((bond) => (
                              <div key={bond.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{countryFlags[bond.country] || '🌍'}</span>
                                  <span className="font-medium truncate">{bond.country}</span>
                                </div>
                                <span className="text-green-600 font-medium">{bond.offer_yield.toFixed(1)}%</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 p-2">No bonds selected</p>
                          )}
                        </div>
                      </div>

                      {/* Investment Form */}
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="sd-initial-amount" className="text-sm">Initial Amount (USD)</Label>
                          <Input
                            id="sd-initial-amount"
                            type="number"
                            value={formData.initialAmount || ''}
                            onChange={(e) => handleFormChange('initialAmount', Number(e.target.value) || 0)}
                            placeholder="Enter initial amount"
                            className="h-9"
                            disabled={hasExistingInitialAmount}
                            style={hasExistingInitialAmount ? { backgroundColor: 'rgb(249 250 251)', cursor: 'not-allowed' } : {}}
                          />
                          {formData.initialAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Eye className="h-3 w-3" />
                              <span>≈ UGX {Math.round(convertToUGX(formData.initialAmount)).toLocaleString()}</span>
                            </div>
                          )}
                          {hasExistingInitialAmount && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Initial amount cannot be changed once set.
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="sd-monthly-amount" className="text-sm">Monthly Amount (USD)</Label>
                          <Input
                            id="sd-monthly-amount"
                            type="number"
                            value={formData.monthlyAmount}
                            onChange={(e) => handleFormChange('monthlyAmount', Number(e.target.value))}
                            placeholder="$100"
                            min="50"
                            className="h-9"
                          />
                          {formData.monthlyAmount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Eye className="h-3 w-3" />
                              <span>≈ UGX {Math.round(convertToUGX(formData.monthlyAmount)).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Projection Period moved to Growth Projection card */}

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Label htmlFor="sd-reinvest-coupons" className="text-sm">Reinvest Coupons</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {formData.reinvestCoupons ? 'Coupons will be reinvested' : 'Coupons will be withdrawn'}
                            </p>
                          </div>
                          <Switch
                            id="sd-reinvest-coupons"
                            checked={formData.reinvestCoupons}
                            onCheckedChange={(checked) => handleFormChange('reinvestCoupons', checked)}
                          />
                        </div>
                      </div>

                      {/* Projection Summary */}
                      {selectedBondsData.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {currentProjection ? formatCurrency(
                                getConvertedAmount(currentProjection.totalInvestment, 'UGX', displayCurrency),
                                displayCurrency
                              ) : formatCurrency(0, displayCurrency)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Total Investment</div>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {currentProjection ? formatCurrency(
                                getConvertedAmount(currentProjection.projectedValue, 'UGX', displayCurrency),
                                displayCurrency
                              ) : formatCurrency(0, displayCurrency)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Projected Value</div>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {currentProjection ? formatCurrency(
                                getConvertedAmount(currentProjection.interestEarned, 'UGX', displayCurrency),
                                displayCurrency
                              ) : formatCurrency(0, displayCurrency)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Interest Earned</div>
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handleSaveInvestment} 
                        disabled={isLoading || selectedBondsData.length === 0}
                        className="w-full"
                        size="sm"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Investment
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Growth Chart for Self-Directed */}
                {selectedBondsData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Portfolio Growth Projection
                          </CardTitle>
                          <CardDescription className="mt-1">
                            How your selected bonds will grow over {formData.holdingPeriod} years projection period
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Currency Toggle */}
                          <div className="flex items-center gap-2">
                            <Label htmlFor="sd-currency-toggle" className="text-xs">Display:</Label>
                            <div className="flex items-center border rounded-lg p-1">
                              <Button
                                variant={displayCurrency === 'UGX' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDisplayCurrency('UGX')}
                              >
                                UGX
                              </Button>
                              <Button
                                variant={displayCurrency === 'USD' ? 'default' : 'ghost'}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setDisplayCurrency('USD')}
                              >
                                USD
                              </Button>
                            </div>
                            {isLoadingRate && (
                              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
                            )}
                            {currencyError && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{currencyError}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={fetchCurrencyRate}
                              disabled={isLoadingRate}
                            >
                              <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                          
                          {/* Projection Period */}
                          <div className="w-full sm:w-48">
                            <Label htmlFor="sd-projection-period" className="text-xs mb-1 block">Projection Period</Label>
                            <Select value={formData.holdingPeriod.toString()} onValueChange={(value) => handleFormChange('holdingPeriod', Number(value))}>
                              <SelectTrigger id="sd-projection-period" className="h-8">
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="5">5 Years</SelectItem>
                                <SelectItem value="10">10 Years</SelectItem>
                                <SelectItem value="15">15 Years</SelectItem>
                                <SelectItem value="20">20 Years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Summary Cards for Self-Directed */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-center p-4 border rounded-lg cursor-help">
                                <div className="text-2xl font-bold text-green-600">
                                  {currentProjection ? formatCurrency(
                                    getConvertedAmount(currentProjection.totalInvestment, 'UGX', displayCurrency),
                                    displayCurrency
                                  ) : formatCurrency(0, displayCurrency)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Investment</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {displayCurrency === 'UGX' 
                                  ? `≈ $${currentProjection ? convertToUSD(currentProjection.totalInvestment).toLocaleString() : '0'}`
                                  : `≈ UGX ${currentProjection ? Math.round(currentProjection.totalInvestment).toLocaleString() : '0'}`
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-center p-4 border rounded-lg cursor-help">
                                <div className="text-2xl font-bold text-blue-600">
                                  {currentProjection ? formatCurrency(
                                    getConvertedAmount(currentProjection.projectedValue, 'UGX', displayCurrency),
                                    displayCurrency
                                  ) : formatCurrency(0, displayCurrency)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Projected Value</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {displayCurrency === 'UGX' 
                                  ? `≈ $${currentProjection ? convertToUSD(currentProjection.projectedValue).toLocaleString() : '0'}`
                                  : `≈ UGX ${currentProjection ? Math.round(currentProjection.projectedValue).toLocaleString() : '0'}`
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-center p-4 border rounded-lg cursor-help">
                                <div className="text-2xl font-bold text-purple-600">
                                  {currentProjection ? formatCurrency(
                                    getConvertedAmount(currentProjection.interestEarned, 'UGX', displayCurrency),
                                    displayCurrency
                                  ) : formatCurrency(0, displayCurrency)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Interest Earned</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {displayCurrency === 'UGX' 
                                  ? `≈ $${currentProjection ? convertToUSD(currentProjection.interestEarned).toLocaleString() : '0'}`
                                  : `≈ UGX ${currentProjection ? Math.round(currentProjection.interestEarned).toLocaleString() : '0'}`
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {currentProjection && currentProjection.totalInvestment > 0 
                              ? ((currentProjection.projectedValue / currentProjection.totalInvestment - 1) * 100).toFixed(1) 
                              : '0.0'}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Total Return</div>
                        </div>
                      </div>

                      <div className="h-64 pl-4 pr-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={calculateProjections}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" interval={0} />
                            <YAxis 
                              tickFormatter={(value) => {
                                const convertedValue = getConvertedAmount(value, 'UGX', displayCurrency)
                                return displayCurrency === 'UGX' 
                                  ? `UGX ${(convertedValue / 1000000).toFixed(0)}M`
                                  : `$${(convertedValue / 1000).toFixed(0)}K`
                              }}
                              width={90}
                              tick={{ fontSize: 12, fill: '#374151' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={{ stroke: '#e5e7eb' }}
                            />
                            <RechartsTooltip 
                              formatter={(value, name) => {
                                const convertedValue = getConvertedAmount(Number(value), 'UGX', displayCurrency)
                                return [
                                  `${formatCurrency(convertedValue)}`, 
                                  name === 'projectedValue' ? 'Projected Value' : 'Total Investment'
                                ]
                              }}
                              labelFormatter={(label) => `Year ${label}`}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="projectedValue" 
                              stroke="#16a34a" 
                              fill="#16a34a"
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="totalInvestment" 
                              stroke="#3b82f6" 
                              fill="#3b82f6"
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </AnimatedCard>

          {/* Investment Confirmation Dialog */}
          <InvestmentConfirmationDialog
            isOpen={showConfirmationDialog}
            onClose={() => setShowConfirmationDialog(false)}
            onConfirm={handleConfirmInvestment}
            onCancel={handleCancelInvestment}
            investmentData={{
              initialAmount: formData.initialAmount,
              monthlyAmount: formData.monthlyAmount,
              reinvestCoupons: formData.reinvestCoupons,
              investmentType: activeTab,
              selectedBonds: activeTab === 'self-directed' ? selectedBondsData : undefined
            }}
            isLoading={false}
          />
        </AnimatedPage>
      </Layout>
    </ProtectedRoute>
  )
}
