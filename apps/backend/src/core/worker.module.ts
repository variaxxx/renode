import { Module } from '@nestjs/common'
import { WorkerService } from '../features/notifications/worker.service'

@Module({ providers: [WorkerService] })
export class WorkerModule {}
