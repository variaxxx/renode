import { Module } from '@nestjs/common'
import { WorkerService } from '../features/notifications/worker.service'
import { PrismaModule } from '../infra/prisma/prisma.module'
import { AppConfigModule } from './config.module'

@Module({
  imports: [AppConfigModule, PrismaModule],
  providers: [WorkerService],
})
export class WorkerModule {}
