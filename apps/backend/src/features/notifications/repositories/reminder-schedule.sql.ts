import { Prisma } from '../../../generated/prisma/client'

/** Resolve 09:00 after calendar-day subtraction in the owner's timezone. */
export function reminderMoment(
  date: Prisma.Sql,
  interval: Prisma.Sql,
  timezone: Prisma.Sql,
): Prisma.Sql {
  return Prisma.sql`((${date} - ${interval}) + TIME '09:00') AT TIME ZONE ${timezone}`
}

/** Expand the three independent server deadlines with their configured offsets. */
export const reminderEvents = Prisma.sql`
  CROSS JOIN LATERAL (VALUES
    ('PAYMENT'::"NotificationEventType", s.next_payment_date, n.payment_intervals),
    ('RENTAL_END'::"NotificationEventType", s.rental_end_date, n.rental_end_intervals),
    ('CANCELLATION'::"NotificationEventType", s.cancellation_deadline, n.cancellation_intervals)
  ) AS e(event_type, event_date, intervals)
`
