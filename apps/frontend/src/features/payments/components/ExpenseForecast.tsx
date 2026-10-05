import { Pagination } from '@/shared/ui/Pagination'
import { useLocalPagination } from '@/shared/lib/pagination'
import { Disclosure } from '@/components/ui/disclosure'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { getForecast, type Forecast } from '../api/payments'
import { displayPaymentDate } from '../lib/dates'
/** Show normalized current tariffs and the next twelve months of renewals. */
export function ExpenseForecast({ revision }: { revision: number }) {
  const [data, setData] = useState<Forecast | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const eventPages = useLocalPagination(data?.events ?? [], data)
  const monthPages = useLocalPagination(data?.months ?? [], data)
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    void getForecast(controller.signal)
      .then((d) => {
        if (!controller.signal.aborted) setData(d)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [revision, retry])
  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold">План расходов</h2>
      {error ? (
        <>
          <p role="alert" className="text-red-400">
            {error}
          </p>
          <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
            Повторить
          </Button>
        </>
      ) : !data ? (
        <p role="status">Загружаем прогноз…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Месячный эквивалент текущих тарифов
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.monthlyEquivalent.map((t) => (
              <div
                key={t.currency}
                className="rounded-lg border border-border bg-background/50 p-4"
              >
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {t.currency}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums break-all">
                    {new Intl.NumberFormat('ru-RU', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Number(t.amount))}
                  </span>
                  <span className="text-sm text-muted-foreground">/ мес.</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Прогноз предполагает продление до окончания аренды или срока отмены.
            Тарифы и валюты сохраняются.
          </p>
          <Disclosure title={<> Прогноз по месяцам </>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    {['Месяц', 'RUB', 'USD', 'EUR'].map((t) => (
                      <th className="p-2" key={t} scope="col">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthPages.result.items.map((m) => (
                    <tr key={m.month} className="border-t border-border">
                      {[m.month, m.RUB, m.USD, m.EUR].map((t, i) => (
                        <td
                          className={`p-2 tabular-nums ${i > 0 ? 'font-semibold' : 'text-muted-foreground'}`}
                          key={i}
                        >
                          {t}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              result={monthPages.result}
              onChange={monthPages.change}
              label="Прогноз по месяцам"
            />
          </Disclosure>
          <Disclosure
            title={<> Календарь будущих оплат ({data.events.length}) </>}
          >
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {eventPages.result.items.map((e) => (
                <li
                  key={`${e.serverId}-${e.date}`}
                  className="py-3 flex flex-wrap justify-between gap-3"
                >
                  <Link className="underline" to={`/servers/${e.serverId}`}>
                    {e.name}
                  </Link>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-sm text-muted-foreground">
                      {displayPaymentDate(e.date)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {e.amount} {e.currency}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              result={eventPages.result}
              onChange={eventPages.change}
              label="Календарь будущих оплат"
            />
            {data.events.length === 0 && <p>Будущих оплат нет.</p>}
          </Disclosure>
        </>
      )}
    </section>
  )
}
