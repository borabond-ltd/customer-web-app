'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info, Shield, Building2, Users, CheckCircle } from 'lucide-react'
import { OnboardingQuestion } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

import { logger } from '@/lib/logger'
interface RegulatoryDisclosuresProps {
  question: OnboardingQuestion
}

export function RegulatoryDisclosures({ question }: RegulatoryDisclosuresProps) {
  const { state, updateAnswer } = useOnboarding()
  const currentValue = (state.answers[question.id] as string[]) || []
  const error = state.errors[question.id]
  
  // Debug logging
  logger.log('RegulatoryDisclosures rendered:', { currentValue, hasBrokerageAffiliation: currentValue.includes('brokerageAffiliation') })

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    let newValues: string[] = []

    if (optionValue === 'noneApply') {
      // If "None of these apply" is selected, clear all other selections
      newValues = checked ? ['noneApply'] : []
    } else {
      // If any other option is selected, remove "noneApply" and toggle the current option
      newValues = currentValue.filter(v => v !== 'noneApply')
      
      if (checked) {
        newValues = [...newValues, optionValue]
      } else {
        newValues = newValues.filter(v => v !== optionValue)
      }
    }

    updateAnswer(question.id, newValues)
  }

  const getOptionIcon = (value: string) => {
    switch (value) {
      case 'brokerageAffiliation':
        return <Building2 className="h-4 w-4 text-blue-600" />
      case 'executiveShareholder':
        return <Users className="h-4 w-4 text-green-600" />
      case 'noneApply':
        return <CheckCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Shield className="h-4 w-4 text-purple-600" />
    }
  }

  const getTooltipContent = (value: string) => {
    switch (value) {
      case 'brokerageAffiliation':
        return 'FINRA (Financial Industry Regulatory Authority) is a self-regulatory organization that oversees brokerage firms and their employees. A brokerage firm is a financial institution that facilitates the buying and selling of securities.'
      case 'executiveShareholder':
        return 'A senior executive typically includes C-level positions (CEO, CFO, etc.) or other high-ranking officers. A 10% or greater shareholder owns a significant portion of a publicly traded company\'s stock.'
      default:
        return ''
    }
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 shadow-lg">
          <CardHeader className="pb-1 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Shield className="h-4 w-4 text-blue-600" />
              {question.title}
              <span className="text-red-500">*</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {question.helpText}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-2 px-3 sm:px-6">
            {question.options?.map((option, index) => {
              const isChecked = currentValue.includes(option.value)
              const hasTooltip = option.value !== 'noneApply'
              
              return (
                <motion.div
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        id={`${question.id}-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCheckboxChange(option.value, checked as boolean)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      
                      <div className="flex items-center gap-2 flex-1">
                        {getOptionIcon(option.value)}
                        <Label 
                          htmlFor={`${question.id}-${option.value}`} 
                          className="text-sm font-medium text-gray-900 cursor-pointer flex-1 leading-relaxed"
                        >
                          {option.text}
                        </Label>
                        
                        {hasTooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="More information"
                              >
                                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-xs p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg"
                            >
                              <p>{getTooltipContent(option.value)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 font-medium">
              {error}
            </p>
          </motion.div>
        )}

        {/* FINRA Affiliation Form */}
        {currentValue.includes('brokerageAffiliation') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3"
            style={{ overflow: 'visible' }}
          >
            <Card className="border-2 border-orange-50 bg-gradient-to-br from-orange-50/50 to-amber-50/50">
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  FINRA Affiliation Details
                  <span className="text-red-500">*</span>
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600">
                  Please provide additional information about your FINRA affiliation.
                </p>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div>
                  <Label htmlFor="finraMember" className="text-sm font-medium text-gray-700">
                    What FINRA member are you affiliated with?
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="finraMember"
                    type="text"
                    value={(state.answers['finraMember'] as string) || ''}
                    onChange={(e) => updateAnswer('finraMember', e.target.value)}
                    placeholder="Enter FINRA member firm name"
                    className={`mt-1 ${state.errors['finraMember'] ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {state.errors['finraMember'] && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1">{state.errors['finraMember']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supervisorEmail" className="text-sm font-medium text-gray-700">
                    Supervisor email address
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="supervisorEmail"
                    type="email"
                    value={(state.answers['supervisorEmail'] as string) || ''}
                    onChange={(e) => updateAnswer('supervisorEmail', e.target.value)}
                    placeholder="supervisor@firm.com"
                    className={`mt-1 ${state.errors['supervisorEmail'] ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {state.errors['supervisorEmail'] && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1">{state.errors['supervisorEmail']}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supervisorPhone" className="text-sm font-medium text-gray-700">
                    Supervisor phone number
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="supervisorPhone"
                    type="tel"
                    value={(state.answers['supervisorPhone'] as string) || ''}
                    onChange={(e) => updateAnswer('supervisorPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className={`mt-1 ${state.errors['supervisorPhone'] ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {state.errors['supervisorPhone'] && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1">{state.errors['supervisorPhone']}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Validation Summary */}
        {currentValue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              {currentValue.includes('noneApply') 
                ? 'You have indicated that none of these disclosures apply to you.'
                : `You have selected ${currentValue.length} disclosure${currentValue.length > 1 ? 's' : ''}.`
              }
            </p>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
