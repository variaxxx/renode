import { Module } from '@nestjs/common'
import { HealthModule } from '../features/health/health.module'
import { PrismaModule } from '../infra/prisma/prisma.module'
import { AppConfigModule } from './config.module'

@Module({ imports: [AppConfigModule, HealthModule, PrismaModule] })
export class AppModule {}
