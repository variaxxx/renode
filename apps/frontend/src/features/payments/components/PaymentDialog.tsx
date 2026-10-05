import { CreditCard, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Currency, Server } from '@/features/servers/api/servers'
import { ApiError } from '@/shared/api/client'
import {
  readPendingPayment,
  savePendingPayment,
  clearPendingPayment,
} from '../lib/pending-payment'
import {
  getPaymentCalendar,
  recordPayment,
  type PaymentInput,
} from '../api/payments'
import { suggestPaymentDate } from '../lib/dates'

type Props = {
  server: Server
  onClose: () => void
  onSaved: () => void
}

/** Load the owner date and recover unresolved requests before enabling entry. */
export function PaymentDialog(props: Props) {
  const [initial, setInitial] = useState<{
    today: string
    attempt: PaymentInput | null
  } | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setInitial(null)
    setError('')
    void getPaymentCalendar(controller.signal)
      .then(({ asOfDate }) => {
        if (!controller.signal.aborted)
          setInitial({
            today: asOfDate,
            attempt: readPendingPayment(props.server.id),
          })
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить дату платежа.',
          )
      })
    return () => controller.abort()
  }, [props.server.id, retry])
  if (initial)
    return <PaymentEntry key={props.server.id} {...props} {...initial} />
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запись платежа</DialogTitle>
          <DialogDescription>
            Загружаем дату и проверяем незавершённый запрос.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
            <Button onClick={() => setRetry((value) => value + 1)}>
              Повторить
            </Button>
          </>
        ) : (
          <p role="status">Загружаем…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Freeze an attempted payment until its original request is resolved. */
function PaymentEntry({
  server,
  onClose,
  onSaved,
  today,
  attempt: initialAttempt,
}: Props & {
  today: string
  attempt: PaymentInput | null
}) {
  const [attempt, setAttempt] = useState(initialAttempt)
  const [paymentDate, setPaymentDate] = useState(
    initialAttempt?.paymentDate ?? today,
  )
  const [amount, setAmount] = useState(initialAttempt?.amount ?? server.cost)
  const [currency, setCurrency] = useState<Currency>(
    initialAttempt?.currency ?? server.currency,
  )
  const [nextPaymentDate, setNextPaymentDate] = useState(
    initialAttempt?.nextPaymentDate ??
      suggestPaymentDate(
        server.nextPaymentDate ?? today,
        server.billingPeriodMonths,
      ),
  )
  const [requestKey, setRequestKey] = useState(
    () => initialAttempt?.requestKey ?? crypto.randomUUID(),
  )
  const [confirmed, setConfirmed] = useState(Boolean(initialAttempt))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  /** Save only validated fields after the owner confirms the suggested date. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedAmount = amount.trim().replace(',', '.')
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Введите неотрицательную сумму с точностью до двух знаков.')
      return
    }
    if (!confirmed || inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError('')
    try {
      const input = attempt ?? {
        requestKey,
        paymentDate,
        amount: normalizedAmount,
        currency,
        nextPaymentDate,
      }
      savePendingPayment(server.id, input)
      setAttempt(input)
      await recordPayment(server.id, input)
      clearPendingPayment(server.id)
      onSaved()
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        [400, 404, 429].includes(failure.status ?? 0)
      ) {
        clearPendingPayment(server.id)
        setAttempt(null)
        setRequestKey(crypto.randomUUID())
        setConfirmed(false)
      }
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось записать платёж.',
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Оплачено: {server.name}</DialogTitle>
          <DialogDescription>
            Запишите фактический платёж и проверьте новую дату оплаты. Дата
            окончания аренды не изменится.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <fieldset
            disabled={pending || Boolean(attempt)}
            className="grid gap-5 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="payment-date">Дата платежа</Label>
              <Input
                id="payment-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value)
                  setRequestKey(crypto.randomUUID())
                  setConfirmed(false)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Сумма</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setRequestKey(crypto.randomUUID())
                  setConfirmed(false)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-currency">Валюта</Label>
              <select
                id="payment-currency"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as Currency)
                  setRequestKey(crypto.randomUUID())
                  setConfirmed(false)
                }}
              >
                {['RUB', 'USD', 'EUR'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-next-date">Следующая оплата</Label>
              <Input
                id="payment-next-date"
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => {
                  setNextPaymentDate(e.target.value)
                  setRequestKey(crypto.randomUUID())
                  setConfirmed(false)
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Предложение рассчитано от текущей даты оплаты на{' '}
              {server.billingPeriodMonths} мес. Вы можете изменить его.
            </p>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id="payment-confirm"
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="size-4 shrink-0 accent-primary"
              />
              <Label htmlFor="payment-confirm">
                Подтверждаю сумму, валюту и новую дату оплаты
              </Label>
            </div>
          </fieldset>
          {attempt && (
            <p role="status" className="text-sm text-muted-foreground">
              Этот запрос ожидает подтверждения. Повторите его с исходными
              данными, чтобы проверить результат без дублирования платежа. После
              подтверждения исправления можно внести через отмену записи.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || !confirmed}>
              <CreditCard aria-hidden="true" className="size-4 shrink-0" />
              {pending
                ? 'Сохраняем…'
                : attempt
                  ? 'Проверить и завершить платёж'
                  : 'Подтвердить платёж'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-4 shrink-0" />
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
