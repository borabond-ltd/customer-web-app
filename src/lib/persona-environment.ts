/**
 * Persona Embedded inquiries are tied to sandbox vs production.
 * Must match the environment compliance-service uses for Persona.
 * Mismatch shows errors such as "Session expired" even for a newly created inquiry.
 *
 * Set NEXT_PUBLIC_PERSONA_ENVIRONMENT=sandbox or production to override.
 */
export function getPersonaSdkEnvironment(): 'sandbox' | 'production' {
  const raw = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT?.toLowerCase()
  if (raw === 'sandbox' || raw === 'production') {
    return raw
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
}
