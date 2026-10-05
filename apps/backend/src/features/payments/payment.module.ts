import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infra/prisma/prisma.module'
import { ServerModule } from '../servers/server.module'
import { PaymentController } from './controllers/payment.controller'
import { PaymentRepository } from './repositories/payment.repository'
import { PaymentService } from './services/payment.service'

@Module({
  imports: [PrismaModule, ServerModule],
  controllers: [PaymentController],
  providers: [PaymentRepository, PaymentService],
})
export class PaymentModule {}
