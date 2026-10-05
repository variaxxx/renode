import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { listPayments, type Payment } from '../api/payments'
import { displayPaymentDate } from '../lib/dates'

/** Render historical amounts independently of the server's current tariff. */
export function PaymentHistory({
  serverId,
  revision,
}: {
  serverId: string
  revision: number
}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    /** Load snapshots while preventing stale responses after navigation. */
    async function load() {
      setLoading(true)
      setError('')
      try {
        const result = await listPayments(serverId, controller.signal)
        if (active) setPayments(result)
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить платежи.',
          )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [serverId, revision, retry])
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">История платежей</h2>
      {loading ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Загружаем платежи…
        </p>
      ) : error ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Повторить
          </Button>
        </div>
      ) : payments.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Платежей пока нет. Используйте «Оплачено», чтобы записать первый
          платёж.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Записанные платежи за сервер</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="p-3">
                  Дата платежа
                </th>
                <th scope="col" className="p-3">
                  Сумма
                </th>
                <th scope="col" className="p-3">
                  Следующая оплата
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">
                    {displayPaymentDate(payment.paymentDate)}
                  </td>
                  <td className="p-3 whitespace-nowrap tabular-nums">
                    {payment.amount} {payment.currency}
                    {payment.cancelledAt && (
                      <p className="text-red-400">
                        Отменён: {payment.cancellationReason}
                      </p>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {displayPaymentDate(payment.nextPaymentDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
