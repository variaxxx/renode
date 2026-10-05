import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { VaultController } from './controllers/vault.controller'
import { VaultRepository } from './repositories/vault.repository'
import { VaultService } from './services/vault.service'

@Module({
  imports: [PrismaModule],
  controllers: [VaultController],
  providers: [VaultRepository, VaultService],
})
export class VaultModule {}
