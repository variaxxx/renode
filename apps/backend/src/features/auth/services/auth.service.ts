import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InvalidCredentialsError } from '../auth.errors'
import { OwnerRepository } from '../repositories/owner.repository'
import { SessionRepository } from '../repositories/session.repository'

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionGrant {
  token: string
  csrfToken: string
  expiresAt: Date
}

@Injectable()
export class AuthService {
  constructor(
    private readonly owners: OwnerRepository,
    private readonly sessions: SessionRepository,
  ) {}

  /** Verify the owner password and create a server-side session. */
  async signIn(password: string): Promise<SessionGrant> {
    const owner = await this.owners.findCredentials()
    if (!owner || !(await Bun.password.verify(password, owner.passwordHash))) {
      throw new InvalidCredentialsError()
    }

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
    await this.sessions.create(owner.id, this.hashToken(token), expiresAt)
    return { token, csrfToken: this.createCsrfToken(token), expiresAt }
  }

  /** Resolve a presented token to its live owner session. */
  async getOwnerId(token: string): Promise<string | null> {
    const session = await this.sessions.findActive(this.hashToken(token))
    return session?.ownerId ?? null
  }

  /** Revoke the presented session token. */
  async signOut(token: string): Promise<void> {
    await this.sessions.revoke(this.hashToken(token))
  }

  /** Derive a CSRF token that is bound to one session cookie. */
  createCsrfToken(token: string): string {
    return createHmac('sha256', token)
      .update('renode-csrf-v1')
      .digest('base64url')
  }

  /** Compare CSRF tokens without leaking matching prefix length. */
  verifyCsrfToken(token: string, submitted: string): boolean {
    const expected = Buffer.from(this.createCsrfToken(token))
    const actual = Buffer.from(submitted)
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    )
  }

  /** Hash a cookie token before database lookup or storage. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
