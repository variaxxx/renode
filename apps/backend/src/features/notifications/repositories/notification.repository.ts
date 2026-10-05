import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type { NotificationSettings } from '../notification.types'

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Read the owner's saved notification destination and schedule. */
  async find(ownerId: string): Promise<NotificationSettings | null> {
    return this.prisma.notificationSettings.findUnique({ where: { ownerId } })
  }

  /** Persist settings atomically for the authenticated owner. */
  async save(
    ownerId: string,
    settings: NotificationSettings,
  ): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({
      where: { ownerId },
      create: { ownerId, ...settings },
      update: settings,
    })
  }
}
