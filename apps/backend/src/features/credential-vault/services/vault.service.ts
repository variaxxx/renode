import { Injectable } from '@nestjs/common'
import { ProviderNotFoundError } from '../../providers/provider.errors'
import { VaultRepository } from '../repositories/vault.repository'
import { VaultError } from '../vault.errors'
import type {
  Ciphertext,
  MasterWrapper,
  Vault,
  VaultMetadata,
} from '../vault.types'

@Injectable()
export class VaultService {
  constructor(private readonly vaults: VaultRepository) {}

  /** Return encrypted metadata or null before vault setup. */
  async read(ownerId: string): Promise<VaultMetadata | null> {
    return (await this.vaults.find(ownerId))?.metadata ?? null
  }

  /** Create a vault once without accepting any unlock secrets. */
  async create(ownerId: string, input: VaultMetadata): Promise<VaultMetadata> {
    const metadata: VaultMetadata = {
      version: input.version,
      master: this.masterFields(input.master),
      recovery: {
        wrappedDek: this.ciphertextFields(input.recovery.wrappedDek),
      },
    }
    try {
      await this.vaults.create(ownerId, metadata)
    } catch (error) {
      if (this.hasCode(error, 'P2002'))
        throw new VaultError(
          'VAULT_ALREADY_EXISTS',
          409,
          'Vault already exists',
        )
      throw error
    }
    return metadata
  }

  /** Update the master wrapper for both password changes and recovery. */
  async updateMaster(
    ownerId: string,
    master: MasterWrapper,
  ): Promise<VaultMetadata> {
    if (!(await this.vaults.updateMaster(ownerId, this.masterFields(master))))
      throw this.notFound()
    return (await this.requireVault(ownerId)).metadata
  }

  /** Return an encrypted provider password without unlocking it on the server. */
  async readSecret(
    ownerId: string,
    providerId: string,
  ): Promise<Ciphertext | null> {
    const vault = await this.requireVault(ownerId)
    await this.requireProvider(providerId)
    return this.vaults.readSecret(vault.id, providerId)
  }

  /** Save only the supported ciphertext envelope for an existing provider. */
  async writeSecret(
    ownerId: string,
    providerId: string,
    input: Ciphertext,
  ): Promise<void> {
    const vault = await this.requireVault(ownerId)
    await this.requireProvider(providerId)
    try {
      await this.vaults.writeSecret(
        vault.id,
        providerId,
        this.ciphertextFields(input),
      )
    } catch (error) {
      if (this.hasCode(error, 'P2003')) throw new ProviderNotFoundError()
      throw error
    }
  }

  /** Require vault setup before storing secrets or changing wrappers. */
  private async requireVault(ownerId: string): Promise<Vault> {
    const vault = await this.vaults.find(ownerId)
    if (!vault) throw this.notFound()
    return vault
  }

  /** Reject secret access for a missing provider. */
  private async requireProvider(providerId: string): Promise<void> {
    if (!(await this.vaults.providerExists(providerId)))
      throw new ProviderNotFoundError()
  }

  /** Select ciphertext fields explicitly to exclude accidental plaintext properties. */
  private ciphertextFields(value: Ciphertext): Ciphertext {
    return {
      version: value.version,
      algorithm: value.algorithm,
      nonce: value.nonce,
      ciphertext: value.ciphertext,
    }
  }

  /** Select only public derivation parameters and the encrypted DEK. */
  private masterFields(value: MasterWrapper): MasterWrapper {
    return {
      kdf: value.kdf,
      salt: value.salt,
      memoryKiB: value.memoryKiB,
      iterations: value.iterations,
      parallelism: value.parallelism,
      wrappedDek: this.ciphertextFields(value.wrappedDek),
    }
  }

  /** Use a stable missing-vault error. */
  private notFound(): VaultError {
    return new VaultError('VAULT_NOT_FOUND', 404, 'Set up the vault first')
  }

  /** Recognize expected persistence failures without swallowing other errors. */
  private hasCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    )
  }
}
