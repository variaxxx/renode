import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { requireAuth, type AuthenticatedRequest } from '../../auth/auth.request'
import { NotificationSettingsDto } from '../dto/notification-settings.dto'
import { NotificationService } from '../services/notification.service'

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  /** Read notification settings for the authenticated owner. */
  @Get('settings')
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() request: AuthenticatedRequest,
  ): Promise<NotificationSettingsDto> {
    return NotificationSettingsDto.fromSettings(
      await this.notifications.read(requireAuth(request).ownerId),
    )
  }

  /** Save the manually entered Telegram destination and schedule. */
  @Put('settings')
  @Header('Cache-Control', 'no-store')
  async save(
    @Req() request: AuthenticatedRequest,
    @Body() body: NotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    return NotificationSettingsDto.fromSettings(
      await this.notifications.save(requireAuth(request).ownerId, body),
    )
  }

  /** Read delivery diagnostics without exposing bot credentials. */
  @Get('status')
  @Header('Cache-Control', 'no-store')
  status() {
    return this.notifications.status()
  }

  /** Report success only after Telegram accepts the test message. */
  @Post('test')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async test(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.notifications.test(requireAuth(request).ownerId)
  }
}
