import { Controller, Get } from '@nestjs/common'
import { Public } from '../../common/public-route.decorator'

@Controller('health')
export class HealthController {
  /** Report that the API process is responding. */
  @Public()
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
