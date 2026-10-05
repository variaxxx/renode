/** Format a calendar date without shifting it to the browser timezone. */
export function displayPaymentDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

/** Advance a billing period and clamp dates at the target month's end. */
export function suggestPaymentDate(value: string, months: number): string {
  const source = new Date(`${value}T00:00:00.000Z`)
  const target = new Date(source)
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(source.getUTCDate(), lastDay))
  return target.toISOString().slice(0, 10)
}
