/**
 * Gateway origin for server-side Next.js routes (no /api suffix).
 * Client uses NEXT_PUBLIC_API_URL (with `/api/v1`) via api-client.ts.
 */
export function getBackendOrigin(): string {
  const explicit = String(process.env.BACKEND_URL || '').trim()
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const apiUrl = String(process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (apiUrl) {
    return apiUrl
      .replace(/\/api\/v1\/?$/i, '')
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '')
  }

  return 'http://localhost:9000'
}
