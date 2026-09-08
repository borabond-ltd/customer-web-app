'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { OnboardingQuestion } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RegulatoryDisclosures } from './regulatory-disclosures'
import { EmergencyContact } from './emergency-contact'
import { TermsAndAgreements } from './terms-and-agreements'

interface QuestionFieldProps {
  question: OnboardingQuestion
  africanCountries?: Array<{ value: string; text: string }>
}

export function QuestionField({ question, africanCountries = [] }: QuestionFieldProps) {
  const { state, updateAnswer } = useOnboarding()
  const currentValue = state.answers[question.id] || ''
  const error = state.errors[question.id]

  const handleValueChange = (value: string | string[]) => {
    updateAnswer(question.id, value)
  }

  const renderField = () => {
    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <Input
            id={question.id}
            type={question.type}
            value={currentValue as string}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`Enter your ${question.title.toLowerCase()}`}
            className={error ? 'border-red-500 focus:border-red-500' : ''}
            aria-describedby={question.helpText ? `${question.id}-help` : undefined}
            aria-invalid={!!error}
          />
        )

      case 'select':
        return (
          <Select
            value={currentValue as string}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className={error ? 'border-red-500 focus:border-red-500' : ''}>
              <SelectValue placeholder={question.options?.[0]?.text || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.slice(1).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'radio':
        return (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-start space-x-2 sm:space-x-3">
                <input
                  type="radio"
                  id={`${question.id}-${option.value}`}
                  name={question.id}
                  value={option.value}
                  checked={currentValue === option.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                />
                <Label htmlFor={`${question.id}-${option.value}`} className="text-sm font-normal cursor-pointer leading-relaxed">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'checkbox':
        const checkboxValues = (currentValue as string[]) || []
        return (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-start space-x-2 sm:space-x-3">
                <input
                  type="checkbox"
                  id={`${question.id}-${option.value}`}
                  checked={checkboxValues.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleValueChange([...checkboxValues, option.value])
                    } else {
                      handleValueChange(checkboxValues.filter(v => v !== option.value))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                />
                <Label htmlFor={`${question.id}-${option.value}`} className="text-sm font-normal cursor-pointer leading-relaxed">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  // Special handling for African countries selection
  const renderAfricanCountriesField = () => {
    if (question.id === 'africanInvestmentPreference' && currentValue === 'specific') {
      const selectedCountries = (state.answers['africanCountries'] as string[]) || []
      
      return (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 space-y-3"
        >
          <Label className="text-sm font-medium text-gray-700">
            Select specific countries:
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 sm:max-h-60 overflow-y-auto border rounded-lg p-2 sm:p-3">
            {africanCountries.map((country) => (
              <div key={country.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`country-${country.value}`}
                  checked={selectedCountries.includes(country.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateAnswer('africanCountries', [...selectedCountries, country.value])
                    } else {
                      updateAnswer('africanCountries', selectedCountries.filter(c => c !== country.value))
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor={`country-${country.value}`} className="text-xs cursor-pointer">
                  {country.text}
                </Label>
              </div>
            ))}
          </div>
          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedCountries.map((country) => {
                const countryName = africanCountries.find(c => c.value === country)?.text
                return (
                  <Badge key={country} variant="secondary" className="text-xs">
                    {countryName}
                    <button
                      type="button"
                      onClick={() => {
                        updateAnswer('africanCountries', selectedCountries.filter(c => c !== country))
                      }}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </motion.div>
      )
    }
    return null
  }

  // For specialized components, render them directly
  if (question.type === 'regulatory_disclosures') {
    return <RegulatoryDisclosures question={question} />
  }

  if (question.type === 'emergency_contact') {
    return <EmergencyContact question={question} />
  }

  if (question.id === 'agreements') {
    return <TermsAndAgreements question={question} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2 sm:space-y-3"
    >
      <div className="flex items-start gap-2">
        <Label htmlFor={question.id} className="text-sm sm:text-base font-medium text-gray-900 leading-relaxed">
          {question.title}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {question.helpText && (
          <div className="group relative flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-5 w-5 sm:h-6 sm:w-6 p-0">
              <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 sm:px-3 py-1 sm:py-2 bg-gray-900 text-white text-xs sm:text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
              {question.helpText}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {renderField()}
        {renderAfricanCountriesField()}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs sm:text-sm text-red-600 flex items-center gap-1"
        >
          <span className="text-red-500">⚠</span>
          {error}
        </motion.p>
      )}

      {question.helpText && (
        <p id={`${question.id}-help`} className="text-xs sm:text-sm text-gray-500 leading-relaxed">
          {question.helpText}
        </p>
      )}
    </motion.div>
  )
}
