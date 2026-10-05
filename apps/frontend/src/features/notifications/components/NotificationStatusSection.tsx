import { Disclosure } from '@/components/ui/disclosure'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  getNotificationStatus,
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
          <Disclosure title={<> Ближайшие напоминания (до 20) </>}>
            <ul className="mt-3 max-h-80 overflow-auto divide-y divide-border">
              {data.upcoming.map((e) => (
                <li
                  key={`${e.serverId}-${e.eventType}-${e.eventDate}-${e.interval}`}
                  className="py-3"
                >
                  <Link className="underline" to={`/servers/${e.serverId}`}>
                    {e.serverName}
                  </Link>
                  <p>
                    {events[e.eventType]} · {displayPaymentDate(e.eventDate)} ·
                    за {e.interval} дн.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Отправка:{' '}
                    {new Date(e.scheduledAt).toLocaleString('ru-RU', {
                      timeZone: data.timezone,
                    })}
                  </p>
                </li>
              ))}
            </ul>
            {data.upcoming.length === 0 && <p>Будущих напоминаний нет.</p>}
          </Disclosure>
          <Disclosure title={<> Последние события (до 50) </>}>
            <ul className="mt-3 max-h-96 overflow-auto divide-y divide-border">
              {data.deliveries.map((d) => (
                <li className="py-3 space-y-1" key={d.id}>
                  <Link className="underline" to={`/servers/${d.serverId}`}>
                    {d.serverName}
                  </Link>
                  <p>
                    {events[d.eventType]} · {displayPaymentDate(d.eventDate)} ·{' '}
                    {statuses[d.status]} · попыток: {d.attempts}
                  </p>
                  {d.status === 'RETRY' && (
                    <p className="text-sm">
                      Следующая попытка:{' '}
                      {new Date(d.nextAttemptAt).toLocaleString('ru-RU', {
                        timeZone: data.timezone,
                      })}
                    </p>
                  )}
                  {d.lastError && (
                    <p className="text-red-400 text-sm">{d.lastError}</p>
                  )}
                </li>
              ))}
            </ul>
            {data.deliveries.length === 0 && <p>Событий пока нет.</p>}
          </Disclosure>
        </>
      )}
    </section>
  )
}
