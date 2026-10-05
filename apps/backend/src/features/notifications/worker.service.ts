import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NotificationRepository } from './repositories/notification.repository'
import { ReminderService } from './services/reminder.service'

@Injectable()
export class WorkerService implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger(WorkerService.name)
  private timer?: ReturnType<typeof setInterval>
  private running: Promise<void> | null = null
  private stopping = false

  constructor(
    private readonly reminders: ReminderService,
    private readonly config: ConfigService,
    private readonly repository: NotificationRepository,
  ) {}

  /** Poll immediately and once per minute without overlapping local cycles. */
  onModuleInit(): void {
    if (
      !this.config.get<string>('TELEGRAM_BOT_TOKEN') ||
      !this.config.get<string>('FRONTEND_ORIGIN')
    ) {
      this.logger.warn(
        'Reminder delivery requires TELEGRAM_BOT_TOKEN and FRONTEND_ORIGIN.',
      )
      return
    }
    this.startCycle()
    this.timer = setInterval(() => this.startCycle(), 60000)
  }

  /** Stop polling and finish the active delivery before closing resources. */
  async beforeApplicationShutdown(): Promise<void> {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
    await this.running
  }

  /** Keep one bounded batch active per worker process. */
  private startCycle(): void {
    if (this.running || this.stopping) return
    this.running = this.runCycle().finally(() => {
      this.running = null
    })
  }

  /** Recover due events and send a bounded batch using database locks. */
  private async runCycle(): Promise<void> {
    try {
      await this.reminders.reserveDue()
      for (let index = 0; index < 50 && !this.stopping; index++) {
        if (!(await this.reminders.deliverNext())) break
      }
      await this.repository.heartbeat(null)
    } catch {
      await this.repository
        .heartbeat('Ошибка цикла доставки.')
        .catch(() => undefined)
      this.logger.error(
        'Reminder cycle failed; pending deliveries will be retried on the next cycle.',
      )
    }
  }
}
