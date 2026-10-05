import { NotificationRepository } from '../../notifications/repositories/notification.repository'
import { calendarDate, advanceMonth } from '../../../common/calendar'
import { PaymentError } from '../payment.errors'
import type { ListPaymentsDto } from '../dto/payment-operations.dto'
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
    private readonly notifications: NotificationRepository,
  ) {}

  /** Record the confirmed amount and deadline without changing rental expiry. */
  async record(serverId: string, input: CreatePaymentDto) {
    try {
      return await this.payments.record(serverId, input)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new PaymentError(
          'PAYMENT_REQUEST_CONFLICT',
          409,
          'Этот ключ уже использован для платежа. Обновите форму.',
        )
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

  /** Classify deadlines using the owner's configured calendar date. */
  async overview(ownerId: string) {
    const timezone =
      (await this.notifications.find(ownerId))?.timezone ?? 'Europe/Moscow'
    const today = calendarDate(timezone)
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
      timezone,
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

  /** Sum effective payments into twelve owner calendar months by currency. */
  async monthlyExpenses(ownerId: string) {
    const timezone =
      (await this.notifications.find(ownerId))?.timezone ?? 'Europe/Moscow'
    const today = calendarDate(timezone)
    const now = new Date(`${today}T00:00:00Z`)
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
        id: server.id,
        name: server.name,
        providerId: server.providerId,
        currency: server.currency,
        cost: server.cost.toFixed(2),
        nextPaymentDate:
          server.nextPaymentDate?.toISOString().slice(0, 10) ?? null,
      })),
      totals: [...totals]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })),
    }
  }
  /** Read the ledger with server and provider labels. */
  list(filters: ListPaymentsDto) {
    if (filters.from && filters.to && filters.from > filters.to)
      throw new PaymentError(
        'PAYMENT_RANGE_INVALID',
        400,
        'Начальная дата должна быть не позже конечной.',
      )
    return this.payments.list(filters)
  }

  /** Preserve a cancelled snapshot and undo its renewal when still applicable. */
  cancel(id: string, reason: string) {
    return this.payments.cancel(id, reason)
  }

  /** Project recurring current tariffs over twelve months without currency conversion. */
  async forecast(ownerId: string) {
    const timezone =
      (await this.notifications.find(ownerId))?.timezone ?? 'Europe/Moscow'
    const today = calendarDate(timezone)
    const first = `${today.slice(0, 7)}-01`
    const end = advanceMonth(first, 12)
    const servers = await this.payments.activeServers()
    const monthly = {
      RUB: new Prisma.Decimal(0),
      USD: new Prisma.Decimal(0),
      EUR: new Prisma.Decimal(0),
    }
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: advanceMonth(first, i).slice(0, 7),
      totals: {
        RUB: new Prisma.Decimal(0),
        USD: new Prisma.Decimal(0),
        EUR: new Prisma.Decimal(0),
      },
    }))
    const events: {
      serverId: string
      name: string
      date: string
      amount: string
      currency: Currency
    }[] = []
    for (const server of servers) {
      monthly[server.currency] = monthly[server.currency].plus(
        server.cost.div(server.billingPeriodMonths),
      )
      const base = server.nextPaymentDate?.toISOString().slice(0, 10)
      if (!base) continue
      const monthsSinceBase =
        (Number(today.slice(0, 4)) - Number(base.slice(0, 4))) * 12 +
        Number(today.slice(5, 7)) -
        Number(base.slice(5, 7))
      const firstOffset = Math.max(
        0,
        Math.floor(monthsSinceBase / server.billingPeriodMonths) - 1,
      )
      for (let i = firstOffset; ; i++) {
        const date = advanceMonth(base, i * server.billingPeriodMonths)
        if (date >= end) break
        if (
          (server.rentalEndDate &&
            date > server.rentalEndDate.toISOString().slice(0, 10)) ||
          (server.cancellationDeadline &&
            date > server.cancellationDeadline.toISOString().slice(0, 10))
        )
          break
        if (date < today) continue
        months.find((m) => m.month === date.slice(0, 7))!.totals[
          server.currency
        ] = months
          .find((m) => m.month === date.slice(0, 7))!
          .totals[server.currency].plus(server.cost)
        events.push({
          serverId: server.id,
          name: server.name,
          date,
          amount: server.cost.toFixed(2),
          currency: server.currency,
        })
      }
    }
    return {
      asOfDate: today,
      timezone,
      monthlyEquivalent: Object.entries(monthly).map(([currency, amount]) => ({
        currency,
        amount: amount.toFixed(2),
      })),
      months: months.map((m) => ({
        month: m.month,
        ...Object.fromEntries(
          Object.entries(m.totals).map(([currency, amount]) => [
            currency,
            amount.toFixed(2),
          ]),
        ),
      })),
      events: events.sort((a, b) => a.date.localeCompare(b.date)),
    }
  }
}
