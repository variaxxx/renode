import { apiRequest } from '@/shared/api/client'
import type { Currency } from '@/features/servers/api/servers'

export type PaymentInput = {
  paymentDate: string
  amount: string
  currency: Currency
  nextPaymentDate: string
  requestKey: string
}
export type Payment = Omit<PaymentInput, 'requestKey'> & {
  cancelledAt: string | null
  cancellationReason: string | null
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
  timezone: string
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

export type LedgerPayment = Payment & {
  serverName: string
  providerName: string
  project: string | null
}
/** Load the global ledger with optional filters. */
export function getLedger(
  filters: Record<string, string>,
  signal?: AbortSignal,
): Promise<LedgerPayment[]> {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v),
  )
  return apiRequest(`/payments?${params}`, { signal })
}
/** Retain the original payment and record a cancellation reason. */
export function cancelPayment(
  id: string,
  reason: string,
): Promise<Payment & { deadlineRestored: boolean }> {
  return apiRequest(`/payments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
export type Forecast = {
  asOfDate: string
  timezone: string
  monthlyEquivalent: { currency: Currency; amount: string }[]
  months: ({ month: string } & Record<Currency, string>)[]
  events: {
    serverId: string
    name: string
    date: string
    amount: string
    currency: Currency
  }[]
}
/** Load recurring current-price estimates. */
export function getForecast(signal?: AbortSignal): Promise<Forecast> {
  return apiRequest('/payments/forecast', { signal })
}
