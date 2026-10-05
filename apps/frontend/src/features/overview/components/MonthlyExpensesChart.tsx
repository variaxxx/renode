import { Pagination } from '@/shared/ui/Pagination'
import { useLocalPagination } from '@/shared/lib/pagination'
import { Disclosure } from '@/components/ui/disclosure'
import { useEffect, useState } from 'react'
import { ChartColumn, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getMonthlyExpenses,
  type MonthlyExpenses,
} from '@/features/payments/api/payments'
import type { Currency } from '@/features/servers/api/servers'

const chartConfig = {
  amount: { label: 'Оплачено', color: 'var(--chart-1)' },
} satisfies ChartConfig
const currencies: Currency[] = ['RUB', 'USD', 'EUR']

/** Format calendar month labels without depending on the local timezone. */
function monthLabel(month: string, short = false) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: short ? 'short' : 'long',
    year: short ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`))
}

/** Render recorded monthly hosting payments with separate currency views. */
export function MonthlyExpensesChart({ revision }: { revision: number }) {
  const [expenses, setExpenses] = useState<MonthlyExpenses | null>(null)
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    /** Refresh chart data while ignoring responses from an unmounted view. */
    async function load() {
      setLoading(true)
      setError('')
      try {
        const result = await getMonthlyExpenses(controller.signal)
        if (!controller.signal.aborted) setExpenses(result)
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить расходы.',
          )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [revision, retry])
  const data =
    expenses?.months.map((item) => ({
      month: item.month,
      amount: Number(item[currency]),
    })) ?? []
  const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency })
  const hasPayments = data.some((item) => item.amount > 0)
  const monthPages = useLocalPagination(
    data,
    `${currency}:${expenses?.asOfDate}`,
  )

  return (
    <section
      aria-labelledby="monthly-expenses-title"
      className="min-w-0 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="monthly-expenses-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <ChartColumn aria-hidden="true" className="size-5 shrink-0" />
            Расходы на хостинг по месяцам
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Фактические платежи за последние 12 месяцев. Текущий месяц ещё не
            завершён.
          </p>
        </div>
        <div
          role="group"
          aria-label="Валюта графика"
          className="flex gap-1 rounded-lg bg-secondary p-1"
        >
          {currencies.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={currency === value ? 'default' : 'secondary'}
              aria-pressed={currency === value}
              onClick={() => setCurrency(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>
      {loading ? (
        <p
          role="status"
          className="flex h-64 items-center justify-center text-sm text-muted-foreground"
        >
          Загружаем расходы…
        </p>
      ) : error ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Повторить
          </Button>
        </div>
      ) : (
        <>
          <ChartContainer
            config={chartConfig}
            className="mt-6 h-64 w-full aspect-auto sm:h-80"
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={16}
                tickFormatter={(value: string) => monthLabel(value, true)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat('ru-RU', {
                    notation: 'compact',
                  }).format(value)
                }
                domain={[0, 'auto']}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => monthLabel(String(label))}
                    formatter={(value) => (
                      <span className="font-medium tabular-nums">
                        {money.format(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
          {!hasPayments && (
            <p className="mt-4 text-sm text-muted-foreground">
              За этот период нет записанных платежей в {currency}. Добавьте
              платёж через «Оплачено» в карточке сервера.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            {data.length > 0 &&
              `${monthLabel(data[0].month)} — ${monthLabel(data[data.length - 1].month)}. `}
            Включены платежи архивных серверов. Валюты не пересчитываются.
          </p>
          <Disclosure
            className="mt-4 text-sm"
            title={<> Показать суммы по месяцам </>}
          >
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">
                  Расходы на хостинг в {currency}
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 font-medium">
                      Месяц
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Оплачено
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthPages.result.items.map((item) => (
                    <tr key={item.month} className="border-b border-border">
                      <th scope="row" className="py-2 font-normal">
                        {monthLabel(item.month)}
                      </th>
                      <td className="py-2 text-right tabular-nums">
                        {money.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              result={monthPages.result}
              onChange={monthPages.change}
              label="Расходы по месяцам"
            />
          </Disclosure>
        </>
      )}
    </section>
  )
}
