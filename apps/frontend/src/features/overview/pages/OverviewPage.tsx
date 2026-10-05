import {
  ArrowRight,
  CalendarDays,
  Server as ServerIcon,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  getPaymentOverview,
  type PaymentGroup,
  type PaymentOverview,
} from '@/features/payments/api/payments'
import { InfrastructureSummary } from '@/features/overview/components/InfrastructureSummary'
import { listServers, type Server } from '@/features/servers/api/servers'
import {
  listProviders,
  type Provider,
} from '@/features/providers/api/providers'
import { displayPaymentDate } from '@/features/payments/lib/dates'

const MonthlyExpensesChart = lazy(() =>
  import('@/features/overview/components/MonthlyExpensesChart').then(
    (module) => ({ default: module.MonthlyExpensesChart }),
  ),
)

/** Show each currency as its own exact total. */
function CurrencyTotals({ group }: { group: PaymentGroup }) {
  return group.totals.length === 0 ? (
    <p className="text-sm text-muted-foreground">Расходов нет</p>
  ) : (
    <ul className="flex flex-wrap gap-3">
      {group.totals.map(({ currency, amount }) => (
        <li
          key={currency}
          className="rounded-lg bg-secondary px-3 py-2 font-medium tabular-nums"
        >
          {amount}{' '}
          <span className="text-sm text-muted-foreground">{currency}</span>
        </li>
      ))}
    </ul>
  )
}

/** List one deadline window with links to server cards. */
function DeadlineGroup({
  title,
  group,
  overdue = false,
}: {
  title: string
  group: PaymentGroup
  overdue?: boolean
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-6">
      <h2
        className={`mb-4 flex flex-wrap items-center gap-2 text-lg font-semibold ${overdue ? 'text-red-400' : ''}`}
      >
        <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
        {title}{' '}
        <span className="text-sm text-muted-foreground">
          ({group.servers.length})
        </span>
      </h2>
      <CurrencyTotals group={group} />
      {group.servers.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {overdue
            ? 'Просроченных платежей нет.'
            : 'В этом периоде платежей нет.'}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {group.servers.map((server) => (
            <li
              key={server.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="min-w-0">
                <Link
                  to={`/servers/${server.id}`}
                  className="font-medium break-words underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {server.name}
                </Link>
                <p
                  className={`mt-1 text-sm ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}
                >
                  {server.nextPaymentDate &&
                    displayPaymentDate(server.nextPaymentDate)}
                </p>
              </div>
              <span className="text-sm whitespace-nowrap tabular-nums">
                {server.cost} {server.currency}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Render active renewal deadlines and separated currency expenses. */
export function OverviewPage() {
  const [overview, setOverview] = useState<PaymentOverview | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    /** Load a current overview without retaining stale navigation results. */
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [result, catalog, providerCatalog] = await Promise.all([
          getPaymentOverview(controller.signal),
          listServers(
            { search: '', providerId: '', status: '', projectOrTag: '' },
            controller.signal,
          ),
          listProviders(),
        ])
        if (active) {
          setOverview(result)
          setServers(catalog)
          setProviders(providerCatalog)
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить обзор.',
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
  }, [revision])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Обзор</h1>
          <p className="mt-2 text-muted-foreground">
            Серверы, расходы и ближайшие сроки аренды
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/servers">
              <ServerIcon aria-hidden="true" className="size-4" />К серверам
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Обновить
          </Button>
        </div>
      </div>
      <Suspense
        fallback={
          <p role="status" className="text-sm text-muted-foreground">
            Загружаем график…
          </p>
        }
      >
        <MonthlyExpensesChart revision={revision} />
      </Suspense>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Загружаем обзор…
        </p>
      ) : error ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Повторить
          </Button>
        </section>
      ) : (
        overview && (
          <>
            <InfrastructureSummary
              servers={servers}
              providers={providers}
              asOfDate={overview.asOfDate}
            />
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Wallet aria-hidden="true" className="size-5" />
                Ожидаемые расходы по валютам
              </h2>
              <CurrencyTotals group={overview.expected} />
              <p className="mt-4 text-sm text-muted-foreground">
                Стоимость одного текущего периода каждого активного сервера.
                Периоды могут различаться; валюты не пересчитываются.
              </p>
            </section>
            {overview.expected.servers.length === 0 && (
              <section className="rounded-xl border border-dashed border-border p-6">
                <h2 className="font-semibold">Активных серверов пока нет</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Добавьте сервер, чтобы увидеть сроки оплаты и расходы.
                </p>
                <Link
                  to="/servers"
                  className="mt-4 inline-flex items-center gap-2 text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  К серверам{' '}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </section>
            )}
            <p className="text-sm text-muted-foreground">
              На {displayPaymentDate(overview.asOfDate)} (UTC). Ближайшие
              периоды включают сегодня.
            </p>
            {overview.overdue.servers.length > 0 && (
              <DeadlineGroup
                title="Просрочено"
                group={overview.overdue}
                overdue
              />
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <DeadlineGroup
                title="Ближайшие 7 дней"
                group={overview.upcoming7Days}
              />
              <DeadlineGroup
                title="Ближайшие 30 дней"
                group={overview.upcoming30Days}
              />
            </div>
          </>
        )
      )}
    </div>
  )
}
