import { NotificationModule } from '../features/notifications/notification.module'
import { DeliveryRepository } from '../features/notifications/repositories/delivery.repository'
import { ReminderService } from '../features/notifications/services/reminder.service'
import { Module } from '@nestjs/common'
import { WorkerService } from '../features/notifications/worker.service'
import { PrismaModule } from '../infra/prisma/prisma.module'
import { AppConfigModule } from './config.module'

@Module({
  imports: [AppConfigModule, PrismaModule, NotificationModule],
  providers: [DeliveryRepository, ReminderService, WorkerService],
})
export class WorkerModule {}
