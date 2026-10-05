import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { DeliveryResult, ReservedReminder } from '../reminder.types'
import { DeliveryRepository } from '../repositories/delivery.repository'
import { TelegramSendError } from '../notification.errors'
import { TelegramService } from './telegram.service'

const EVENT_LABELS = {
  PAYMENT: 'Оплата',
  RENTAL_END: 'Окончание аренды',
  CANCELLATION: 'Срок отмены',
}

@Injectable()
export class ReminderService {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  /** Reserve due events using the current server dates and notification settings. */
  async reserveDue(now = new Date()): Promise<number> {
    return this.deliveries.reserveDue(now)
  }

  /** Deliver one still-current event and retain its final or retry result. */
  async deliverNext(now = new Date()): Promise<boolean> {
    const origin = this.config.getOrThrow<string>('FRONTEND_ORIGIN')
    return this.deliveries.processNext(now, async (reminder) =>
      this.send(reminder, origin),
    )
  }

  /** Build a plain-text reminder from public catalog fields only. */
  private async send(
    reminder: ReservedReminder,
    origin: string,
  ): Promise<DeliveryResult> {
    const date = reminder.eventDate.toISOString().slice(0, 10)
    const link = new URL(`/servers/${reminder.serverId}`, origin).href
    const text = `Renode: ${reminder.name.slice(0, 160)}\n${EVENT_LABELS[reminder.eventType]}: ${date}\nНапоминание за ${reminder.interval} дн.\n${link}`
    try {
      await this.telegram.send(reminder.chatId, reminder.threadId, text)
      return { success: true }
    } catch (error) {
      if (!(error instanceof TelegramSendError)) throw error
      const backoffSeconds = Math.min(
        3600,
        60 * 2 ** Math.min(reminder.attempts, 6),
      )
      const delaySeconds = Math.max(
        backoffSeconds,
        error.retryAfterSeconds ?? 0,
      )
      return {
        success: false,
        error: error.message,
        retryAt: error.retryable
          ? new Date(Date.now() + delaySeconds * 1000)
          : null,
      }
    }
  }
}
