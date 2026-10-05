import { readPage, type PaginationDto } from '../../../common/pagination'
import { Injectable } from '@nestjs/common'
import { PaymentError } from '../payment.errors'
import type { ListPaymentsDto } from '../dto/payment-operations.dto'
import { Prisma, ServerStatus } from '../../../generated/prisma/client'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type { CreatePaymentDto } from '../dto/create-payment.dto'

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Save a payment and advance its server deadline atomically. */
  async record(serverId: string, input: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM server WHERE id = ${serverId}::uuid FOR UPDATE`
      const existing = await tx.payment.findUnique({
        where: { requestKey: input.requestKey },
      })
      if (existing) {
        if (
          existing.serverId !== serverId ||
          existing.amount.toFixed(2) !==
            new Prisma.Decimal(input.amount).toFixed(2) ||
          existing.currency !== input.currency ||
          existing.paymentDate.toISOString().slice(0, 10) !==
            input.paymentDate ||
          existing.nextPaymentDate.toISOString().slice(0, 10) !==
            input.nextPaymentDate
        )
          throw new PaymentError(
            'PAYMENT_REQUEST_CONFLICT',
            409,
            'Этот запрос уже использован для другого платежа.',
          )
        return existing
      }
      const server = await tx.server.findUniqueOrThrow({
        where: { id: serverId },
      })
      const previous = await tx.payment.findFirst({
        where: { serverId, cancelledAt: null },
        orderBy: { ledgerSequence: 'desc' },
      })
      const nextPaymentDate = new Date(`${input.nextPaymentDate}T00:00:00.000Z`)
      await tx.server.update({
        where: { id: serverId },
        data: { nextPaymentDate },
      })
      return tx.payment.create({
        data: {
          serverId,
          requestKey: input.requestKey,
          previousPaymentDate: server.nextPaymentDate,
          previousPaymentId:
            previous &&
            previous.nextPaymentDate.getTime() ===
              server.nextPaymentDate?.getTime()
              ? previous.id
              : null,
          paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
          amount: input.amount,
          currency: input.currency,
          nextPaymentDate,
        },
      })
    })
  }

  /** Return payment snapshots in a deterministic newest-first order. */
  async history(serverId: string, query: PaginationDto) {
    return readPage(
      this.prisma,
      query,
      (tx) => tx.payment.count({ where: { serverId } }),
      (tx, range) =>
        tx.payment.findMany({
          where: { serverId },
          ...range,
          orderBy: [
            { paymentDate: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
    )
  }

  /** Fetch recorded expenses within the requested calendar window. */
  async expenses(start: Date, end: Date) {
    return this.prisma.payment.groupBy({
      by: ['paymentDate', 'currency'],
      where: { paymentDate: { gte: start, lt: end }, cancelledAt: null },
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
        billingPeriodMonths: true,
        rentalEndDate: true,
        cancellationDeadline: true,
        currency: true,
      },
      orderBy: [{ nextPaymentDate: 'asc' }, { id: 'asc' }],
    })
  }
  /** Filter the global ledger while retaining cancelled snapshots. */
  async list(filters: ListPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {
      paymentDate: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
      currency: filters.currency,
      server: {
        providerId: filters.providerId,
        project: filters.project
          ? { contains: filters.project, mode: 'insensitive' }
          : undefined,
      },
    }
    return readPage(
      this.prisma,
      filters,
      (tx) => tx.payment.count({ where }),
      (tx, range) =>
        tx.payment.findMany({
          where,
          ...range,
          include: {
            server: {
              select: {
                name: true,
                project: true,
                provider: { select: { name: true } },
              },
            },
          },
          orderBy: [
            { paymentDate: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        }),
    )
  }

  /** Cancel a snapshot and restore the deadline only when it remains applicable. */
  async cancel(id: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.payment.findUnique({ where: { id } })
      if (!snapshot)
        throw new PaymentError('PAYMENT_NOT_FOUND', 404, 'Платёж не найден.')
      await tx.$queryRaw`SELECT id FROM server WHERE id = ${snapshot.serverId}::uuid FOR UPDATE`
      const payment = await tx.payment.findUniqueOrThrow({ where: { id } })
      if (payment.cancelledAt) return { payment, deadlineRestored: false }
      const latest = await tx.payment.findFirst({
        where: { serverId: payment.serverId, cancelledAt: null },
        orderBy: { ledgerSequence: 'desc' },
      })
      const server = await tx.server.findUniqueOrThrow({
        where: { id: payment.serverId },
      })
      let deadlineRestored = false
      if (
        latest?.id === id &&
        payment.previousPaymentDate &&
        server.nextPaymentDate?.getTime() === payment.nextPaymentDate.getTime()
      ) {
        deadlineRestored = true
        let date = payment.previousPaymentDate
        let previousId = payment.previousPaymentId
        while (previousId) {
          const predecessor = await tx.payment.findUnique({
            where: { id: previousId },
          })
          if (!predecessor?.cancelledAt || !predecessor.previousPaymentDate)
            break
          date = predecessor.previousPaymentDate
          previousId = predecessor.previousPaymentId
        }
        await tx.server.update({
          where: { id: payment.serverId },
          data: { nextPaymentDate: date },
        })
      }
      const cancelled = await tx.payment.update({
        where: { id },
        data: { cancelledAt: new Date(), cancellationReason: reason.trim() },
      })
      return { payment: cancelled, deadlineRestored }
    })
  }
}
