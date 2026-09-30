import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { ProviderController } from './controllers/provider.controller'
import { ProviderRepository } from './repositories/provider.repository'
import { ProviderService } from './services/provider.service'

@Module({
  imports: [PrismaModule],
  controllers: [ProviderController],
  providers: [ProviderRepository, ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
