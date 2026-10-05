import { apiRequest } from '@/shared/api/client'
import type { Currency } from '@/features/servers/api/servers'

export type PaymentInput = {
  paymentDate: string
  amount: string
  currency: Currency
  nextPaymentDate: string
}
export type Payment = PaymentInput & {
  id: string
  serverId: string
  createdAt: string
}
export type PaymentGroup = {
  servers: {
    id: string
    name: string
    providerId: string
    nextPaymentDate: string | null
    cost: string
    currency: Currency
  }[]
  totals: { currency: Currency; amount: string }[]
}
export type PaymentOverview = {
  asOfDate: string
  overdue: PaymentGroup
  upcoming7Days: PaymentGroup
  upcoming30Days: PaymentGroup
  expected: PaymentGroup
}

/** Record the owner's confirmed payment and renewal date. */
export function recordPayment(
  id: string,
  input: PaymentInput,
): Promise<Payment> {
  return apiRequest(`/servers/${encodeURIComponent(id)}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Load immutable payment snapshots for one server. */
export function listPayments(
  id: string,
  signal?: AbortSignal,
): Promise<Payment[]> {
  return apiRequest(`/servers/${encodeURIComponent(id)}/payments`, { signal })
}

/** Load deadlines and exact totals without converting currencies. */
export function getPaymentOverview(
  signal?: AbortSignal,
): Promise<PaymentOverview> {
  return apiRequest('/payments/overview', { signal })
}

export type MonthlyExpenses = {
  asOfDate: string
  months: ({ month: string } & Record<Currency, string>)[]
}

/** Load twelve months of actual payments separately for each currency. */
export function getMonthlyExpenses(
  signal?: AbortSignal,
): Promise<MonthlyExpenses> {
  return apiRequest('/payments/monthly-expenses', { signal })
}
