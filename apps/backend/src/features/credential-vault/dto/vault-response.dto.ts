import type { Ciphertext, VaultMetadata } from '../vault.types'

export class CiphertextResponseDto implements Ciphertext {
  version!: 1
  algorithm!: 'AES-256-GCM'
  nonce!: string
  ciphertext!: string

  /** Serialize only the supported encrypted envelope. */
  static fromCiphertext(value: Ciphertext): CiphertextResponseDto {
    return {
      version: value.version,
      algorithm: value.algorithm,
      nonce: value.nonce,
      ciphertext: value.ciphertext,
    }
  }
}

export class VaultResponseDto implements VaultMetadata {
  version!: 1
  master!: VaultMetadata['master']
  recovery!: VaultMetadata['recovery']

  /** Expose encrypted wrappers and public derivation parameters only. */
  static fromMetadata(value: VaultMetadata): VaultResponseDto {
    return {
      version: value.version,
      master: {
        kdf: value.master.kdf,
        salt: value.master.salt,
        memoryKiB: value.master.memoryKiB,
        iterations: value.master.iterations,
        parallelism: value.master.parallelism,
        wrappedDek: CiphertextResponseDto.fromCiphertext(
          value.master.wrappedDek,
        ),
      },
      recovery: {
        wrappedDek: CiphertextResponseDto.fromCiphertext(
          value.recovery.wrappedDek,
        ),
      },
    }
  }
}
