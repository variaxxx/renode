import { Prisma } from '../../../generated/prisma/client'
import { reminderEvents, reminderMoment } from './reminder-schedule.sql'
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

  /** Save worker liveness independently of whether messages were due. */
  async heartbeat(error: string | null) {
    const now = new Date()
    return this.prisma.workerHeartbeat.upsert({
      where: { id: 'reminders' },
      create: {
        id: 'reminders',
        lastCycleAt: now,
        lastSuccessAt: error ? null : now,
        lastError: error,
      },
      update: {
        lastCycleAt: now,
        ...(!error ? { lastSuccessAt: now } : {}),
        lastError: error,
      },
    })
  }

  /** Read recent deliveries and the last completed worker cycle. */
  async status() {
    const [heartbeat, deliveries, counts, upcoming, settings] =
      await Promise.all([
        this.prisma.workerHeartbeat.findUnique({ where: { id: 'reminders' } }),
        this.prisma.notificationDelivery.findMany({
          take: 50,
          orderBy: { updatedAt: 'desc' },
          include: { server: { select: { name: true } } },
        }),
        this.prisma.$queryRaw<{ status: string; count: number }[]>`
        SELECT d.status, count(*)::int AS count FROM notification_delivery d
        JOIN server s ON s.id=d.server_id CROSS JOIN notification_settings n
        ${reminderEvents}
        WHERE d.event_type=e.event_type AND (
          d.status IN ('SENT','FAILED') OR (s.status='ACTIVE' AND n.chat_id IS NOT NULL AND d.event_date=e.event_date AND d."interval"=ANY(e.intervals))
        ) GROUP BY d.status
      `,
        this.prisma.$queryRaw<
          {
            serverId: string
            serverName: string
            eventType: string
            eventDate: Date
            interval: number
            scheduledAt: Date
          }[]
        >`
        SELECT s.id AS "serverId",s.name AS "serverName",e.event_type AS "eventType",e.event_date AS "eventDate", offsets.days AS interval,
          ${reminderMoment(Prisma.sql`e.event_date`, Prisma.sql`offsets.days`, Prisma.sql`n.timezone`)} AS "scheduledAt"
        FROM server s CROSS JOIN notification_settings n ${reminderEvents}
        CROSS JOIN LATERAL unnest(e.intervals) AS offsets(days)
        WHERE s.status='ACTIVE' AND n.chat_id IS NOT NULL AND e.event_date IS NOT NULL
          AND ${reminderMoment(Prisma.sql`e.event_date`, Prisma.sql`offsets.days`, Prisma.sql`n.timezone`)} > NOW()
          AND NOT EXISTS (SELECT 1 FROM notification_delivery d WHERE d.server_id=s.id AND d.event_type=e.event_type AND d.event_date=e.event_date AND d."interval"=offsets.days AND d.status='SENT')
        ORDER BY "scheduledAt",s.id LIMIT 20
      `,
        this.prisma.notificationSettings.findFirst({
          select: { timezone: true },
        }),
      ])
    return {
      timezone: settings?.timezone ?? 'Europe/Moscow',
      heartbeat,
      workerAlive:
        !!heartbeat && Date.now() - heartbeat.lastCycleAt.getTime() < 180000,
      counts,
      upcoming: upcoming.map((e) => ({
        ...e,
        eventDate: e.eventDate.toISOString().slice(0, 10),
      })),
      deliveries: deliveries.map((d) => ({
        id: d.id,
        serverId: d.serverId,
        serverName: d.server.name,
        eventType: d.eventType,
        eventDate: d.eventDate.toISOString().slice(0, 10),
        status: d.status,
        attempts: d.attempts,
        nextAttemptAt: d.nextAttemptAt,
        sentAt: d.sentAt,
        lastError: d.lastError,
      })),
      lastSentAt:
        (
          await this.prisma.notificationDelivery.findFirst({
            where: { status: 'SENT' },
            orderBy: { sentAt: 'desc' },
            select: { sentAt: true },
          })
        )?.sentAt ?? null,
    }
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
