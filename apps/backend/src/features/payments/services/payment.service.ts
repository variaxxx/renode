import { Injectable } from '@nestjs/common'
import { Prisma, type Currency } from '../../../generated/prisma/client'
import { ServerService } from '../../servers/services/server.service'
import { ServerNotFoundError } from '../../servers/server.errors'
import type { CreatePaymentDto } from '../dto/create-payment.dto'
import { PaymentRepository } from '../repositories/payment.repository'

type DueServer = Awaited<ReturnType<PaymentRepository['activeServers']>>[number]

@Injectable()
export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly servers: ServerService,
  ) {}

  /** Record the confirmed amount and deadline without changing rental expiry. */
  async record(serverId: string, input: CreatePaymentDto) {
    try {
      return await this.payments.record(serverId, input)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      )
        throw new ServerNotFoundError()
      throw error
    }
  }

  /** Require a server before exposing its immutable payment history. */
  async history(serverId: string) {
    await this.servers.get(serverId)
    return this.payments.history(serverId)
  }

  /** Classify calendar deadlines using today's UTC date until owner timezone setup. */
  async overview() {
    const today = new Date().toISOString().slice(0, 10)
    const start = new Date(`${today}T00:00:00.000Z`).getTime()
    const servers = await this.payments.activeServers()
    const upcoming = (days: number) =>
      servers.filter((server) => {
        const due = server.nextPaymentDate?.getTime()
        return (
          due !== undefined && due >= start && due <= start + days * 86_400_000
        )
      })
    return {
      asOfDate: today,
      overdue: this.summarize(
        servers.filter(
          (server) =>
            server.nextPaymentDate !== null &&
            server.nextPaymentDate.getTime() < start,
        ),
      ),
      upcoming7Days: this.summarize(upcoming(7)),
      upcoming30Days: this.summarize(upcoming(30)),
      expected: this.summarize(servers),
    }
  }

  /** Sum actual payments into twelve UTC calendar months by currency. */
  async monthlyExpenses() {
    const now = new Date()
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    )
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    )
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
      )
        .toISOString()
        .slice(0, 7),
      totals: {
        RUB: new Prisma.Decimal(0),
        USD: new Prisma.Decimal(0),
        EUR: new Prisma.Decimal(0),
      },
    }))
    const byMonth = new Map(months.map((item) => [item.month, item.totals]))
    for (const payment of await this.payments.expenses(start, end)) {
      const totals = byMonth.get(payment.paymentDate.toISOString().slice(0, 7))
      if (totals && payment._sum.amount) {
        totals[payment.currency] = totals[payment.currency].plus(
          payment._sum.amount,
        )
      }
    }
    return {
      asOfDate: now.toISOString().slice(0, 10),
      months: months.map(({ month, totals }) => ({
        month,
        RUB: totals.RUB.toFixed(2),
        USD: totals.USD.toFixed(2),
        EUR: totals.EUR.toFixed(2),
      })),
    }
  }

  /** Add exact decimal prices separately for each currency. */
  private summarize(servers: DueServer[]) {
    const totals = new Map<Currency, Prisma.Decimal>()
    for (const server of servers)
      totals.set(
        server.currency,
        (totals.get(server.currency) ?? new Prisma.Decimal(0)).plus(
          server.cost,
        ),
      )
    return {
      servers: servers.map((server) => ({
        ...server,
        cost: server.cost.toFixed(2),
        nextPaymentDate:
          server.nextPaymentDate?.toISOString().slice(0, 10) ?? null,
      })),
      totals: [...totals]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    }
  }
}
