import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { ServerController } from './controllers/server.controller'
import { ServerRepository } from './repositories/server.repository'
import { ServerService } from './services/server.service'

@Module({
  imports: [PrismaModule],
  controllers: [ServerController],
  providers: [ServerRepository, ServerService],
  exports: [ServerService],
})
export class ServerModule {}
