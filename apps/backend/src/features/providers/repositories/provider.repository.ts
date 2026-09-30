import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type {
  CreateProviderInput,
  Provider,
  UpdateProviderInput,
} from '../provider.types'

@Injectable()
export class ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** List providers in a stable display order. */
  async findAll(): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    })
  }

  /** Persist a validated provider. */
  async create(input: CreateProviderInput): Promise<Provider> {
    return this.prisma.provider.create({
      data: {
        name: input.name,
        accountUrl: input.accountUrl,
        note: input.note ?? null,
      },
    })
  }

  /** Update a provider by its stable identifier. */
  async update(id: string, input: UpdateProviderInput): Promise<Provider> {
    return this.prisma.provider.update({ where: { id }, data: input })
  }

  /** Delete a provider when database relations allow it. */
  async delete(id: string): Promise<void> {
    await this.prisma.provider.delete({ where: { id } })
  }
}
