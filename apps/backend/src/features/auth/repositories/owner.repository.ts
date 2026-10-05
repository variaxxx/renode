import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infra/prisma/prisma.service'

const OWNER_ID = '00000000-0000-4000-8000-000000000001'

@Injectable()
export class OwnerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Check whether the single owner has already been configured. */
  async exists(): Promise<boolean> {
    return (await this.prisma.owner.count()) > 0
  }

  /** Persist the owner under a fixed ID to prevent concurrent setup. */
  async create(passwordHash: string): Promise<void> {
    await this.prisma.owner.create({ data: { id: OWNER_ID, passwordHash } })
  }

  /** Load the single owner's credentials for password verification. */
  async findCredentials(): Promise<{
    id: string
    passwordHash: string
  } | null> {
    return this.prisma.owner.findFirst({
      select: { id: true, passwordHash: true },
    })
  }
}
