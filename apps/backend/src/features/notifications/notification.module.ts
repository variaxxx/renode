import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { NotificationController } from './controllers/notification.controller'
import { NotificationRepository } from './repositories/notification.repository'
import { NotificationService } from './services/notification.service'
import { TelegramService } from './services/telegram.service'

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationRepository, NotificationService, TelegramService],
  exports: [TelegramService, NotificationRepository],
})
export class NotificationModule {}
