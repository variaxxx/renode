import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infra/prisma/prisma.service'

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Store only a hash of the bearer token. */
  async create(
    ownerId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.session.create({
      data: { ownerId, tokenHash, expiresAt },
    })
  }

  /** Find a live, non-revoked session. */
  async findActive(tokenHash: string): Promise<{ ownerId: string } | null> {
    return this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { ownerId: true },
    })
  }

  /** Revoke a session without exposing whether it existed. */
  async revoke(tokenHash: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
