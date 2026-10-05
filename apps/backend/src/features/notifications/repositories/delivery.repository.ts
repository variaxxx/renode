import { Injectable } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma/client'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type { DeliveryResult, ReservedReminder } from '../reminder.types'
import { reminderEvents, reminderMoment } from './reminder-schedule.sql'

@Injectable()
export class DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Reserve each due event once, including deadlines missed during downtime. */
  async reserveDue(now: Date): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => tx.$executeRaw`
      INSERT INTO notification_delivery
        (id, server_id, event_type, event_date, "interval", next_attempt_at, updated_at)
      SELECT gen_random_uuid(), s.id, e.event_type, e.event_date, offsets.days, ${now}, ${now}
      FROM server s
      CROSS JOIN notification_settings n
      ${reminderEvents}
      CROSS JOIN LATERAL unnest(e.intervals) AS offsets(days)
      WHERE s.status = 'ACTIVE' AND n.chat_id IS NOT NULL
        AND e.event_date IS NOT NULL
        AND ${reminderMoment(Prisma.sql`e.event_date`, Prisma.sql`offsets.days`, Prisma.sql`n.timezone`)} <= ${now}
      ON CONFLICT (server_id, event_type, event_date, "interval") DO NOTHING
    `,
    )
  }

  /** Claim current work briefly, then send without holding catalog locks. */
  async processNext(
    now: Date,
    handle: (reminder: ReservedReminder) => Promise<DeliveryResult>,
  ): Promise<boolean> {
    const leaseUntil = new Date(now.getTime() + 60000)
    const reminder = await this.prisma.$transaction(async (tx) => {
      const reminders = await tx.$queryRaw<ReservedReminder[]>`
        SELECT d.id, s.id AS "serverId", s.name, d.event_type AS "eventType",
          d.event_date AS "eventDate", d."interval", d.attempts,
          n.chat_id AS "chatId", n.thread_id AS "threadId"
        FROM notification_delivery d
        JOIN server s ON s.id = d.server_id
        CROSS JOIN notification_settings n
        ${reminderEvents}
        WHERE d.status IN ('PENDING', 'RETRY') AND d.next_attempt_at <= ${now}
          AND s.status = 'ACTIVE' AND n.chat_id IS NOT NULL
          AND d.event_type = e.event_type AND d.event_date = e.event_date
          AND d."interval" = ANY(e.intervals)
          AND ${reminderMoment(Prisma.sql`e.event_date`, Prisma.sql`d."interval"`, Prisma.sql`n.timezone`)} <= ${now}
        ORDER BY d.next_attempt_at, d.created_at, d.id
        LIMIT 1
        FOR UPDATE OF d, s, n SKIP LOCKED
      `
      const selected = reminders[0]
      if (!selected) return null
      await tx.notificationDelivery.update({
        where: { id: selected.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: leaseUntil,
        },
      })
      return selected
    })
    if (!reminder) return false
    const result = await handle(reminder)
    const completedAt = new Date()
    await this.prisma.notificationDelivery.updateMany({
      where: {
        id: reminder.id,
        attempts: reminder.attempts + 1,
        nextAttemptAt: leaseUntil,
        status: { in: ['PENDING', 'RETRY'] },
      },
      data: {
        status: result.success ? 'SENT' : result.retryAt ? 'RETRY' : 'FAILED',
        sentAt: result.success ? completedAt : null,
        lastError: result.success ? null : result.error.slice(0, 500),
        nextAttemptAt: result.success
          ? completedAt
          : (result.retryAt ?? completedAt),
      },
    })
    return true
  }
}
