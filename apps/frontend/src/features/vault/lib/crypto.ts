import { argon2id } from 'hash-wasm'

const VERSION = 1 as const
const ALGORITHM = 'AES-256-GCM' as const
const KDF = 'Argon2id' as const
const KEY_BYTES = 32
const NONCE_BYTES = 12
const SALT_BYTES = 16
const KDF_MEMORY_KIB = 64 * 1024
const KDF_ITERATIONS = 3
const KDF_PARALLELISM = 1

export type Ciphertext = {
  version: typeof VERSION
  algorithm: typeof ALGORITHM
  nonce: string
  ciphertext: string
}

type MasterKdf = {
  kdf: typeof KDF
  salt: string
  memoryKiB: number
  iterations: number
  parallelism: number
}

export type VaultMetadata = {
  version: typeof VERSION
  master: MasterKdf & { wrappedDek: Ciphertext }
  recovery: {
    wrappedDek: Ciphertext
  }
}

let activeDek: CryptoKey | null = null
let operationGeneration = 0
const listeners = new Set<() => void>()

// Copy bytes into a Web Crypto compatible buffer.
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

// Encode binary fields without browser storage or Node buffers.
function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

// Reject malformed and noncanonical encoded fields.
function decodeBytes(value: string, length?: number): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('Invalid encoded vault data')
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(atob(padded), (character) =>
      character.charCodeAt(0),
    )
  } catch {
    throw new Error('Invalid encoded vault data')
  }
  if (
    encodeBytes(bytes) !== value ||
    (length !== undefined && bytes.length !== length)
  ) {
    throw new Error('Invalid encoded vault data')
  }
  return bytes
}

// Generate a fresh cryptographic random value.
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

// Import a raw AES key without permitting later export.
async function importAesKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBuffer(bytes), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

// Bind ciphertext to its purpose and record identifier.
function associatedData(purpose: string): ArrayBuffer {
  return toBuffer(new TextEncoder().encode(`renode:v${VERSION}:${purpose}`))
}

// Encrypt with a new nonce for every AES-GCM operation.
async function seal(
  key: CryptoKey,
  plaintext: Uint8Array,
  purpose: string,
): Promise<Ciphertext> {
  const nonce = randomBytes(NONCE_BYTES)
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toBuffer(nonce),
      additionalData: associatedData(purpose),
    },
    key,
    toBuffer(plaintext),
  )
  return {
    version: VERSION,
    algorithm: ALGORITHM,
    nonce: encodeBytes(nonce),
    ciphertext: encodeBytes(new Uint8Array(ciphertext)),
  }
}

// Authenticate both the ciphertext and its record binding before returning data.
async function open(
  key: CryptoKey,
  value: Ciphertext,
  purpose: string,
): Promise<Uint8Array> {
  if (value.version !== VERSION || value.algorithm !== ALGORITHM) {
    throw new Error('Unsupported vault ciphertext format')
  }
  const nonce = decodeBytes(value.nonce, NONCE_BYTES)
  const ciphertext = decodeBytes(value.ciphertext)
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toBuffer(nonce),
        additionalData: associatedData(purpose),
      },
      key,
      toBuffer(ciphertext),
    )
    return new Uint8Array(plaintext)
  } catch {
    throw new Error('Vault authentication failed')
  }
}

// Derive an AES key from the master password and stored Argon2id parameters.
async function deriveMasterKey(
  password: string,
  master: MasterKdf,
): Promise<CryptoKey> {
  if (
    master.kdf !== KDF ||
    master.memoryKiB !== KDF_MEMORY_KIB ||
    master.iterations !== KDF_ITERATIONS ||
    master.parallelism !== KDF_PARALLELISM
  ) {
    throw new Error('Unsupported vault key derivation format')
  }
  const derived = await argon2id({
    password,
    salt: decodeBytes(master.salt, SALT_BYTES),
    memorySize: master.memoryKiB,
    iterations: master.iterations,
    parallelism: master.parallelism,
    hashLength: KEY_BYTES,
    outputType: 'binary',
  })
  try {
    return await importAesKey(derived)
  } finally {
    derived.fill(0)
  }
}

// Install a DEK only if no later lock or unlock superseded this operation.
async function activateDek(dek: Uint8Array, generation: number): Promise<void> {
  if (dek.length !== KEY_BYTES) throw new Error('Invalid vault key')
  const key = await importAesKey(dek)
  if (operationGeneration !== generation)
    throw new Error('Vault operation cancelled')
  activeDek = key
  notifyVault()
}

// Create independent master and recovery wrappers around one random DEK.
export async function createVault(masterPassword: string): Promise<{
  metadata: VaultMetadata
  recoveryKey: string
}> {
  lockVault()
  const generation = operationGeneration
  if (!masterPassword) throw new Error('Master password is required')
  const dek = randomBytes(KEY_BYTES)
  const recovery = randomBytes(KEY_BYTES)
  const salt = randomBytes(SALT_BYTES)
  const master: MasterKdf = {
    kdf: KDF,
    salt: encodeBytes(salt),
    memoryKiB: KDF_MEMORY_KIB,
    iterations: KDF_ITERATIONS,
    parallelism: KDF_PARALLELISM,
  }
  try {
    const masterKey = await deriveMasterKey(masterPassword, master)
    const recoveryKey = await importAesKey(recovery)
    const wrappedByMaster = await seal(masterKey, dek, 'dek:master')
    const wrappedByRecovery = await seal(recoveryKey, dek, 'dek:recovery')
    await activateDek(dek, generation)
    return {
      metadata: {
        version: VERSION,
        master: { ...master, wrappedDek: wrappedByMaster },
        recovery: { wrappedDek: wrappedByRecovery },
      },
      recoveryKey: encodeBytes(recovery),
    }
  } finally {
    dek.fill(0)
    recovery.fill(0)
  }
}

// Unlock the tab with the master password without persisting the DEK.
export async function unlockWithMasterPassword(
  masterPassword: string,
  metadata: VaultMetadata,
): Promise<void> {
  lockVault()
  const generation = operationGeneration
  if (metadata.version !== VERSION) throw new Error('Unsupported vault format')
  const key = await deriveMasterKey(masterPassword, metadata.master)
  const dek = await open(key, metadata.master.wrappedDek, 'dek:master')
  try {
    await activateDek(dek, generation)
  } finally {
    dek.fill(0)
  }
}

// Unlock the tab with the independent recovery key.
export async function unlockWithRecoveryKey(
  recoveryKey: string,
  metadata: VaultMetadata,
): Promise<void> {
  lockVault()
  const generation = operationGeneration
  if (metadata.version !== VERSION) throw new Error('Unsupported vault format')
  const keyBytes = decodeBytes(recoveryKey, KEY_BYTES)
  let key: CryptoKey
  try {
    key = await importAesKey(keyBytes)
  } finally {
    keyBytes.fill(0)
  }
  const dek = await open(key, metadata.recovery.wrappedDek, 'dek:recovery')
  try {
    await activateDek(dek, generation)
  } finally {
    dek.fill(0)
  }
}

// Remove the tab's only reference to the open DEK.
export function lockVault(): void {
  activeDek = null
  operationGeneration += 1
  notifyVault()
}

// Notify views so locking immediately removes their secret state.
function notifyVault(): void {
  for (const listener of listeners) listener()
}

// Subscribe a view to in-memory vault lock changes.
export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Identify operations invalidated by an explicit lock or a later unlock.
export function getVaultGeneration(): number {
  return operationGeneration
}

// Report whether this tab currently holds the unlocked DEK.
export function isVaultUnlocked(): boolean {
  return activeDek !== null
}

// Encrypt one provider password for its stable provider identifier.
export async function encryptProviderPassword(
  providerId: string,
  password: string,
): Promise<Ciphertext> {
  if (!activeDek) throw new Error('Vault is locked')
  if (!providerId) throw new Error('Provider ID is required')
  const generation = operationGeneration
  const plaintext = new TextEncoder().encode(password)
  try {
    const encrypted = await seal(activeDek, plaintext, `provider:${providerId}`)
    if (generation !== operationGeneration)
      throw new Error('Vault operation cancelled')
    return encrypted
  } finally {
    plaintext.fill(0)
  }
}

// Decrypt one provider password only while this tab is unlocked.
export async function decryptProviderPassword(
  providerId: string,
  value: Ciphertext,
): Promise<string> {
  if (!activeDek) throw new Error('Vault is locked')
  if (!providerId) throw new Error('Provider ID is required')
  const generation = operationGeneration
  const plaintext = await open(activeDek, value, `provider:${providerId}`)
  try {
    if (generation !== operationGeneration)
      throw new Error('Vault operation cancelled')
    return new TextDecoder('utf-8', { fatal: true }).decode(plaintext)
  } finally {
    plaintext.fill(0)
  }
}

// Rewrap the existing DEK after authenticating the master password or recovery key.
export async function rewrapMasterPassword(
  metadata: VaultMetadata,
  unlockSecret: string,
  newMasterPassword: string,
  method: 'master' | 'recovery',
): Promise<VaultMetadata['master']> {
  if (!newMasterPassword) throw new Error('Master password is required')
  if (metadata.version !== VERSION) throw new Error('Unsupported vault format')
  const generation = operationGeneration
  let unlockKey: CryptoKey
  if (method === 'master') {
    unlockKey = await deriveMasterKey(unlockSecret, metadata.master)
  } else {
    const bytes = decodeBytes(unlockSecret, KEY_BYTES)
    try {
      unlockKey = await importAesKey(bytes)
    } finally {
      bytes.fill(0)
    }
  }
  const dek = await open(
    unlockKey,
    method === 'master'
      ? metadata.master.wrappedDek
      : metadata.recovery.wrappedDek,
    `dek:${method}`,
  )
  try {
    if (dek.length !== KEY_BYTES) throw new Error('Invalid vault key')
    const master: MasterKdf = {
      kdf: KDF,
      salt: encodeBytes(randomBytes(SALT_BYTES)),
      memoryKiB: KDF_MEMORY_KIB,
      iterations: KDF_ITERATIONS,
      parallelism: KDF_PARALLELISM,
    }
    const key = await deriveMasterKey(newMasterPassword, master)
    const wrappedDek = await seal(key, dek, 'dek:master')
    if (generation !== operationGeneration)
      throw new Error('Vault operation cancelled')
    return { ...master, wrappedDek }
  } finally {
    dek.fill(0)
  }
}
