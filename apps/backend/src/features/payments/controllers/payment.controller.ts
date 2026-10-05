import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import { CreatePaymentDto } from '../dto/create-payment.dto'
import { PaymentResponseDto } from '../dto/payment-response.dto'
import { PaymentService } from '../services/payment.service'

@Controller()
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  /** Record a payment for the authenticated owner. */
  @Post('servers/:id/payments')
  @Header('Cache-Control', 'no-store')
  async record(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePaymentDto,
  ) {
    return PaymentResponseDto.fromPayment(await this.payments.record(id, body))
  }

  /** Return the server's payment snapshots. */
  @Get('servers/:id/payments')
  @Header('Cache-Control', 'no-store')
  async history(@Param('id', ParseUUIDPipe) id: string) {
    return (await this.payments.history(id)).map(PaymentResponseDto.fromPayment)
  }

  /** Return actual hosting expenses grouped by month and currency. */
  @Get('payments/monthly-expenses')
  @Header('Cache-Control', 'no-store')
  async monthlyExpenses() {
    return this.payments.monthlyExpenses()
  }

  /** Return active deadlines and exact totals by currency. */
  @Get('payments/overview')
  @Header('Cache-Control', 'no-store')
  async overview() {
    return this.payments.overview()
  }
}
