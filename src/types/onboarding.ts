export interface OnboardingOption {
  value: string;
  text: string;
}

export interface OnboardingQuestion {
  id: string;
  title: string;
  type: 'radio' | 'select' | 'text' | 'email' | 'tel' | 'checkbox' | string;
  options?: OnboardingOption[];
  required: boolean;
  helpText: string;
  section: string;
}

export interface OnboardingSection {
  id: string;
  name: string;
  description: string;
}

export interface OnboardingData {
  questions: OnboardingQuestion[];
  sections: OnboardingSection[];
  africanCountries: OnboardingOption[];
  totalQuestions: number;
  totalSections: number;
}

export interface OnboardingResponse {
  success: boolean;
  data: OnboardingData;
}

export interface OnboardingAnswers {
  [questionId: string]: string | string[] | boolean | object | null;
}

export interface OnboardingState {
  currentSectionIndex: number;
  answers: OnboardingAnswers;
  isSubmitting: boolean;
  submissionStep: string;
  errors: { [questionId: string]: string };
  completedSections: Set<string>;
}

export interface OnboardingContextType {
  state: OnboardingState;
  updateAnswer: (questionId: string, value: string | string[] | boolean | object | null) => void;
  nextSection: () => void;
  previousSection: () => void;
  goToSection: (sectionIndex: number) => void;
  submitOnboarding: () => Promise<void>;
  validateCurrentSection: () => boolean;
  getProgressPercentage: () => number;
  getCurrentSectionQuestions: () => OnboardingQuestion[];
  isQuestionAnswered: (questionId: string) => boolean;
  isSectionComplete: (sectionId: string) => boolean;
}
