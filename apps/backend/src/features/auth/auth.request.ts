import type { Request } from 'express'
import { UnauthenticatedError } from './auth.errors'

export interface AuthenticatedRequest extends Request {
  auth?: { ownerId: string; token: string }
}

/** Read the session resolved by the authentication guard. */
export function requireAuth(request: AuthenticatedRequest): {
  ownerId: string
  token: string
} {
  if (!request.auth) throw new UnauthenticatedError()
  return request.auth
}
