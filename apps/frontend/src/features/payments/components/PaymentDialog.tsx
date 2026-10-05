import { CreditCard, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
import { recordPayment } from '../api/payments'
import { suggestPaymentDate } from '../lib/dates'

/** Let the owner review and explicitly confirm a payment snapshot. */
export function PaymentDialog({
  server,
  onClose,
  onSaved,
}: {
  server: Server
  onClose: () => void
  onSaved: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [paymentDate, setPaymentDate] = useState(today)
  const [amount, setAmount] = useState(server.cost)
  const [currency, setCurrency] = useState<Currency>(server.currency)
  const [nextPaymentDate, setNextPaymentDate] = useState(
    suggestPaymentDate(
      server.nextPaymentDate ?? today,
      server.billingPeriodMonths,
    ),
  )
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  /** Save only validated fields after the owner confirms the suggested date. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedAmount = amount.trim().replace(',', '.')
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Введите неотрицательную сумму с точностью до двух знаков.')
      return
    }
    if (!confirmed || pending) return
    setPending(true)
    setError('')
    try {
      await recordPayment(server.id, {
        requestKey,
        paymentDate,
        amount: normalizedAmount,
        currency,
        nextPaymentDate,
      })
      onSaved()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось записать платёж.',
      )
    } finally {
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
          <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
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
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || !confirmed}>
              <CreditCard aria-hidden="true" className="size-4 shrink-0" />
              {pending ? 'Сохраняем…' : 'Подтвердить платёж'}
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
