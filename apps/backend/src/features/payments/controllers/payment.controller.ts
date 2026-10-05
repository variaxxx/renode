import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { requireAuth, type AuthenticatedRequest } from '../../auth/auth.request'
import {
  ListPaymentsDto,
  CancelPaymentDto,
} from '../dto/payment-operations.dto'
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
  async monthlyExpenses(@Req() request: AuthenticatedRequest) {
    return this.payments.monthlyExpenses(requireAuth(request).ownerId)
  }

  /** Provide the owner calendar date for payment entry. */
  @Get('payments/calendar')
  @Header('Cache-Control', 'no-store')
  calendar(@Req() request: AuthenticatedRequest) {
    return this.payments.calendar(requireAuth(request).ownerId)
  }

  /** Return active deadlines and exact totals by currency. */
  @Get('payments/overview')
  @Header('Cache-Control', 'no-store')
  async overview(@Req() request: AuthenticatedRequest) {
    return this.payments.overview(requireAuth(request).ownerId)
  }
  /** Read the owner's global payment ledger. */
  @Get('payments')
  @Header('Cache-Control', 'no-store')
  async list(@Query() filters: ListPaymentsDto) {
    return (await this.payments.list(filters)).map((p) => ({
      ...PaymentResponseDto.fromPayment(p),
      serverName: p.server.name,
      providerName: p.server.provider.name,
      project: p.server.project,
    }))
  }
  /** Cancel a payment while retaining its original audit snapshot. */
  @Post('payments/:id/cancel')
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelPaymentDto,
  ) {
    const result = await this.payments.cancel(id, body.reason)
    return {
      ...PaymentResponseDto.fromPayment(result.payment),
      deadlineRestored: result.deadlineRestored,
    }
  }
  /** Return normalized costs and a recurring payment calendar. */
  @Get('payments/forecast')
  @Header('Cache-Control', 'no-store')
  forecast(@Req() request: AuthenticatedRequest) {
    return this.payments.forecast(requireAuth(request).ownerId)
  }
}
