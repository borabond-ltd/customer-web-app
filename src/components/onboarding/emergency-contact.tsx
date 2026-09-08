'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mail, User, Heart, AlertTriangle, CheckCircle, Shield } from 'lucide-react'
import { OnboardingQuestion } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { PhoneInput } from '@/components/ui/phone-input'

interface EmergencyContactProps {
  question: OnboardingQuestion
}

interface EmergencyContactData {
  fullName: string
  email: string
  phone: string
  phoneCountryCode: string
  fullPhoneNumber: string
  relationship: string
}

const relationshipOptions = [
  { value: 'spouse', text: 'Spouse' },
  { value: 'parent', text: 'Parent' },
  { value: 'child', text: 'Child' },
  { value: 'sibling', text: 'Sibling' },
  { value: 'friend', text: 'Friend' },
  { value: 'colleague', text: 'Colleague' },
  { value: 'other', text: 'Other' }
]

export function EmergencyContact({ question }: EmergencyContactProps) {
  const { state, updateAnswer } = useOnboarding()
  const currentValue = state.answers[question.id] as string
  const error = state.errors[question.id]
  
  const [contactData, setContactData] = useState<EmergencyContactData>({
    fullName: '',
    email: '',
    phone: '',
    phoneCountryCode: '',
    fullPhoneNumber: '',
    relationship: ''
  })
  
  const [optOutAcknowledged, setOptOutAcknowledged] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  // Load existing data if available
  useEffect(() => {
    const existingData = state.answers['emergencyContactDetails']
    const existingOptOut = state.answers['emergencyContactOptOut']
    
    if (existingData && typeof existingData === 'object' && !Array.isArray(existingData)) {
      setContactData(existingData as EmergencyContactData)
    }
    if (typeof existingOptOut === 'boolean' && existingOptOut) {
      setOptOutAcknowledged(existingOptOut)
    }
  }, [state.answers])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string, fullNumber: string): boolean => {
    // Basic validation - at least 7 digits
    const cleaned = phone.replace(/[^\d]/g, '')
    return cleaned.length >= 7 && fullNumber.length > 0
  }

  const validateContactForm = useCallback((): boolean => {
    const errors: { [key: string]: string } = {}
    
    if (!contactData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    }
    
    if (!contactData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(contactData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!contactData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!validatePhone(contactData.phone, contactData.fullPhoneNumber)) {
      errors.phone = 'Please enter a valid phone number'
    }
    
    if (!contactData.relationship) {
      errors.relationship = 'Relationship is required'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [contactData])

  const handleRadioChange = (value: string) => {
    updateAnswer(question.id, value)
    
    // Clear related data when switching options
    if (value === 'no') {
      updateAnswer('emergencyContactDetails', null)
      setContactData({ fullName: '', email: '', phone: '', phoneCountryCode: '', fullPhoneNumber: '', relationship: '' })
      setFieldErrors({})
    } else {
      updateAnswer('emergencyContactOptOut', false)
      setOptOutAcknowledged(false)
    }
  }

  const handleContactDataChange = (field: keyof EmergencyContactData, value: string) => {
    const newData = { ...contactData, [field]: value }
    setContactData(newData)
    updateAnswer('emergencyContactDetails', newData)
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handlePhoneChange = (phoneNumber: string, countryCode: string, fullNumber: string) => {
    const newData = { 
      ...contactData, 
      phone: phoneNumber,
      phoneCountryCode: countryCode,
      fullPhoneNumber: fullNumber
    }
    setContactData(newData)
    updateAnswer('emergencyContactDetails', newData)
    
    // Clear field error when user starts typing
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }))
    }
  }

  const handleOptOutChange = (checked: boolean) => {
    setOptOutAcknowledged(checked)
    updateAnswer('emergencyContactOptOut', checked)
  }

  // Auto-validate when user stops typing
  useEffect(() => {
    if (currentValue === 'yes' && contactData.fullName && contactData.email && contactData.phone && contactData.relationship) {
      validateContactForm()
    }
  }, [contactData, currentValue, validateContactForm])

  const isFormValid = currentValue === 'yes' ? 
    contactData.fullName && contactData.email && contactData.phone && contactData.relationship && Object.keys(fieldErrors).length === 0 :
    currentValue === 'no' ? optOutAcknowledged : false

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 shadow-lg">
        <CardHeader className="pb-1 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Heart className="h-4 w-4 text-red-500" />
            {question.title}
            <span className="text-red-500">*</span>
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {question.helpText}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {/* Main Yes/No Question */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">
              Would you like to add an emergency contact?
            </Label>
            
            <RadioGroup
              value={currentValue}
              onValueChange={handleRadioChange}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                <RadioGroupItem value="yes" id="emergency-yes" className="text-blue-600" />
                <Label htmlFor="emergency-yes" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                  Yes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-200">
                <RadioGroupItem value="no" id="emergency-no" className="text-blue-600" />
                <Label htmlFor="emergency-no" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Content */}
          <AnimatePresence mode="wait">
            {currentValue === 'yes' && (
              <motion.div
                key="contact-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Emergency Contact Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="emergency-fullName" className="text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="emergency-fullName"
                        type="text"
                        value={contactData.fullName}
                        onChange={(e) => handleContactDataChange('fullName', e.target.value)}
                        placeholder="Enter full name"
                        className={fieldErrors.fullName ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {fieldErrors.fullName && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="emergency-email" className="text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="emergency-email"
                          type="email"
                          value={contactData.email}
                          onChange={(e) => handleContactDataChange('email', e.target.value)}
                          placeholder="Enter email address"
                          className={`pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <PhoneInput
                        id="emergency-phone"
                        label="Phone Number"
                        value={contactData.fullPhoneNumber}
                        onChange={handlePhoneChange}
                        placeholder="Enter phone number"
                        error={fieldErrors.phone}
                        required={true}
                      />
                    </div>

                    {/* Relationship */}
                    <div className="space-y-2">
                      <Label htmlFor="emergency-relationship" className="text-sm font-medium text-gray-700">
                        Relationship <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={contactData.relationship}
                        onValueChange={(value) => handleContactDataChange('relationship', value)}
                      >
                        <SelectTrigger className={fieldErrors.relationship ? 'border-red-500 focus:border-red-500' : ''}>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {relationshipOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.relationship && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {fieldErrors.relationship}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentValue === 'no' && (
              <motion.div
                key="opt-out"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="border-t border-gray-200 pt-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold text-amber-800">
                          Emergency Contact Opt-Out Statement
                        </h3>
                        <div className="text-sm text-amber-700 space-y-2">
                          <p>
                            I understand that providing an emergency contact is recommended for safety and communication purposes. However, I choose not to provide an emergency contact at this time.
                          </p>
                          <p>
                            I acknowledge that by opting out, the organization may be limited in its ability to notify someone on my behalf in case of an emergency situation. I take full responsibility for this decision.
                          </p>
                        </div>
                        
                        <div className="flex items-start space-x-3 pt-2">
                          <Checkbox
                            id="emergency-opt-out-acknowledge"
                            checked={optOutAcknowledged}
                            onCheckedChange={handleOptOutChange}
                            className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 mt-1"
                          />
                          <Label htmlFor="emergency-opt-out-acknowledge" className="text-sm font-medium text-amber-800 cursor-pointer">
                            I acknowledge and agree to the above statement
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Error Display */}
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

      {/* Success Indicator */}
      {isFormValid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">
            {currentValue === 'yes' 
              ? 'Emergency contact information is complete and valid.'
              : 'Emergency contact opt-out has been acknowledged.'
            }
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
