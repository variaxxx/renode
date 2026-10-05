import { createContext, useContext } from 'react'

export type AuthState =
  'checking' | 'authenticated' | 'unauthenticated' | 'error'

export type AuthContextValue = {
  state: AuthState
  error: string
  restore: () => Promise<void>
  signIn: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Read the owner session shared by auth pages and route guards. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
