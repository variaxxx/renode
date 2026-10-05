import type { NotificationEventType } from '../../generated/prisma/client'

export interface ReservedReminder {
  id: string
  serverId: string
  name: string
  eventType: NotificationEventType
  eventDate: Date
  interval: number
  attempts: number
  chatId: string
  threadId: number | null
}

export type DeliveryResult =
  | { success: true }
  | {
      success: false
      error: string
      retryAt: Date | null
    }
