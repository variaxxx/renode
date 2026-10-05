import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NotificationError } from '../notification.errors'

@Injectable()
export class TelegramService {
  constructor(private readonly config: ConfigService) {}

  /** Send plain text to Telegram without exposing the bot token on failures. */
  async send(
    chatId: string,
    threadId: number | null,
    text: string,
  ): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')
    if (!token)
      throw new NotificationError(
        'TELEGRAM_NOT_CONFIGURED',
        503,
        'Токен Telegram-бота не настроен на сервере.',
      )
    let response: Response
    let result: { ok?: boolean; description?: string }
    try {
      response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            ...(threadId === null ? {} : { message_thread_id: threadId }),
            text,
          }),
          signal: AbortSignal.timeout(10000),
        },
      )
      const payload: unknown = await response.json()
      if (typeof payload !== 'object' || payload === null)
        throw new Error('Invalid Telegram response')
      result = payload as typeof result
    } catch {
      throw new NotificationError(
        'TELEGRAM_UNAVAILABLE',
        502,
        'Telegram недоступен или не ответил вовремя. Повторите попытку.',
      )
    }
    if (!response.ok || result.ok !== true) {
      const reason =
        typeof result.description === 'string'
          ? result.description.replaceAll(token, '[redacted]').slice(0, 300)
          : 'Неизвестная ошибка Telegram'
      throw new NotificationError(
        'TELEGRAM_SEND_FAILED',
        502,
        `Не удалось отправить сообщение: ${reason}`,
      )
    }
  }
}
