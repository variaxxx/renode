import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../infra/prisma/prisma.service'
import type {
  Ciphertext,
  MasterWrapper,
  Vault,
  VaultMetadata,
} from '../vault.types'

@Injectable()
export class VaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Read only the current owner's encrypted vault metadata. */
  async find(ownerId: string): Promise<Vault | null> {
    const row = await this.prisma.vault.findUnique({
      where: { ownerId },
      select: { id: true, metadata: true },
    })
    return row
      ? { id: row.id, metadata: row.metadata as unknown as VaultMetadata }
      : null
  }

  /** Persist only explicitly selected encrypted metadata fields. */
  async create(ownerId: string, metadata: VaultMetadata): Promise<void> {
    await this.prisma.vault.create({ data: { ownerId, metadata } })
  }

  /** Replace the master wrapper atomically while preserving the recovery wrapper. */
  async updateMaster(ownerId: string, master: MasterWrapper): Promise<boolean> {
    const count = await this.prisma.$executeRaw`
      UPDATE "vault" SET "metadata" = jsonb_set("metadata", '{master}', ${JSON.stringify(master)}::jsonb), "updated_at" = CURRENT_TIMESTAMP
      WHERE "owner_id" = ${ownerId}::uuid
    `
    return count === 1
  }

  /** Check the provider relation before reading or writing a secret. */
  async providerExists(providerId: string): Promise<boolean> {
    return (await this.prisma.provider.count({ where: { id: providerId } })) > 0
  }

  /** Read ciphertext only from the owner's vault. */
  async readSecret(
    vaultId: string,
    providerId: string,
  ): Promise<Ciphertext | null> {
    const row = await this.prisma.providerSecret.findFirst({
      where: { vaultId, providerId },
      select: { encrypted: true },
    })
    return row ? (row.encrypted as unknown as Ciphertext) : null
  }

  /** Upsert one provider's authenticated ciphertext without plaintext fields. */
  async writeSecret(
    vaultId: string,
    providerId: string,
    encrypted: Ciphertext,
  ): Promise<void> {
    await this.prisma.providerSecret.upsert({
      where: { providerId },
      create: { vaultId, providerId, encrypted },
      update: { vaultId, encrypted },
    })
  }
}
