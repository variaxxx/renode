import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getSession, login, logout } from '@/features/auth/api/auth'
import { AuthContext, type AuthState } from '@/features/auth/AuthContext'
import { setUnauthorizedHandler } from '@/shared/api/client'

/** Own the session state for all routes. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('checking')
  const [error, setError] = useState('')

  /** Restore the server session and keep failures retryable. */
  const restore = useCallback(async () => {
    setState('checking')
    setError('')
    try {
      setState((await getSession()) ? 'authenticated' : 'unauthenticated')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось проверить сессию.',
      )
      setState('error')
    }
  }, [])

  useEffect(() => {
    void restore()
  }, [restore])

  useEffect(() => {
    setUnauthorizedHandler(() => setState('unauthenticated'))
    return () => setUnauthorizedHandler(null)
  }, [])

  /** Start a session after successful password verification. */
  async function signIn(password: string) {
    await login(password)
    setState('authenticated')
  }

  /** End the server session before removing protected content. */
  async function signOut() {
    await logout()
    setState('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ state, error, restore, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
