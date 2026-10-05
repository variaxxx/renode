import type { PaymentInput } from '../api/payments'

/** Keep an unresolved payment across dialog closures and reloads in this tab. */
export function readPendingPayment(serverId: string): PaymentInput | null {
  const value = sessionStorage.getItem(`renode:pending-payment:${serverId}`)
  if (!value) return null
  const input = JSON.parse(value) as PaymentInput
  if (
    !input ||
    ![
      'requestKey',
      'paymentDate',
      'amount',
      'currency',
      'nextPaymentDate',
    ].every((key) => typeof input[key as keyof PaymentInput] === 'string')
  )
    throw new Error(
      'Не удалось прочитать незавершённый платёж. Проверьте журнал платежей.',
    )
  return input
}

/** Persist the original request before it can reach the API. */
export function savePendingPayment(
  serverId: string,
  input: PaymentInput,
): void {
  sessionStorage.setItem(
    `renode:pending-payment:${serverId}`,
    JSON.stringify(input),
  )
}

/** Forget a request only after the API confirms its result. */
export function clearPendingPayment(serverId: string): void {
  sessionStorage.removeItem(`renode:pending-payment:${serverId}`)
}
