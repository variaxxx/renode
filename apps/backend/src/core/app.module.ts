import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ApiExceptionFilter } from '../common/filters/api-exception.filter'
import { SessionGuard } from '../features/auth/guards/session.guard'
import { CsrfGuard } from '../features/auth/guards/csrf.guard'
import { HealthModule } from '../features/health/health.module'
import { AuthModule } from '../features/auth/auth.module'
import { ProviderModule } from '../features/providers/provider.module'
import { ServerModule } from '../features/servers/server.module'
import { PrismaModule } from '../infra/prisma/prisma.module'
import { AppConfigModule } from './config.module'

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    HealthModule,
    ProviderModule,
    ServerModule,
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
