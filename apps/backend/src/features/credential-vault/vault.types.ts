export type Ciphertext = {
  version: 1
  algorithm: 'AES-256-GCM'
  nonce: string
  ciphertext: string
}

export type MasterWrapper = {
  kdf: 'Argon2id'
  salt: string
  memoryKiB: number
  iterations: number
  parallelism: number
  wrappedDek: Ciphertext
}

export type VaultMetadata = {
  version: 1
  master: MasterWrapper
  recovery: { wrappedDek: Ciphertext }
}

export type Vault = { id: string; metadata: VaultMetadata }
