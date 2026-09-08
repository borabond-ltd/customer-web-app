// Google Identity Services is the only web Google path.
// Email/password + phone OTP still go through identity-service.

export type AuthProvider = 'google'

export function getAuthProvider(): AuthProvider {
  return 'google'
}

export function isGoogleAuthProvider(): boolean {
  return true
}

export function isSupabaseAuthProvider(): boolean {
  return false
}

export function getGoogleClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
}
