import { apiRequest } from '@/shared/api/client'
import type { Ciphertext, VaultMetadata } from '../lib/crypto'

/** Read encrypted vault metadata without an unlock secret. */
export function getVault(signal?: AbortSignal): Promise<VaultMetadata | null> {
  return apiRequest('/vault', { signal })
}

/** Create a vault using only client-generated encrypted wrappers. */
export function saveVault(metadata: VaultMetadata): Promise<VaultMetadata> {
  return apiRequest('/vault', {
    method: 'POST',
    body: JSON.stringify(metadata),
  })
}

/** Replace only the master wrapper, preserving all provider ciphertexts. */
export function saveMasterWrapper(
  master: VaultMetadata['master'],
): Promise<VaultMetadata> {
  return apiRequest('/vault/master', {
    method: 'PATCH',
    body: JSON.stringify({ master }),
  })
}

/** Fetch one provider's encrypted password for local decryption. */
export function getProviderSecret(
  providerId: string,
): Promise<Ciphertext | null> {
  return apiRequest(`/vault/providers/${encodeURIComponent(providerId)}/secret`)
}

/** Send an encrypted envelope without any plaintext password fields. */
export function saveProviderSecret(
  providerId: string,
  encrypted: Ciphertext,
): Promise<void> {
  return apiRequest(
    `/vault/providers/${encodeURIComponent(providerId)}/secret`,
    { method: 'PUT', body: JSON.stringify(encrypted) },
  )
}
