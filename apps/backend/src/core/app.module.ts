import { Module } from '@nestjs/common'
import { HealthModule } from '../features/health/health.module'

@Module({ imports: [HealthModule] })
export class AppModule {}
