'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  OnboardingState, 
  OnboardingContextType, 
  OnboardingAnswers, 
  OnboardingQuestion,
  OnboardingData 
} from '@/types/onboarding'
import { apiClient } from '@/lib/api-client'

import { logger } from '@/lib/logger'
// Action types
type OnboardingAction =
  | { type: 'UPDATE_ANSWER'; payload: { questionId: string; value: string | string[] | boolean | object | null } }
  | { type: 'SET_CURRENT_SECTION'; payload: number }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_SUBMISSION_STEP'; payload: string }
  | { type: 'SET_ERRORS'; payload: { [questionId: string]: string } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'MARK_SECTION_COMPLETE'; payload: string }
  | { type: 'LOAD_ANSWERS'; payload: OnboardingAnswers }
  | { type: 'RESET_STATE' }

// Initial state
const initialState: OnboardingState = {
  currentSectionIndex: 0,
  answers: {},
  isSubmitting: false,
  submissionStep: '',
  errors: {},
  completedSections: new Set()
}

// Reducer
function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'UPDATE_ANSWER':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.value
        },
        errors: {
          ...state.errors,
          [action.payload.questionId]: '' // Clear error when answer is updated
        }
      }
    
    case 'SET_CURRENT_SECTION':
      return {
        ...state,
        currentSectionIndex: action.payload
      }
    
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload
      }
    
    case 'SET_SUBMISSION_STEP':
      return {
        ...state,
        submissionStep: action.payload
      }
    
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload
      }
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {}
      }
    
    case 'MARK_SECTION_COMPLETE':
      return {
        ...state,
        completedSections: new Set([...state.completedSections, action.payload])
      }
    
    case 'LOAD_ANSWERS':
      return {
        ...state,
        answers: action.payload
      }
    
    case 'RESET_STATE':
      return initialState
    
    default:
      return state
  }
}

// Context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

// Provider component
interface OnboardingProviderProps {
  children: React.ReactNode
  onboardingData: OnboardingData
}

export function OnboardingProvider({ children, onboardingData }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState)
  const router = useRouter()

  // Load saved answers from localStorage on mount
  useEffect(() => {
    const savedAnswers = localStorage.getItem('onboarding-answers')
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers)
        dispatch({ type: 'LOAD_ANSWERS', payload: parsedAnswers })
      } catch (error) {
        logger.error('Failed to parse saved onboarding answers:', error)
      }
    }
  }, [])

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(state.answers).length > 0) {
      localStorage.setItem('onboarding-answers', JSON.stringify(state.answers))
    }
  }, [state.answers])

  // Update answer
  const updateAnswer = useCallback((questionId: string, value: string | string[] | boolean | object | null) => {
    dispatch({ type: 'UPDATE_ANSWER', payload: { questionId, value } })
  }, [])

  // Navigation functions
  const nextSection = useCallback(() => {
    if (onboardingData?.sections && state.currentSectionIndex < onboardingData.sections.length - 1) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: state.currentSectionIndex + 1 })
    }
  }, [state.currentSectionIndex, onboardingData?.sections?.length])

  const previousSection = useCallback(() => {
    if (state.currentSectionIndex > 0) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: state.currentSectionIndex - 1 })
    }
  }, [state.currentSectionIndex])

  const goToSection = useCallback((sectionIndex: number) => {
    if (onboardingData?.sections && sectionIndex >= 0 && sectionIndex < onboardingData.sections.length) {
      dispatch({ type: 'SET_CURRENT_SECTION', payload: sectionIndex })
    }
  }, [onboardingData?.sections?.length])

  // Validation
  const validateCurrentSection = useCallback((): boolean => {
    if (!onboardingData?.sections || !onboardingData?.questions) {
      return false
    }
    
    const currentSection = onboardingData.sections[state.currentSectionIndex]
    if (!currentSection) {
      return false
    }
    
    const currentQuestions = onboardingData.questions.filter(
      q => q.section === currentSection.id
    )
    
    const errors: { [questionId: string]: string } = {}
    let isValid = true

    currentQuestions.forEach(question => {
      if (question.required) {
        const answer = state.answers[question.id]
        
        // Special validation for emergency contact
        if (question.id === 'emergencyContact') {
          if (!answer) {
            errors[question.id] = 'Please select whether you want to add an emergency contact'
            isValid = false
          } else if (answer === 'yes') {
            // Validate emergency contact details
            const contactDetails = state.answers['emergencyContactDetails'] as any
            if (!contactDetails || !contactDetails.fullName || !contactDetails.email || 
                !contactDetails.phone || !contactDetails.relationship) {
              errors[question.id] = 'Please complete all emergency contact details'
              isValid = false
            }
          } else if (answer === 'no') {
            // Validate opt-out acknowledgment
            const optOutAcknowledged = state.answers['emergencyContactOptOut']
            if (!optOutAcknowledged || (typeof optOutAcknowledged === 'boolean' && !optOutAcknowledged)) {
              errors[question.id] = 'Please acknowledge the emergency contact opt-out statement'
              isValid = false
            }
          }
        } else if (question.id === 'regulatoryDisclosures') {
          // Special validation for regulatory disclosures
          if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            errors[question.id] = 'Please select at least one option'
            isValid = false
          } else if (Array.isArray(answer) && answer.includes('brokerageAffiliation')) {
            // Validate FINRA affiliation details
            const finraMember = state.answers['finraMember']
            const supervisorEmail = state.answers['supervisorEmail']
            const supervisorPhone = state.answers['supervisorPhone']
            
            if (!finraMember || (typeof finraMember === 'string' && finraMember.trim() === '')) {
              errors['finraMember'] = 'FINRA member firm name is required'
              isValid = false
            }
            if (!supervisorEmail || (typeof supervisorEmail === 'string' && supervisorEmail.trim() === '')) {
              errors['supervisorEmail'] = 'Supervisor email address is required'
              isValid = false
            } else if (typeof supervisorEmail === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supervisorEmail)) {
              errors['supervisorEmail'] = 'Please enter a valid email address'
              isValid = false
            }
            if (!supervisorPhone || (typeof supervisorPhone === 'string' && supervisorPhone.trim() === '')) {
              errors['supervisorPhone'] = 'Supervisor phone number is required'
              isValid = false
            }
          }
        } else {
          // Standard validation for other questions
          if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            errors[question.id] = `${question.title} is required`
            isValid = false
          }
        }
      }
    })

    dispatch({ type: 'SET_ERRORS', payload: errors })
    return isValid
  }, [state.currentSectionIndex, state.answers, onboardingData])

  // Get current section questions
  const getCurrentSectionQuestions = useCallback((): OnboardingQuestion[] => {
    if (!onboardingData?.sections || !onboardingData?.questions) {
      return []
    }
    
    const currentSection = onboardingData.sections[state.currentSectionIndex]
    if (!currentSection) {
      return []
    }
    
    return onboardingData.questions.filter(q => q.section === currentSection.id)
  }, [state.currentSectionIndex, onboardingData])

  // Check if question is answered
  const isQuestionAnswered = useCallback((questionId: string): boolean => {
    const answer = state.answers[questionId]
    return answer !== undefined && answer !== null && answer !== '' && 
           !(Array.isArray(answer) && answer.length === 0)
  }, [state.answers])

  // Check if section is complete
  const isSectionComplete = useCallback((sectionId: string): boolean => {
    const sectionQuestions = onboardingData.questions.filter(q => q.section === sectionId)
    return sectionQuestions.every(q => !q.required || isQuestionAnswered(q.id))
  }, [onboardingData.questions, isQuestionAnswered])

  // Get progress percentage
  const getProgressPercentage = useCallback((): number => {
    const totalRequiredQuestions = onboardingData.questions.filter(q => q.required).length
    const answeredRequiredQuestions = onboardingData.questions.filter(
      q => q.required && isQuestionAnswered(q.id)
    ).length
    
    return totalRequiredQuestions > 0 ? (answeredRequiredQuestions / totalRequiredQuestions) * 100 : 0
  }, [onboardingData.questions, isQuestionAnswered])

  // Transform answers data to match backend expectations
  const transformAnswersForBackend = useCallback((answers: OnboardingAnswers) => {
    const transformed = { ...answers }
    
    // Transform emergency contact data if it exists
    if (answers.emergencyContactDetails && typeof answers.emergencyContactDetails === 'object') {
      const ecDetails = answers.emergencyContactDetails as any
      transformed.emergencyContactDetails = {
        ecName: ecDetails.fullName || '',
        ecEmail: ecDetails.email || '',
        ecPhone: ecDetails.fullPhoneNumber || ecDetails.phone || '',
        ecRelationship: ecDetails.relationship || ''
      }
    }
    
    return transformed
  }, [])

  // Create external API payload
  const createExternalPayload = useCallback((answers: OnboardingAnswers, user: any) => {
    // Get user profile data for additional fields
    const userProfile = {
      userId: user.id,
      email: user.email,
      phone: user.phone || '',
      displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    }

    // Handle emergency contact details
    const emergencyContactDetails = answers.emergencyContact === 'yes' && answers.emergencyContactDetails
      ? answers.emergencyContactDetails as any
      : null

    // Handle specific African countries
    const specificCountries = answers.africanInvestmentPreference === 'specific' && answers.specificAfricanCountries
      ? (Array.isArray(answers.specificAfricanCountries) ? answers.specificAfricanCountries : [])
      : []

    // Handle disclosures
    const disclosures = answers.regulatoryDisclosures && Array.isArray(answers.regulatoryDisclosures)
      ? answers.regulatoryDisclosures.filter(d => d !== 'noneApply')
      : []

    // Handle agreements
    const agreements = answers.agreements && Array.isArray(answers.agreements)
      ? answers.agreements.join(', ')
      : ''

    return {
      data: {
        userData: userProfile,
        user_email: user.email,
        user_id: user.id,
        phone: user.phone || '',
        dob: user.user_metadata?.dob || '',
        gender: user.user_metadata?.gender || '',
        maritalStatus: user.user_metadata?.marital_status || '',
        citizenship: user.user_metadata?.citizenship || [],
        usTaxResidenceStatus: user.user_metadata?.us_tax_residence_status || '',
        fullAddress: user.user_metadata?.address || '',
        address: user.user_metadata?.street_address || '',
        city: user.user_metadata?.city || '',
        state: user.user_metadata?.state || '',
        zip: user.user_metadata?.zip_code || '',
        country: user.user_metadata?.country || 'United States',
        emergencyContactDetails: emergencyContactDetails ? {
          ecName: emergencyContactDetails.fullName || '',
          ecEmail: emergencyContactDetails.email || '',
          ecPhone: emergencyContactDetails.fullPhoneNumber || emergencyContactDetails.phone || '',
          ecRelationship: emergencyContactDetails.relationship || ''
        } : null,
        empStatus: answers.employmentStatus || '',
        employment: answers.employmentStatus || '',
        occupation: user.user_metadata?.occupation || '',
        employer: user.user_metadata?.employer || '',
        annualIncome: answers.annualIncome || '',
        NetWorth: answers.netWorth || '',
        investmentStyle: answers.investmentStyle || '',
        investmentObjective: answers.investmentObjective || '',
        investmentTimeframe: answers.investmentTimeframe || '',
        africanInvestmentPreference: answers.africanInvestmentPreference || '',
        specificAfricanCountries: specificCountries,
        disclosures: disclosures,
        agreements: agreements,
        metadata: {
          formVersion: '1.0',
          submittedAt: new Date().toISOString(),
          source: 'borabond_onboarding',
          browser: navigator.userAgent
        }
      },
      fileId: `complete-${user.id}-${Date.now()}`,
      generatePdf: true
    }
  }, [])

  // Submit onboarding
  const submitOnboarding = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', payload: true })
    dispatch({ type: 'CLEAR_ERRORS' })

    try {
      // Step 1: Validate all required questions
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Validating responses...' })
      
      const allRequiredQuestions = onboardingData.questions.filter(q => q.required)
      const errors: { [questionId: string]: string } = {}
      let isValid = true

      allRequiredQuestions.forEach(question => {
        const answer = state.answers[question.id]
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          errors[question.id] = `${question.title} is required`
          isValid = false
        }
      })

      if (!isValid) {
        dispatch({ type: 'SET_ERRORS', payload: errors })
        toast.error('Please complete all required fields')
        return
      }

      // Step 2: Get current user information
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Authenticating user...' })
      
      // Debug token status before making API call
      logger.log('🔍 Debugging token status before getCurrentUser call:')
      const tokenStatus = apiClient.debugTokenStatus()
      
      // Check if we have a token before making the API call
      if (!tokenStatus.getTokenResult) {
        logger.error('❌ No token found, redirecting to login')
        toast.error('Please log in to continue with onboarding.')
        router.push('/auth/signin')
        return
      }
      
      // Get user from API client (this should be handled by the API client's auth system)
      const userResponse = await apiClient.getCurrentUser()
      if (!userResponse.success || !userResponse.data) {
        throw new Error('User not authenticated. Please log in and try again.')
      }

      const user = userResponse.data as any

      // Step 3: Create external payload for external submission
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Preparing data...' })
      
      const externalPayload = createExternalPayload(state.answers, user)

      // Step 4: Call all onboarding endpoints in sequence
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Saving your responses...' })
      
      // Transform answers data to match backend expectations
      const transformedAnswers = transformAnswersForBackend(state.answers)
      
      // Step 4a: Submit onboarding data
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Submitting onboarding data...' })
      const submitResponse = await apiClient.submitOnboardingExternal({
        data: externalPayload.data,
        fileId: externalPayload.fileId,
        generatePdf: externalPayload.generatePdf
      })

      if (!submitResponse.success) {
        logger.warn('Submit onboarding failed:', submitResponse.message)
        // Don't fail the entire process if submit fails
      }

      // Step 4b: Save onboarding details
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Saving onboarding details...' })
      const saveResponse = await apiClient.saveOnboardingDetails({
        answers: transformedAnswers
      })

      if (!saveResponse.success) {
        logger.warn('Save onboarding details failed:', saveResponse.message)
        // Don't fail the entire process if save fails
      }

      // Step 4c: Mark onboarding as completed
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Marking onboarding as completed...' })
      const completeResponse = await apiClient.markOnboardingCompleted()

      if (!completeResponse.success) {
        logger.warn('Mark onboarding completed failed:', completeResponse.message)
        // Don't fail the entire process if mark complete fails
      }

      // Step 4d: Complete onboarding flow (includes external submission)
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Completing onboarding flow...' })
      const completeFlowResponse = await apiClient.completeOnboardingFlow({
        answers: transformedAnswers,
        userData: externalPayload.data
      })

      if (!completeFlowResponse.success) {
        throw new Error(completeFlowResponse.message || 'Failed to complete onboarding flow')
      }

      // Step 5: Finalize (Advisory agreement is automatically signed by backend)
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: 'Finalizing setup...' })

      // Clear saved answers
      localStorage.removeItem('onboarding-answers')
      
      // Reset state
      dispatch({ type: 'RESET_STATE' })
      
      toast.success('Onboarding completed successfully! Welcome to BoraBond!')
      
      // Redirect to dashboard - the onboarding guard will now allow access
      router.push('/dashboard')

    } catch (error: any) {
      logger.error('Onboarding submission error:', error)
      
      // Handle different types of errors
      if (error.message?.includes('not authenticated')) {
        toast.error('Please log in to continue with onboarding.')
        router.push('/login')
      } else if (error.message?.includes('Validation failed')) {
        toast.error('Please complete all required fields before submitting.')
      } else if (error.message?.includes('Database error')) {
        toast.error('Unable to save your information. Please try again.')
      } else if (error.message?.includes('Access denied')) {
        toast.error('You do not have permission to perform this action.')
      } else {
        toast.error(error.message || 'Failed to submit onboarding. Please try again.')
      }
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
      dispatch({ type: 'SET_SUBMISSION_STEP', payload: '' })
    }
  }, [state.answers, onboardingData, router, createExternalPayload])

  const contextValue: OnboardingContextType = {
    state,
    updateAnswer,
    nextSection,
    previousSection,
    goToSection,
    submitOnboarding,
    validateCurrentSection,
    getProgressPercentage,
    getCurrentSectionQuestions,
    isQuestionAnswered,
    isSectionComplete
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  )
}

// Hook to use onboarding context
export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
