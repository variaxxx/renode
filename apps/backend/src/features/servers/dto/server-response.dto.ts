import type { Server } from '../server.types'

export class ServerResponseDto {
  /** Expose explicit catalog fields with exact decimal and date strings. */
  static fromServer(server: Server) {
    return {
      id: server.id,
      providerId: server.providerId,
      name: server.name,
      purpose: server.purpose,
      status: server.status,
      tariff: server.tariff,
      cost: server.cost.toFixed(2),
      currency: server.currency,
      billingPeriodMonths: server.billingPeriodMonths,
      nextPaymentDate:
        server.nextPaymentDate?.toISOString().slice(0, 10) ?? null,
      rentalEndDate: server.rentalEndDate?.toISOString().slice(0, 10) ?? null,
      cancellationDeadline:
        server.cancellationDeadline?.toISOString().slice(0, 10) ?? null,
      autoRenew: server.autoRenew,
      ipAddress: server.ipAddress,
      domain: server.domain,
      project: server.project,
      tags: server.tags,
      note: server.note,
      createdAt: server.createdAt.toISOString(),
      updatedAt: server.updatedAt.toISOString(),
    }
  }
}
