import type { Payment } from '../../../generated/prisma/client'

export class PaymentResponseDto {
  /** Serialize the immutable payment snapshot without floating-point conversion. */
  static fromPayment(payment: Payment) {
    return {
      id: payment.id,
      serverId: payment.serverId,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      nextPaymentDate: payment.nextPaymentDate.toISOString().slice(0, 10),
      createdAt: payment.createdAt.toISOString(),
    }
  }
}
