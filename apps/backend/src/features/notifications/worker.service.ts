import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private idleTimer?: ReturnType<typeof setInterval>

  /** Keep the worker process ready for future notification jobs. */
  onModuleInit(): void {
    this.idleTimer = setInterval(() => undefined, 60_000)
  }

  /** Release the worker timer on shutdown. */
  onModuleDestroy(): void {
    if (this.idleTimer) clearInterval(this.idleTimer)
  }
}
