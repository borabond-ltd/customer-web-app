// Google Identity Services (GIS) helpers for sandbox direct Google OAuth.
// Loads the GIS script and renders a sign-in button that returns a Google ID token.

import { getGoogleClientId } from '@/lib/auth-provider'

const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

type GoogleCredentialResponse = {
  credential?: string
}

type GoogleIdConfig = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

type GoogleButtonConfig = {
  type?: string
  theme?: string
  size?: string
  text?: string
  width?: number | string
  logo_alignment?: string
  shape?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void
          renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void
          cancel: () => void
        }
      }
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services can only load in the browser'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_URL}"]`)
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')))
        return
      }

      const script = document.createElement('script')
      script.src = GOOGLE_GSI_SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  return scriptLoadPromise
}

/**
 * Render a Google sign-in button into the given container.
 * The callback receives the Google ID token (JWT) on successful sign-in.
 */
export async function renderGoogleSignInButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void,
  options?: { width?: number }
): Promise<void> {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
  }

  await loadGoogleIdentityServices()

  if (!window.google?.accounts?.id) {
    throw new Error('Google Identity Services failed to initialize')
  }

  container.innerHTML = ''

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response.credential) {
        onCredential(response.credential)
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  })

  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    width: options?.width,
    shape: 'pill',
  })
}

export function cancelGoogleSignIn(): void {
  window.google?.accounts?.id?.cancel()
}
