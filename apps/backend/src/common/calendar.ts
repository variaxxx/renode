/** Format today's calendar date in the configured owner timezone. */
export function calendarDate(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
/** Advance a calendar month while clamping the original day to month end. */
export function advanceMonth(value: string, months: number): string {
  const source = new Date(`${value}T00:00:00Z`)
  const target = new Date(source)
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(source.getUTCDate(), last))
  return target.toISOString().slice(0, 10)
}
