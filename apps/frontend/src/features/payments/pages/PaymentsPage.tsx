import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getLedger, cancelPayment, type LedgerPayment } from '../api/payments'
import { displayPaymentDate } from '../lib/dates'
import {
  listProviders,
  type Provider,
} from '@/features/providers/api/providers'
import { downloadCsv } from '@/shared/lib/csv'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
/** Filter all recorded payments and preserve cancellation audit records. */
export function PaymentsPage() {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    providerId: '',
    project: '',
    currency: '',
  })
  const [providers, setProviders] = useState<Provider[]>([])
  const [payments, setPayments] = useState<LedgerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<LedgerPayment | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    const c = new AbortController()
    setLoading(true)
    setError('')
    void Promise.all([getLedger(filters, c.signal), listProviders()])
      .then(([p, r]) => {
        if (!c.signal.aborted) {
          setPayments(p)
          setProviders(r)
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
    return () => c.abort()
  }, [filters, revision])
  /** Export the currently filtered ledger, including cancellation details. */
  function exportPayments() {
    downloadCsv('renode-payments.csv', [
      [
        'id',
        'server',
        'provider',
        'project',
        'paymentDate',
        'amount',
        'currency',
        'nextPaymentDate',
        'cancelledAt',
        'cancellationReason',
      ],
      ...payments.map((p) => [
        p.id,
        p.serverName,
        p.providerName,
        p.project,
        p.paymentDate,
        p.amount,
        p.currency,
        p.nextPaymentDate,
        p.cancelledAt,
        p.cancellationReason,
      ]),
    ])
  }
  /** Cancel only after the owner supplies a reason and confirms the operation. */
  async function cancel() {
    if (!selected || pending || !reason.trim()) return
    setPending(true)
    setError('')
    try {
      const result = await cancelPayment(selected.id, reason)
      setMessage(
        result.deadlineRestored
          ? 'Платёж отменён. Срок оплаты возвращён к предыдущему.'
          : 'Платёж отменён. Срок оплаты не изменён — проверьте его в карточке сервера.',
      )
      setSelected(null)
      setRevision((v) => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отмены.')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-3xl font-semibold">Платежи</h1>
        <Button
          variant="outline"
          disabled={loading || !!error}
          onClick={exportPayments}
        >
          Экспорт CSV
        </Button>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 rounded-xl border border-border bg-card p-4">
        {(['from', 'to', 'project'] as const).map((key) => (
          <label key={key} className="flex flex-col gap-3 text-sm">
            <span>
              {key === 'from' ? 'С даты' : key === 'to' ? 'По дату' : 'Проект'}
            </span>
            <Input
              type={key === 'project' ? 'text' : 'date'}
              value={filters[key]}
              onChange={(e) =>
                setFilters((f) => ({ ...f, [key]: e.target.value }))
              }
            />
          </label>
        ))}
        <label className="flex flex-col gap-3 text-sm">
          <span>Провайдер</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.providerId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, providerId: e.target.value }))
            }
          >
            <option value="">Все</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-3 text-sm">
          <span>Валюта</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.currency}
            onChange={(e) =>
              setFilters((f) => ({ ...f, currency: e.target.value }))
            }
          >
            {['', 'RUB', 'USD', 'EUR'].map((v) => (
              <option key={v} value={v}>
                {v || 'Все'}
              </option>
            ))}
          </select>
        </label>
      </section>
      {message && (
        <p role="status" className="text-green-400">
          {message}
        </p>
      )}
      {error && (
        <div>
          <p role="alert" className="text-red-400">
            {error}
          </p>
          <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
            Повторить
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status">Загружаем платежи…</p>
      ) : (
        !error && (
          <section className="overflow-x-auto rounded-xl border border-border bg-card p-4">
            {payments.length === 0 ? (
              <p>По этим фильтрам платежей нет.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Общий журнал платежей</caption>
                <thead>
                  <tr>
                    {[
                      'Дата',
                      'Сервер / провайдер',
                      'Проект',
                      'Сумма',
                      'Состояние',
                    ].map((t) => (
                      <th className="p-3" key={t} scope="col">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr className="border-t border-border" key={p.id}>
                      <td className="p-3 whitespace-nowrap">
                        {displayPaymentDate(p.paymentDate)}
                      </td>
                      <td className="p-3">
                        <Link
                          className="underline"
                          to={`/servers/${p.serverId}`}
                        >
                          {p.serverName}
                        </Link>
                        <p className="text-muted-foreground">
                          {p.providerName}
                        </p>
                      </td>
                      <td className="p-3">{p.project || '—'}</td>
                      <td className="p-3 whitespace-nowrap tabular-nums">
                        {p.amount} {p.currency}
                      </td>
                      <td className="p-3">
                        {p.cancelledAt ? (
                          <span className="text-red-400">
                            Отменён: {p.cancellationReason}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelected(p)
                              setReason('')
                            }}
                          >
                            Отменить запись
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null)
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Отмена платежа</DialogTitle>
            <DialogDescription>
              Исходная запись сохранится и будет исключена из расходов. Срок
              оплаты вернётся к предыдущему только для последнего действующего
              платежа, если срок не меняли вручную. После отмены проверьте
              карточку сервера и запишите верную оплату.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-3 text-sm">
            <span>Причина</span>
            <Input
              maxLength={500}
              value={reason}
              disabled={pending}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-red-400">
              {error}
            </p>
          )}
          <Button
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={() => void cancel()}
          >
            {pending ? 'Отменяем…' : 'Подтвердить отмену'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
