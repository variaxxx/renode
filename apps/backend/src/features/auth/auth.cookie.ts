import type { CookieOptions, Request } from 'express'

export const SESSION_COOKIE_NAME = '__Host-renode_session'
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
}

/** Read the session cookie without trusting its runtime shape. */
export function readSessionToken(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined
  const token = cookies?.[SESSION_COOKIE_NAME]
  return typeof token === 'string' && token.length > 0 ? token : null
}
