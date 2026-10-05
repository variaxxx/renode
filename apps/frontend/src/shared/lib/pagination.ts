import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Page, PageQuery } from '@/shared/api/pagination'

export const PAGE_SIZES = [10, 20, 50, 100] as const

/** Validate a page number read from the URL. */
function pageNumber(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 && page <= 1000000 ? page : 1
}

/** Preserve catalog navigation and page size in the current URL. */
export function useUrlPagination() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const size = Number(params.get('pageSize'))
  const pageSize = PAGE_SIZES.some((value) => value === size) ? size : 20
  const query = useMemo(() => ({ page, pageSize }), [page, pageSize])
  /** Change pages while retaining all active filters. */
  function change(nextPage: number, nextSize = pageSize) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      next.set('pageSize', String(nextSize))
      return next
    })
  }
  return { query, change }
}

/** Keep independent navigation for an embedded list or history. */
export function usePageQuery(resetKey: unknown = null) {
  const [state, setState] = useState({ page: 1, pageSize: 20, resetKey })
  if (state.resetKey !== resetKey) setState({ ...state, page: 1, resetKey })
  const page = state.resetKey === resetKey ? state.page : 1
  const pageSize = state.pageSize
  const query = useMemo(() => ({ page, pageSize }), [page, pageSize])
  /** Apply navigation without changing the surrounding list. */
  function change(nextPage: number, nextSize = pageSize) {
    setState({ page: nextPage, pageSize: nextSize, resetKey })
  }
  return { query, change }
}

/** Split computed lists without changing totals or aggregate calculations. */
export function useLocalPagination<T>(
  items: T[],
  resetKey: unknown = items.length,
) {
  const { query, change } = usePageQuery(resetKey)
  const totalPages = Math.max(1, Math.ceil(items.length / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const result: Page<T> = {
    items: items.slice((page - 1) * query.pageSize, page * query.pageSize),
    page,
    pageSize: query.pageSize,
    total: items.length,
    totalPages,
  }
  return { result, change }
}

/** Build empty page state before a list request finishes. */
export function emptyPage<T>(
  query: PageQuery = { page: 1, pageSize: 20 },
): Page<T> {
  return { ...query, items: [], total: 0, totalPages: 1 }
}
