import { Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'
import type { Prisma } from '../generated/prisma/client'
import type { PrismaService } from '../infra/prisma/prisma.service'

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20
}

export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Count and read one bounded page from the same database snapshot. */
export async function readPage<T>(
  prisma: PrismaService,
  query: PaginationDto,
  count: (tx: Prisma.TransactionClient) => Promise<number>,
  read: (
    tx: Prisma.TransactionClient,
    range: { skip: number; take: number },
  ) => Promise<T[]>,
): Promise<Page<T>> {
  return prisma.$transaction(
    async (tx) => {
      const total = await count(tx)
      const pageSize = query.pageSize ?? 20
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const page = Math.min(query.page ?? 1, totalPages)
      const items = await read(tx, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
      return { items, page, pageSize, total, totalPages }
    },
    { isolationLevel: 'RepeatableRead' },
  )
}

/** Serialize page items while preserving their navigation metadata. */
export function mapPage<T, R>(page: Page<T>, convert: (item: T) => R): Page<R> {
  return { ...page, items: page.items.map(convert) }
}
