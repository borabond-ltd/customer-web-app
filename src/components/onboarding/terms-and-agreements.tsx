'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, FileText, Shield, Scale, Eye, CheckCircle, ChevronDown, Building2 } from 'lucide-react'
import { OnboardingQuestion } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

import { logger } from '@/lib/logger'
interface TermsAndAgreementsProps {
  question: OnboardingQuestion
}

// Agreement data with proper URLs and descriptions
const agreements = [
  {
    id: 'adv2a',
    name: 'ADV 2A',
    fullName: 'Form ADV Part 2A - Brochure',
    description: 'Our investment advisory brochure containing information about our services, fees, and business practices.',
    href: 'https://auth.borabond.com/storage/v1/object/public/compliance-documents/BoraBond%20Form%20ADV%202A.pdf',
    icon: FileText,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'crs',
    name: 'CRS',
    fullName: 'Client Relationship Summary',
    description: 'A summary of our relationship with you, including services, fees, conflicts of interest, and disciplinary information.',
    href: 'https://auth.borabond.com/storage/v1/object/public/compliance-documents/BoraBond%20CRS.pdf',
    icon: Shield,
    color: 'bg-green-50 text-green-700 border-green-200',
    iconColor: 'text-green-600'
  },
  {
    id: 'adv2b',
    name: 'ADV 2B',
    fullName: 'Form ADV Part 2B - Brochure Supplement',
    description: 'Information about our advisory personnel who provide investment advice to you.',
    href: 'https://auth.borabond.com/storage/v1/object/public/compliance-documents/BoraBond%20Form%20ADV%202B.pdf',
    icon: Scale,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    iconColor: 'text-purple-600'
  },
  {
    id: 'privacy',
    name: 'Privacy Policy',
    fullName: 'Privacy Notice',
    description: 'How we collect, use, and protect your personal information in accordance with applicable privacy laws.',
    href: 'https://auth.borabond.com/storage/v1/object/public/compliance-documents/BoraBond%20Privacy%20Policy.pdf',
    icon: Eye,
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600'
  },
  {
    id: 'terms',
    name: 'Advisory Agreement',
    fullName: 'Advisory Agreement',
    description: 'The terms and conditions governing our investment advisory relationship with you.',
    href: 'https://auth.borabond.com/storage/v1/object/public/compliance-documents/BoraBond%20Discretionary%20Advisory%20Agreement.pdf',
    icon: CheckCircle,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600'
  },
  {
    id: 'cybrid',
    name: 'Cybrid User Agreement',
    fullName: 'Cybrid User Agreement',
    description: 'Terms and conditions for using Cybrid\'s financial infrastructure services that power BoraBond\'s investment platform.',
    href: 'https://cybrid.xyz/hubfs/Legal/Cybrid_User_Agreement.pdf',
    icon: Building2,
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    iconColor: 'text-teal-600'
  }
]

export function TermsAndAgreements({ question }: TermsAndAgreementsProps) {
  const { state, updateAnswer } = useOnboarding()
  const currentValue = (state.answers[question.id] as string[]) || []
  const error = state.errors[question.id]

  const handleAgreementToggle = (agreementId: string) => {
    if (currentValue.includes(agreementId)) {
      updateAnswer(question.id, currentValue.filter(id => id !== agreementId))
    } else {
      updateAnswer(question.id, [...currentValue, agreementId])
    }
  }

  const handleOpenDocument = (href: string, name: string) => {
    // Track document opening for analytics
    logger.log(`Opening document: ${name}`)
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const allAgreementsAccepted = agreements.every(agreement => 
    currentValue.includes(agreement.id)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 sm:space-y-4"
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Label htmlFor={question.id} className="text-sm sm:text-base font-medium text-gray-900 leading-relaxed">
            {question.title}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
        
        {question.helpText && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-2 sm:p-3 shadow-sm">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-amber-600 text-xs sm:text-sm font-bold">!</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-amber-800 text-xs sm:text-sm">Custody & Legal Requirements</h4>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your funds are held in custody through <strong>Stanbic Bank</strong> (Standard Bank Group). 
                  You must review and accept all policies below before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Electronic Signature Notice - Compact */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-2 sm:p-3">
        <div className="flex items-start gap-2">
          <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-blue-900 mb-1">
              Electronic Signature
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Your IP address, browser details, and timestamp will be collected as part of your electronic signature for legal verification.
            </p>
          </div>
        </div>
      </div>

      {/* Compact Agreements List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Accordion type="multiple" className="w-full">
          {agreements.map((agreement, index) => {
            const IconComponent = agreement.icon
            const isAccepted = currentValue.includes(agreement.id)
            
            return (
              <AccordionItem key={agreement.id} value={agreement.id} className="border-b border-gray-100 last:border-b-0">
                <AccordionTrigger className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      id={`${question.id}-${agreement.id}`}
                      checked={isAccepted}
                      onChange={() => handleAgreementToggle(agreement.id)}
                      className="w-4 h-4 accent-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-1 flex-shrink-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Agreement Header */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <IconComponent className={`w-3 h-3 sm:w-4 sm:h-4 ${agreement.iconColor} flex-shrink-0`} />
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {agreement.name}
                      </span>
                      {isAccepted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 ml-auto hidden sm:flex">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accepted
                        </Badge>
                      )}
                    </div>

                    {/* View Document Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDocument(agreement.href, agreement.name)
                      }}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 h-6 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden xs:inline">View</span>
                    </Button>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-3 sm:px-4 pb-2 sm:pb-3">
                  <div className="pl-5 sm:pl-7 space-y-2">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {agreement.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDocument(agreement.href, agreement.name)}
                        className="flex items-center gap-1 text-xs h-7 px-3"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Document
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Compact Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">
              Progress:
            </span>
            <span className="text-xs text-gray-600">
              {currentValue.length} of {agreements.length} accepted
            </span>
          </div>
          <div>
            {allAgreementsAccepted ? (
              <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-600 text-xs px-2 py-1">
                Incomplete
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xs font-bold">!</span>
          </div>
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
