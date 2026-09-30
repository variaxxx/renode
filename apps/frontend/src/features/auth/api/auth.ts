import { ApiError, apiRequest, setCsrfToken } from '@/shared/api/client'

export type Session = { authenticated: true; csrfToken: string }

type LoginResult = { csrfToken: string; expiresAt: string }

/** Restore the current owner session after a page load. */
export async function getSession(): Promise<Session | null> {
  try {
    const session = await apiRequest<Session>('/auth/session', {}, true)
    setCsrfToken(session.csrfToken)
    return session
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setCsrfToken(null)
      return null
    }
    throw error
  }
}

/** Exchange the owner password for a cookie session. */
export async function login(password: string): Promise<void> {
  const result = await apiRequest<LoginResult>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ password }) },
    true,
  )
  setCsrfToken(result.csrfToken)
}

/** Revoke the active session and forget its CSRF token. */
export async function logout(): Promise<void> {
  await apiRequest<{ ok: true }>('/auth/logout', { method: 'POST' })
  setCsrfToken(null)
}
