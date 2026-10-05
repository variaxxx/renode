import { Pagination } from '@/shared/ui/Pagination'
import { useLocalPagination } from '@/shared/lib/pagination'
import { Disclosure } from '@/components/ui/disclosure'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiRequest } from '@/shared/api/client'
import { downloadCsv, parseCsv } from '@/shared/lib/csv'
import type { Server, ServerInput } from '../api/servers'
import type { Provider } from '@/features/providers/api/providers'
const fields = [
  'providerId',
  'name',
  'purpose',
  'tariff',
  'cost',
  'currency',
  'billingPeriodMonths',
  'nextPaymentDate',
  'rentalEndDate',
  'cancellationDeadline',
  'autoRenew',
  'ipAddress',
  'domain',
  'country',
  'project',
  'tags',
  'note',
] as const
/** Preview and import a CSV catalog without credentials or payment history. */
export function CatalogTransfer({
  loadExport,
  disabled,
  providers,
  onImported,
}: {
  disabled: boolean
  loadExport: () => Promise<Server[]>
  providers: Provider[]
  onImported: () => void
}) {
  const [draft, setDraft] = useState<ServerInput[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [exporting, setExporting] = useState(false)
  const previewPage = useLocalPagination(draft, draft)
  /** Export only ordinary inventory fields for the filtered catalog. */
  async function exportServers() {
    if (exporting) return
    setExporting(true)
    setError('')
    try {
      const servers = await loadExport()
      downloadCsv('renode-servers.csv', [
        fields as unknown as string[],
        ...servers.map((s) =>
          fields.map((k) => (k === 'tags' ? JSON.stringify(s.tags) : s[k])),
        ),
      ])
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось экспортировать серверы.',
      )
    } finally {
      setExporting(false)
    }
  }
  /** Parse the entire CSV and show a preview before any write. */
  async function preview(file: File | undefined) {
    setDraft([])
    setError('')
    setMessage('')
    if (!file) return
    try {
      if (file.size > 1000000)
        throw new Error('Максимальный размер файла — 1 МБ.')
      const rows = parseCsv(await file.text())
      const headers = rows.shift()
      if (!headers || headers.join(',') !== fields.join(','))
        throw new Error('Используйте CSV с колонками из экспорта серверов.')
      if (rows.length < 1 || rows.length > 500)
        throw new Error('Импортируйте от 1 до 500 серверов.')
      setDraft(
        rows.map((row, index) => {
          if (row.length !== fields.length)
            throw new Error(`Неверное число колонок в строке ${index + 2}.`)
          const values = Object.fromEntries(
            headers.map((h, i) => [h, row[i].replace(/^'(?=\s*[=+@-])/, '')]),
          )
          if (!['true', 'false'].includes(values.autoRenew))
            throw new Error(`Проверьте autoRenew в строке ${index + 2}.`)
          const tags: unknown = JSON.parse(values.tags)
          if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))
            throw new Error(`Проверьте tags в строке ${index + 2}.`)
          return {
            ...values,
            billingPeriodMonths: Number(values.billingPeriodMonths),
            autoRenew: values.autoRenew === 'true',
            tags,
            ...Object.fromEntries(
              [
                'rentalEndDate',
                'cancellationDeadline',
                'ipAddress',
                'domain',
                'country',
                'project',
                'note',
              ].map((k) => [k, values[k] || null]),
            ),
          } as ServerInput
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось прочитать CSV.')
    }
  }
  /** Import the reviewed batch atomically, optionally assigning a new provider. */
  async function submit() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await apiRequest('/servers/import', {
        method: 'POST',
        body: JSON.stringify({
          servers: draft.map((s) => ({
            ...s,
            ...(providerId ? { providerId } : {}),
          })),
        }),
      })
      setMessage(`Импортировано серверов: ${draft.length}.`)
      setDraft([])
      onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка импорта.')
    } finally {
      setPending(false)
    }
  }
  return (
    <Disclosure
      className="rounded-xl border border-border bg-card p-4"
      title={<> Импорт и экспорт CSV </>}
    >
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Экспортируются серверы по текущим фильтрам. Пароли и история оплат не
          включаются. Импорт создаёт новые активные записи; повторный импорт
          создаст копии.
        </p>
        <Button
          variant="outline"
          disabled={disabled || exporting}
          onClick={() => void exportServers()}
        >
          {exporting ? 'Экспортируем…' : 'Экспорт серверов'}
        </Button>
        <label className="flex flex-col gap-3 text-sm">
          <span>CSV из экспорта (до 500 строк)</span>
          <Input
            type="file"
            accept=".csv,text/csv"
            disabled={pending}
            onChange={(e) => void preview(e.target.files?.[0])}
          />
        </label>
        {draft.length > 0 && (
          <>
            <label className="flex flex-col gap-3 text-sm">
              <span>Провайдер для импорта</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                disabled={pending}
              >
                <option value="">Сохранить ID из CSV</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Будет создано записей: {draft.length}. Проверьте провайдера и
              сроки.
            </p>
            <ul className="max-h-40 overflow-auto">
              {previewPage.result.items.map((s, i) => (
                <li key={i}>
                  {s.name} · {s.cost} {s.currency} · {s.nextPaymentDate}
                </li>
              ))}
            </ul>
            <Pagination
              result={previewPage.result}
              onChange={previewPage.change}
              label="Предпросмотр импорта"
              disabled={pending}
            />
            <Button disabled={pending} onClick={() => void submit()}>
              {pending ? 'Импортируем…' : 'Подтвердить импорт'}
            </Button>
          </>
        )}
        {error && (
          <p role="alert" className="text-red-400">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </Disclosure>
  )
}
