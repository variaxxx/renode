import { iso31661 } from 'iso-3166'

const displayNames = new Intl.DisplayNames(['ru'], { type: 'region' })

export const countries = iso31661
  .map(({ alpha2, name }) => ({
    code: alpha2,
    name: displayNames.of(alpha2) ?? name,
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'ru'))

/** Convert an ISO alpha-2 code to its Unicode flag emoji. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  )
}

/** Return a localized country name for a stored code. */
export function countryName(code: string): string {
  return countries.find((country) => country.code === code)?.name ?? code
}
