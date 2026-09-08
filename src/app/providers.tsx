'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/auth-context'
import { PersonaProvider } from '@/contexts/persona-context'
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard'
import { VerificationStatusManager } from '@/components/verification-status-manager'
import { QuickstartTooltip } from '@/components/quickstart-tooltip'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PersonaProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <VerificationStatusManager />
          <OnboardingGuard>
            {children}
          </OnboardingGuard>
          <Toaster 
            position="bottom-right"
            expand={true}
            richColors={true}
            closeButton={true}
          />
          <QuickstartTooltip />
        </ThemeProvider>
      </PersonaProvider>
    </AuthProvider>
  )
}
