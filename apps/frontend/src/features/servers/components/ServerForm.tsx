import { Save, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Provider } from '@/features/providers/api/providers'
import type {
  Currency,
  Server,
  ServerInput,
} from '@/features/servers/api/servers'
import { countries, countryFlag } from '@/features/servers/lib/countries'

type ServerFormProps = {
  providers: Provider[]
  server?: Server
  creatingCopy?: boolean
  onSubmit: (input: ServerInput) => Promise<void>
  onCancel: () => void
}

type Draft = Omit<
  ServerInput,
  | 'billingPeriodMonths'
  | 'tags'
  | 'rentalEndDate'
  | 'cancellationDeadline'
  | 'ipAddress'
  | 'domain'
  | 'country'
  | 'project'
  | 'note'
> & {
  billingPeriodMonths: string
  rentalEndDate: string
  cancellationDeadline: string
  ipAddress: string
  domain: string
  country: string
  project: string
  tags: string
  note: string
}

const selectClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Fill editable fields from a server or a new-server default. */
function initialDraft(
  server: Server | undefined,
  providers: Provider[],
): Draft {
  return {
    providerId: server?.providerId ?? providers[0]?.id ?? '',
    name: server?.name ?? '',
    purpose: server?.purpose ?? '',
    tariff: server?.tariff ?? '',
    cost: server?.cost ?? '',
    currency: server?.currency ?? 'RUB',
    billingPeriodMonths: String(server?.billingPeriodMonths ?? 1),
    nextPaymentDate: server?.nextPaymentDate ?? '',
    rentalEndDate: server?.rentalEndDate ?? '',
    cancellationDeadline: server?.cancellationDeadline ?? '',
    autoRenew: server?.autoRenew ?? false,
    ipAddress: server?.ipAddress ?? '',
    domain: server?.domain ?? '',
    country: server?.country ?? '',
    project: server?.project ?? '',
    tags: server?.tags.join(', ') ?? '',
    note: server?.note ?? '',
  }
}

/** Accept only real calendar dates in the API's date-only format. */
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

/** Collect and validate server catalog fields. */
export function ServerForm({
  providers,
  server,
  creatingCopy = false,
  onSubmit,
  onCancel,
}: ServerFormProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    initialDraft(server, providers),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  /** Update a single draft field without disturbing other entries. */
  function change<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  /** Validate and submit normalized values or show an actionable error. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!providers.some((provider) => provider.id === draft.providerId)) {
      setError('Выберите провайдера.')
      return
    }
    if (!draft.name.trim() || !draft.purpose.trim() || !draft.tariff.trim()) {
      setError('Укажите название, назначение и тариф.')
      return
    }
    if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(draft.cost)) {
      setError(
        'Стоимость должна быть неотрицательной, с точностью до двух знаков.',
      )
      return
    }
    const period = Number(draft.billingPeriodMonths)
    if (!Number.isInteger(period) || period < 1 || period > 120) {
      setError('Период оплаты должен быть от 1 до 120 месяцев.')
      return
    }
    if (!validDate(draft.nextPaymentDate)) {
      setError('Укажите корректную дату следующей оплаты.')
      return
    }
    if (
      (draft.rentalEndDate && !validDate(draft.rentalEndDate)) ||
      (draft.cancellationDeadline && !validDate(draft.cancellationDeadline))
    ) {
      setError('Проверьте даты окончания и отмены аренды.')
      return
    }
    const tags = [
      ...new Set(
        draft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ]
    if (tags.length > 20 || tags.some((tag) => tag.length > 50)) {
      setError('Укажите не больше 20 тегов длиной до 50 символов.')
      return
    }

    const input: ServerInput = {
      providerId: draft.providerId,
      name: draft.name.trim(),
      purpose: draft.purpose.trim(),
      tariff: draft.tariff.trim(),
      cost: draft.cost,
      currency: draft.currency as Currency,
      billingPeriodMonths: period,
      nextPaymentDate: draft.nextPaymentDate,
      rentalEndDate: draft.rentalEndDate || null,
      cancellationDeadline: draft.cancellationDeadline || null,
      autoRenew: draft.autoRenew,
      ipAddress: draft.ipAddress.trim() || null,
      domain: draft.domain.trim() || null,
      country: draft.country || null,
      project: draft.project.trim() || null,
      tags,
      note: draft.note.trim() || null,
    }
    setPending(true)
    try {
      await onSubmit(input)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось сохранить сервер.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 sm:col-span-2">
          <Label htmlFor="server-provider">Провайдер</Label>
          <select
            id="server-provider"
            className={selectClass}
            required
            value={draft.providerId}
            onChange={(event) => change('providerId', event.target.value)}
          >
            <option value="">Выберите провайдера</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-name">Название</Label>
          <Input
            id="server-name"
            autoFocus
            required
            maxLength={160}
            value={draft.name}
            onChange={(event) => change('name', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-purpose">Назначение</Label>
          <Input
            id="server-purpose"
            required
            maxLength={500}
            value={draft.purpose}
            onChange={(event) => change('purpose', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-tariff">Тариф</Label>
          <Input
            id="server-tariff"
            required
            maxLength={160}
            value={draft.tariff}
            onChange={(event) => change('tariff', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-period">Период оплаты, мес.</Label>
          <Input
            id="server-period"
            type="number"
            min={1}
            max={120}
            step={1}
            required
            value={draft.billingPeriodMonths}
            onChange={(event) =>
              change('billingPeriodMonths', event.target.value)
            }
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-cost">Стоимость</Label>
          <Input
            id="server-cost"
            inputMode="decimal"
            required
            placeholder="0.00"
            value={draft.cost}
            onChange={(event) => change('cost', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-currency">Валюта</Label>
          <select
            id="server-currency"
            className={selectClass}
            value={draft.currency}
            onChange={(event) =>
              change('currency', event.target.value as Currency)
            }
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-next-payment">Следующая оплата</Label>
          <Input
            id="server-next-payment"
            type="date"
            required
            value={draft.nextPaymentDate}
            onChange={(event) => change('nextPaymentDate', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-end-date">
            Окончание аренды (необязательно)
          </Label>
          <Input
            id="server-end-date"
            type="date"
            value={draft.rentalEndDate}
            onChange={(event) => change('rentalEndDate', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-cancel-date">
            Срок отмены (необязательно)
          </Label>
          <Input
            id="server-cancel-date"
            type="date"
            value={draft.cancellationDeadline}
            onChange={(event) =>
              change('cancellationDeadline', event.target.value)
            }
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <input
            id="server-auto-renew"
            type="checkbox"
            className="size-4 accent-primary"
            checked={draft.autoRenew}
            onChange={(event) => change('autoRenew', event.target.checked)}
          />
          <Label htmlFor="server-auto-renew">Автопродление включено</Label>
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-ip">IP (необязательно)</Label>
          <Input
            id="server-ip"
            maxLength={45}
            value={draft.ipAddress}
            onChange={(event) => change('ipAddress', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-domain">Домен (необязательно)</Label>
          <Input
            id="server-domain"
            maxLength={253}
            value={draft.domain}
            onChange={(event) => change('domain', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-country">Страна (необязательно)</Label>
          <select
            id="server-country"
            className={selectClass}
            value={draft.country}
            onChange={(event) => change('country', event.target.value)}
          >
            <option value="">Не выбрана</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {countryFlag(country.code)} {country.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-project">Проект (необязательно)</Label>
          <Input
            id="server-project"
            maxLength={160}
            value={draft.project}
            onChange={(event) => change('project', event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="server-tags">Теги через запятую</Label>
          <Input
            id="server-tags"
            value={draft.tags}
            onChange={(event) => change('tags', event.target.value)}
          />
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Label htmlFor="server-note">Заметка (необязательно)</Label>
          <Textarea
            id="server-note"
            maxLength={4000}
            value={draft.note}
            onChange={(event) => change('note', event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Заметка не шифруется. Не храните здесь пароли.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" className="size-4 shrink-0" />
          {pending
            ? 'Сохраняем…'
            : server && !creatingCopy
              ? 'Сохранить изменения'
              : 'Добавить сервер'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          <X aria-hidden="true" className="size-4 shrink-0" />
          Отмена
        </Button>
      </div>
    </form>
  )
}
