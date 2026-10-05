export type PageQuery = { page: number; pageSize: number }
export type Page<T> = PageQuery & {
  items: T[]
  total: number
  totalPages: number
}

/** Encode a bounded page request alongside existing filters. */
export function pageParams(query: PageQuery): URLSearchParams {
  return new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
}

/** Read all bounded pages for exports and complete lookup catalogs. */
export async function allPages<T>(
  load: (query: PageQuery) => Promise<Page<T>>,
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const result = await load({ page, pageSize: 100 })
    if (result.page !== page) break
    items.push(...result.items)
    if (page >= result.totalPages) break
  }
  return items
}
