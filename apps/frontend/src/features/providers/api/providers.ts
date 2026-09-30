import { apiRequest } from '@/shared/api/client'

export type Provider = {
  id: string
  name: string
  accountUrl: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type ProviderInput = {
  name: string
  accountUrl: string
  note: string | null
}

/** Load the owner's provider catalog. */
export function listProviders(): Promise<Provider[]> {
  return apiRequest<Provider[]>('/providers')
}

/** Create a provider from the owner's form data. */
export function createProvider(input: ProviderInput): Promise<Provider> {
  return apiRequest<Provider>('/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Save changes to an existing provider. */
export function updateProvider(
  id: string,
  input: ProviderInput,
): Promise<Provider> {
  return apiRequest<Provider>(`/providers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** Remove an empty provider from the catalog. */
export function deleteProvider(id: string): Promise<void> {
  return apiRequest<void>(`/providers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
