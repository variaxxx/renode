import { Injectable } from '@nestjs/common'
import { Prisma, ServerStatus } from '../../../generated/prisma/client'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type {
  Server,
  ServerFilters,
  ServerInput,
  UpdateServerInput,
} from '../server.types'

@Injectable()
export class ServerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find servers using catalog filters in a stable order. */
  async findAll(filters: ServerFilters): Promise<Server[]> {
    const where: Prisma.ServerWhereInput = {
      providerId: filters.providerId,
      status: filters.status,
      name: filters.search
        ? { contains: filters.search, mode: 'insensitive' }
        : undefined,
      OR: filters.projectOrTag
        ? [
            {
              project: { contains: filters.projectOrTag, mode: 'insensitive' },
            },
            { tags: { has: filters.projectOrTag } },
          ]
        : undefined,
    }
    return this.prisma.server.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
  }

  /** Find one server by its stable identifier. */
  async findById(id: string): Promise<Server | null> {
    return this.prisma.server.findUnique({ where: { id } })
  }

  /** Check that a provider exists before assigning it. */
  async providerExists(id: string): Promise<boolean> {
    return (await this.prisma.provider.count({ where: { id } })) > 0
  }

  /** Persist validated server fields. */
  async create(input: ServerInput): Promise<Server> {
    return this.prisma.server.create({
      data: this.toData(input) as Prisma.ServerCreateInput,
    })
  }

  /** Persist validated changes to a server. */
  async update(id: string, input: UpdateServerInput): Promise<Server> {
    return this.prisma.server.update({
      where: { id },
      data: this.toData(input) as Prisma.ServerUpdateInput,
    })
  }

  /** Mark a server archived while retaining its catalog record. */
  async archive(id: string): Promise<Server> {
    return this.prisma.server.update({
      where: { id },
      data: { status: ServerStatus.ARCHIVED },
    })
  }

  /** Delete a server only when it has no recorded payments. */
  async delete(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const paymentTable = await tx.$queryRaw<
        Array<{ exists: string | null }>
      >`SELECT to_regclass('payment')::text AS "exists"`
      if (paymentTable[0]?.exists) {
        const payments = await tx.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM payment WHERE server_id = ${id}::uuid
        `
        if (payments[0]?.count) return false
      }
      await tx.server.delete({ where: { id } })
      return true
    })
  }

  /** Convert API fields to Prisma's persistence shape. */
  private toData(input: UpdateServerInput): Record<string, unknown> {
    const data: Record<string, unknown> = { ...input }
    if (input.providerId !== undefined) {
      delete data.providerId
      data.provider = { connect: { id: input.providerId } }
    }
    for (const key of [
      'nextPaymentDate',
      'rentalEndDate',
      'cancellationDeadline',
    ] as const) {
      if (input[key] !== undefined)
        data[key] = input[key] ? new Date(`${input[key]}T00:00:00.000Z`) : null
    }
    return data
  }
}
