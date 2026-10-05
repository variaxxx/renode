import { Pagination } from '@/shared/ui/Pagination'
import { emptyPage, useUrlPagination } from '@/shared/lib/pagination'
import type { Page } from '@/shared/api/pagination'
import { Plus, RefreshCw, Server as ServerIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  listProviders,
  type Provider,
} from '@/features/providers/api/providers'
import {
  createServer,
  getServerPage,
  listServers,
  type Server,
  type ServerFilters,
  type ServerInput,
} from '@/features/servers/api/servers'
import { ServerForm } from '@/features/servers/components/ServerForm'
import { CatalogTransfer } from '@/features/servers/components/CatalogTransfer'
import { countryFlag, countryName } from '@/features/servers/lib/countries'

const selectClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Render a searchable catalog of rented servers. */
export function ServersPage() {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[]>([])
  const [providersError, setProvidersError] = useState('')
  const { query, change } = useUrlPagination()
  const [result, setResult] = useState<Page<Server>>(emptyPage)
  const servers = result.items
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo<ServerFilters>(
    () => ({
      search: searchParams.get('search') ?? '',
      providerId: searchParams.get('providerId') ?? '',
      status: ['ACTIVE', 'ARCHIVED', ''].includes(
        searchParams.get('status') ?? 'ACTIVE',
      )
        ? ((searchParams.get('status') ?? 'ACTIVE') as ServerFilters['status'])
        : 'ACTIVE',
      projectOrTag: searchParams.get('projectOrTag') ?? '',
      sort: (['name', 'payment', 'costAsc', 'costDesc'].includes(
        searchParams.get('sort') ?? '',
      )
        ? searchParams.get('sort')
        : 'name') as ServerFilters['sort'],
    }),
    [searchParams],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSession, setEditorSession] = useState(0)

  /** Load provider names for the filter and server rows. */
  const loadProviders = useCallback(async () => {
    setProvidersError('')
    try {
      setProviders(await listProviders())
    } catch (failure) {
      setProvidersError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось загрузить провайдеров.',
      )
    }
  }, [])

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const page = await getServerPage(filters, query, controller.signal)
        if (!controller.signal.aborted) setResult(page)
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить серверы.',
          )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 200)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [filters, query, refreshKey])

  const providerNames = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers],
  )

  /** Update one filter without resetting the remaining selection. */
  function changeFilter<Key extends keyof ServerFilters>(
    key: Key,
    value: ServerFilters[Key],
  ) {
    setLoading(true)
    const params = new URLSearchParams(searchParams)
    params.set(key, value ?? 'name')
    params.set('page', '1')
    setSearchParams(params, { replace: true })
  }

  /** Save a new server and open its card regardless of active filters. */
  async function handleCreate(input: ServerInput) {
    const created = await createServer(input)
    setEditorOpen(false)
    navigate(`/servers/${created.id}`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Серверы</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Аренда, сроки оплаты и назначение в одном каталоге.
          </p>
        </div>
        <Button
          disabled={providers.length === 0}
          onClick={() => {
            setEditorSession((current) => current + 1)
            setEditorOpen(true)
          }}
        >
          <Plus aria-hidden="true" className="size-4 shrink-0" />
          Добавить сервер
        </Button>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Новый сервер</DialogTitle>
            <DialogDescription>
              Укажите провайдера, назначение, тариф и дату следующей оплаты.
            </DialogDescription>
          </DialogHeader>
          {providers.length > 0 && (
            <ServerForm
              key={editorSession}
              providers={providers}
              onSubmit={handleCreate}
              onCancel={() => setEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <section
        aria-label="Фильтры серверов"
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <label className="flex flex-col gap-3 text-sm">
          <span>Название, IP или домен</span>
          <Input
            type="search"
            value={filters.search}
            onChange={(event) => changeFilter('search', event.target.value)}
            placeholder="Название, IP или домен"
          />
        </label>
        <label className="flex flex-col gap-3 text-sm">
          <span>Провайдер</span>
          <select
            className={selectClass}
            value={filters.providerId}
            onChange={(event) => changeFilter('providerId', event.target.value)}
          >
            <option value="">Все провайдеры</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-3 text-sm">
          <span>Статус</span>
          <select
            className={selectClass}
            value={filters.status}
            onChange={(event) =>
              changeFilter(
                'status',
                event.target.value as ServerFilters['status'],
              )
            }
          >
            <option value="ACTIVE">Активные</option>
            <option value="ARCHIVED">Архивные</option>
            <option value="">Все</option>
          </select>
        </label>
        <label className="flex flex-col gap-3 text-sm">
          <span>Проект или тег</span>
          <Input
            value={filters.projectOrTag}
            onChange={(event) =>
              changeFilter('projectOrTag', event.target.value)
            }
            placeholder="Проект или тег"
          />
        </label>
        <label className="flex flex-col gap-3 text-sm">
          <span>Сортировка</span>
          <select
            className={selectClass}
            value={filters.sort}
            onChange={(e) =>
              changeFilter('sort', e.target.value as ServerFilters['sort'])
            }
          >
            <option value="name">По названию</option>
            <option value="payment">По ближайшей оплате</option>
            <option value="costAsc">Стоимость ↑ (по валютам)</option>
            <option value="costDesc">Стоимость ↓ (по валютам)</option>
          </select>
        </label>
      </section>
      <CatalogTransfer
        providers={providers}
        disabled={loading || !!error}
        loadExport={() => listServers(filters)}
        onImported={() => {
          setRefreshKey((v) => v + 1)
          void loadProviders()
        }}
      />

      {providersError && (
        <p role="alert" className="text-sm text-red-400">
          {providersError}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Загружаем серверы…
        </p>
      ) : error ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Повторить
          </Button>
        </section>
      ) : servers.length === 0 ? (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <ServerIcon
            aria-hidden="true"
            className="mx-auto mb-4 size-8 text-muted-foreground"
          />
          <h2 className="text-lg font-medium">Серверы не найдены</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {filters.search ||
            filters.providerId ||
            filters.projectOrTag ||
            filters.status !== 'ACTIVE'
              ? 'Измените фильтры или добавьте сервер.'
              : 'Добавьте первый сервер, чтобы отслеживать аренду.'}
          </p>
          {providers.length === 0 && !providersError && (
            <Link
              to="/providers"
              className="mt-3 inline-block text-sm underline underline-offset-4"
            >
              Сначала добавьте провайдера
            </Link>
          )}
        </section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {servers.map((server) => (
            <li key={server.id} className="flex min-w-0 flex-col">
              <Link
                to={`/servers/${server.id}`}
                aria-label={`Открыть сервер ${server.name}`}
                className="block flex-1 rounded-xl border border-border bg-card p-5 transition-colors hover:border-ring hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-lg font-semibold break-words">
                      {server.country && (
                        <span
                          role="img"
                          aria-label={countryName(server.country)}
                        >
                          {countryFlag(server.country)}
                        </span>
                      )}
                      {server.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {providerNames.get(server.providerId) ??
                        'Провайдер недоступен'}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                    {server.status === 'ACTIVE' ? 'Активен' : 'Архив'}
                  </span>
                </div>
                <p className="mt-4 text-sm break-words">{server.purpose}</p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span>
                    {server.cost} {server.currency} /{' '}
                    {server.billingPeriodMonths} мес.
                  </span>
                  <span>
                    Следующая оплата: {server.nextPaymentDate ?? 'не указана'}
                  </span>
                </div>
                {(server.project || server.tags.length > 0) && (
                  <p className="mt-3 text-xs text-muted-foreground break-words">
                    {[server.project, ...server.tags]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!error && (
        <Pagination
          result={result}
          onChange={change}
          label="Серверы"
          disabled={loading}
        />
      )}
    </div>
  )
}
