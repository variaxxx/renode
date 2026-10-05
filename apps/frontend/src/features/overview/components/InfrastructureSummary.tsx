import {
  Archive,
  ArrowRight,
  CalendarClock,
  Globe2,
  Repeat2,
  Server as ServerIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import type { Server } from '@/features/servers/api/servers'
import type { Provider } from '@/features/providers/api/providers'
import { displayPaymentDate } from '@/features/payments/lib/dates'

type Props = {
  servers: Server[]
  providers: Provider[]
  asOfDate: string
}

/** Summarize inventory and rental deadlines from the current catalog. */
export function InfrastructureSummary({ servers, providers, asOfDate }: Props) {
  const active = servers.filter((server) => server.status === 'ACTIVE')
  const autoRenew = active.filter((server) => server.autoRenew).length
  const distribution = providers
    .map((provider) => ({
      ...provider,
      count: active.filter((server) => server.providerId === provider.id)
        .length,
    }))
    .filter((provider) => provider.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    )
  const windowEnd = new Date(`${asOfDate}T00:00:00Z`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 30)
  const until = windowEnd.toISOString().slice(0, 10)
  const deadlines = active
    .flatMap((server) => [
      { server, date: server.cancellationDeadline, label: 'Срок отмены' },
      { server, date: server.rentalEndDate, label: 'Окончание аренды' },
    ])
    .filter(
      (item): item is typeof item & { date: string } =>
        !!item.date && item.date <= until,
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.server.name.localeCompare(right.server.name),
    )
  const metrics = [
    {
      label: 'Активные серверы',
      value: active.length,
      detail: 'В текущей аренде',
      icon: ServerIcon,
    },
    {
      label: 'Провайдеры',
      value: providers.length,
      detail: `${distribution.length} с активными серверами`,
      icon: Globe2,
    },
    {
      label: 'Автопродление',
      value: autoRenew,
      detail: `${active.length - autoRenew} без автопродления`,
      icon: Repeat2,
    },
    {
      label: 'В архиве',
      value: servers.length - active.length,
      detail: 'Завершённые аренды',
      icon: Archive,
    },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <section
            key={label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {label}
              </h2>
              <Icon
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </section>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Globe2 aria-hidden="true" className="size-5 shrink-0" />
              Серверы по провайдерам
            </h2>
            <Link
              to="/providers"
              aria-label="Перейти к провайдерам"
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          {distribution.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              После добавления активных серверов здесь появится распределение по
              провайдерам.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {distribution.map((provider) => (
                <li key={provider.id}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <Link
                      to="/providers"
                      className="min-w-0 break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {provider.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {provider.count} / {active.length}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-1.5 overflow-hidden rounded-full bg-secondary"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(provider.count / active.length) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0 rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock aria-hidden="true" className="size-5 shrink-0" />
            Сроки аренды и отмены
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Прошедшие сроки и ближайшие 30 дней.
          </p>
          {deadlines.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Нет указанных сроков аренды или отмены, требующих внимания в этом
              периоде.
            </p>
          ) : (
            <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto">
              {deadlines.map(({ server, date, label }) => (
                <li
                  key={`${server.id}-${label}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/servers/${server.id}`}
                      className="text-sm font-medium break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {server.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {label}
                    </p>
                  </div>
                  <span
                    className={`text-sm tabular-nums ${date < asOfDate ? 'text-red-400' : date === asOfDate ? 'text-amber-400' : 'text-muted-foreground'}`}
                  >
                    {displayPaymentDate(date)}
                    {date < asOfDate
                      ? ' · срок прошёл'
                      : date === asOfDate
                        ? ' · сегодня'
                        : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
