import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  /** Report that the API process is responding. */
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
