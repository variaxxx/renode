import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { AuthController } from './controllers/auth.controller'
import { OwnerRepository } from './repositories/owner.repository'
import { SessionRepository } from './repositories/session.repository'
import { AuthService } from './services/auth.service'
import { OwnerSetupService } from './services/owner-setup.service'

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    OwnerRepository,
    SessionRepository,
    AuthService,
    OwnerSetupService,
  ],
  exports: [AuthService, OwnerSetupService],
})
export class AuthModule {}
