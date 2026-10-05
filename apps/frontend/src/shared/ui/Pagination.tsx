import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import type { Page } from '@/shared/api/pagination'
import { PAGE_SIZES } from '@/shared/lib/pagination'

type Props = {
  result: Omit<Page<unknown>, 'items'>
  onChange: (page: number, pageSize?: number) => void
  label: string
  disabled?: boolean
}

/** Navigate a list with bounded page buttons and an accessible size selector. */
export function Pagination({
  result,
  onChange,
  label,
  disabled = false,
}: Props) {
  const sizeId = useId()
  const { page, pageSize, total, totalPages } = result
  if (total === 0) return null
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right)
  return (
    <nav
      aria-label={`Страницы: ${label}`}
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p role="status" className="text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} из{' '}
        {total}
        <span className="sr-only">
          . Страница {page} из {totalPages}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={sizeId} className="text-muted-foreground">
          На странице
        </label>
        <select
          id={sizeId}
          aria-label={`${label}: записей на странице`}
          disabled={disabled}
          className="h-9 rounded-md border border-input bg-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={pageSize}
          onChange={(event) => onChange(1, Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${label}: предыдущая страница`}
          disabled={disabled || page === 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        {pages.map((value, index) => (
          <span key={value} className="inline-flex items-center gap-2">
            {index > 0 && value - pages[index - 1] > 1 && (
              <span aria-hidden="true" className="text-muted-foreground">
                …
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant={value === page ? 'default' : 'outline'}
              aria-label={`${label}: страница ${value}`}
              aria-current={value === page ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onChange(value)}
            >
              {value}
            </Button>
          </span>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${label}: следующая страница`}
          disabled={disabled || page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
