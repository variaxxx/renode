import type { PaginationDto } from '../../../common/pagination'
import { Injectable } from '@nestjs/common'
import { NotificationError } from '../notification.errors'
import {
  DEFAULT_SETTINGS,
  type NotificationSettings,
} from '../notification.types'
import { NotificationRepository } from '../repositories/notification.repository'
import { TelegramService } from './telegram.service'

@Injectable()
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly telegram: TelegramService,
  ) {}

  /** Return saved settings or the initial schedule. */
  async read(ownerId: string): Promise<NotificationSettings> {
    return (await this.repository.find(ownerId)) ?? DEFAULT_SETTINGS
  }

  /** Validate timezone and destination before storing the schedule. */
  async save(
    ownerId: string,
    input: NotificationSettings,
  ): Promise<NotificationSettings> {
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format()
    } catch {
      throw new NotificationError(
        'NOTIFICATION_INVALID',
        400,
        'Укажите действующий часовой пояс IANA, например Europe/Moscow.',
      )
    }
    if (!input.timezone.trim() || (!input.chatId && input.threadId !== null))
      throw new NotificationError(
        'NOTIFICATION_INVALID',
        400,
        'Для thread ID необходимо указать chat ID.',
      )
    if (input.chatId && !Number.isSafeInteger(Number(input.chatId)))
      throw new NotificationError(
        'NOTIFICATION_INVALID',
        400,
        'Chat ID выходит за допустимый диапазон.',
      )
    return this.repository.save(ownerId, {
      ...input,
      paymentIntervals: [...input.paymentIntervals].sort((a, b) => b - a),
      rentalEndIntervals: [...input.rentalEndIntervals].sort((a, b) => b - a),
      cancellationIntervals: [...input.cancellationIntervals].sort(
        (a, b) => b - a,
      ),
    })
  }

  /** Expose safe worker and delivery diagnostics. */
  status() {
    return this.repository.status()
  }

  /** Read one page of delivery history. */
  deliveries(query: PaginationDto) {
    return this.repository.deliveries(query)
  }

  /** Read one page of future reminders. */
  upcoming(query: PaginationDto) {
    return this.repository.upcoming(query)
  }

  /** Send a test using only the owner's persisted destination. */
  async test(ownerId: string): Promise<void> {
    const settings = await this.read(ownerId)
    if (!settings.chatId)
      throw new NotificationError(
        'TELEGRAM_CHAT_REQUIRED',
        400,
        'Сначала сохраните chat ID в настройках.',
      )
    await this.telegram.send(
      settings.chatId,
      settings.threadId,
      'Renode: тестовое уведомление. Настройки Telegram работают.',
    )
  }
}
