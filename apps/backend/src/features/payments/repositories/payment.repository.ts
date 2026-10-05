import { Injectable } from '@nestjs/common'
import { ServerStatus } from '../../../generated/prisma/client'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type { CreatePaymentDto } from '../dto/create-payment.dto'

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Save a payment and advance its server deadline atomically. */
  async record(serverId: string, input: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const nextPaymentDate = new Date(`${input.nextPaymentDate}T00:00:00.000Z`)
      await tx.server.update({
        where: { id: serverId },
        data: { nextPaymentDate },
      })
      return tx.payment.create({
        data: {
          serverId,
          paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
          amount: input.amount,
          currency: input.currency,
          nextPaymentDate,
        },
      })
    })
  }

  /** Return payment snapshots in a deterministic newest-first order. */
  async history(serverId: string) {
    return this.prisma.payment.findMany({
      where: { serverId },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    })
  }

  /** Fetch recorded expenses within the requested calendar window. */
  async expenses(start: Date, end: Date) {
    return this.prisma.payment.groupBy({
      by: ['paymentDate', 'currency'],
      where: { paymentDate: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { paymentDate: 'asc' },
    })
  }

  /** Read active deadlines and prices from one database snapshot. */
  async activeServers() {
    return this.prisma.server.findMany({
      where: { status: ServerStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        providerId: true,
        nextPaymentDate: true,
        cost: true,
        currency: true,
      },
      orderBy: [{ nextPaymentDate: 'asc' }, { id: 'asc' }],
    })
  }
}
