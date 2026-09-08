'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { OnboardingData } from '@/types/onboarding'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProgressIndicator } from './progress-indicator'
import { QuestionField } from './question-field'
import { ErrorDisplay } from '@/components/ui/error-display'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface OnboardingWizardProps {
  onboardingData: OnboardingData
}

export function OnboardingWizard({ onboardingData }: OnboardingWizardProps) {
  const {
    state,
    nextSection,
    previousSection,
    submitOnboarding,
    validateCurrentSection,
    getCurrentSectionQuestions,
    getProgressPercentage
  } = useOnboarding()

  const currentSection = onboardingData.sections[state.currentSectionIndex]
  const currentQuestions = getCurrentSectionQuestions()
  const isLastSection = state.currentSectionIndex === onboardingData.sections.length - 1
  const progressPercentage = getProgressPercentage()

  const handleNext = () => {
    if (validateCurrentSection()) {
      if (isLastSection) {
        handleSubmit()
      } else {
        nextSection()
      }
    } else {
      toast.error('Please complete all required fields before continuing')
    }
  }

  const handleSubmit = async () => {
    try {
      await submitOnboarding()
    } catch (error) {
      logger.error('Submission error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4 max-w-4xl w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-1 sm:mb-2"
        >
          <h1 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            Welcome to Borabond
          </h1>
          <p className="text-xs text-gray-600 px-2">
            Let's set up your investment profile
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-1"
        >
          <ProgressIndicator sections={onboardingData.sections} />
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col"
        >
          <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm flex-1 flex flex-col">
            <CardHeader className="pb-1 px-3 sm:px-6 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {state.currentSectionIndex + 1}. {currentSection?.name}
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-gray-500">
                    {Math.round(progressPercentage)}% complete
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-3 sm:px-6 flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={state.currentSectionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 pb-4"
                  >
                    {currentQuestions.map((question) => (
                      <QuestionField
                        key={question.id}
                        question={question}
                        africanCountries={onboardingData.africanCountries}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fixed Navigation - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-shrink-0 mt-4"
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {state.currentSectionIndex > 0 && (
                    <Button
                      variant="outline"
                      onClick={previousSection}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleNext}
                    disabled={state.isSubmitting}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    {state.isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {state.submissionStep || (isLastSection ? 'Submitting...' : 'Processing...')}
                      </>
                    ) : (
                      <>
                        {isLastSection ? (
                          <>
                            <Check className="w-4 h-4" />
                            Complete Setup
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-3 px-3 flex-shrink-0"
        >
          <p className="text-xs text-gray-500">
            Your information is secure and will be used to personalize your investment experience.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
