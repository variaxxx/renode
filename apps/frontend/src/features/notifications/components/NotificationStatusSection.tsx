import { Pagination } from '@/shared/ui/Pagination'
import { emptyPage, usePageQuery } from '@/shared/lib/pagination'
import type { Page } from '@/shared/api/pagination'
import { Disclosure } from '@/components/ui/disclosure'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  getNotificationStatus,
  getNotificationDeliveries,
  getUpcomingReminders,
  type NotificationDelivery,
  type UpcomingReminder,
  type NotificationStatus,
} from '../api/notifications'
import { displayPaymentDate } from '@/features/payments/lib/dates'
const statuses: Record<string, string> = {
  PENDING: 'Ожидает',
  RETRY: 'Повтор',
  SENT: 'Отправлено',
  FAILED: 'Ошибка',
}
const events: Record<string, string> = {
  PAYMENT: 'Оплата',
  RENTAL_END: 'Окончание аренды',
  CANCELLATION: 'Срок отмены',
}
/** Show worker liveness, pending work and recent delivery errors. */
export function NotificationStatusSection() {
  const [data, setData] = useState<NotificationStatus | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    setError('')
    void getNotificationStatus(c.signal)
      .then((d) => {
        if (!c.signal.aborted) setData(d)
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message)
      })
    return () => c.abort()
  }, [revision])
  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold">Доставка напоминаний</h2>
        <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
          Обновить
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Загружаем состояние…</p>
      ) : (
        <>
          <p className={data.workerAlive ? 'text-green-400' : 'text-amber-400'}>
            {data.workerAlive
              ? 'Воркер работает'
              : 'Нет свежего сигнала воркера: проверьте процесс и конфигурацию Telegram'}
          </p>
          <p className="text-sm text-muted-foreground">
            Часовой пояс: {data.timezone}. Последний цикл:{' '}
            {data.heartbeat
              ? new Date(data.heartbeat.lastCycleAt).toLocaleString('ru-RU', {
                  timeZone: data.timezone,
                })
              : '—'}
            . Последняя успешная доставка:{' '}
            {data.lastSentAt
              ? new Date(data.lastSentAt).toLocaleString('ru-RU', {
                  timeZone: data.timezone,
                })
              : '—'}
            .
          </p>
          {data.heartbeat?.lastError && (
            <p className="text-red-400">{data.heartbeat.lastError}</p>
          )}
          <div className="flex flex-wrap gap-4">
            {data.counts.map((c) => (
              <span key={c.status}>
                {statuses[c.status]}: {c.count}
              </span>
            ))}
          </div>
          <NotificationList
            mode="upcoming"
            timezone={data.timezone}
            revision={revision}
          />
          <NotificationList
            mode="deliveries"
            timezone={data.timezone}
            revision={revision}
          />
        </>
      )}
    </section>
  )
}

/** Load independent pages for future reminders and the complete delivery history. */
function NotificationList({
  mode,
  timezone,
  revision,
}: {
  mode: 'upcoming' | 'deliveries'
  timezone: string
  revision: number
}) {
  const { query, change } = usePageQuery(`${mode}:${revision}`)
  const [result, setResult] =
    useState<Page<UpcomingReminder | NotificationDelivery>>(emptyPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const title =
    mode === 'upcoming' ? 'Ближайшие напоминания' : 'История доставки'
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const request =
      mode === 'upcoming'
        ? getUpcomingReminders(query, controller.signal)
        : getNotificationDeliveries(query, controller.signal)
    void request
      .then((page) => {
        if (!controller.signal.aborted) setResult(page)
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить список.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [mode, query, revision, retry])
  return (
    <Disclosure
      title={
        <>
          {title} ({result.total})
        </>
      }
    >
      {loading ? (
        <p role="status" className="mt-3 text-muted-foreground">
          Загружаем…
        </p>
      ) : error ? (
        <div className="mt-3 space-y-3">
          <p role="alert" className="text-red-400">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={() => setRetry((value) => value + 1)}
          >
            Повторить
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border">
            {result.items.map((item) => (
              <li
                key={
                  'id' in item
                    ? item.id
                    : `${item.serverId}-${item.eventType}-${item.eventDate}-${item.interval}`
                }
                className="py-3 space-y-1"
              >
                <Link className="underline" to={`/servers/${item.serverId}`}>
                  {item.serverName}
                </Link>
                {'status' in item ? (
                  <>
                    <p>
                      {events[item.eventType]} ·{' '}
                      {displayPaymentDate(item.eventDate)} ·{' '}
                      {statuses[item.status]} · попыток: {item.attempts}
                    </p>
                    {item.status === 'RETRY' && (
                      <p className="text-sm">
                        Следующая попытка:{' '}
                        {new Date(item.nextAttemptAt).toLocaleString('ru-RU', {
                          timeZone: timezone,
                        })}
                      </p>
                    )}
                    {item.lastError && (
                      <p className="text-red-400 text-sm">{item.lastError}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      {events[item.eventType]} ·{' '}
                      {displayPaymentDate(item.eventDate)} · за {item.interval}{' '}
                      дн.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Отправка:{' '}
                      {new Date(item.scheduledAt).toLocaleString('ru-RU', {
                        timeZone: timezone,
                      })}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
          {result.total === 0 && (
            <p className="mt-3">
              {mode === 'upcoming'
                ? 'Будущих напоминаний нет.'
                : 'Событий пока нет.'}
            </p>
          )}
        </>
      )}
      {!error && (
        <Pagination
          result={result}
          onChange={change}
          label={title}
          disabled={loading}
        />
      )}
    </Disclosure>
  )
}
