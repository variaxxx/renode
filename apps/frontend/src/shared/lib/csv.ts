/** Encode CSV fields and neutralize spreadsheet formulas in exported text. */
export function csvText(rows: unknown[][]): string {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? '')
            if (/^\s*[=+@-]/.test(text)) text = "'" + text
            return '"' + text.replaceAll('"', '""') + '"'
          })
          .join(','),
      )
      .join('\r\n')
  )
}
/** Download a UTF-8 CSV artifact and release its object URL. */
export function downloadCsv(name: string, rows: unknown[][]): void {
  const url = URL.createObjectURL(
    new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
/** Parse quoted comma-separated values, including embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"'
        i++
      } else if (quoted) {
        quoted = false
      } else if (value === '') {
        quoted = true
      } else throw new Error('Неверные кавычки CSV.')
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value)
      value = ''
      if (c !== ',') {
        if (c === '\r' && text[i + 1] === '\n') i++
        if (row.some((v) => v !== '')) rows.push(row)
        row = []
      }
    } else value += c
  }
  if (quoted) throw new Error('Незакрытые кавычки CSV.')
  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }
  return rows
}
