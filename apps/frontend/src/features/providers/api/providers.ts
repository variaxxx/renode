import {
  allPages,
  pageParams,
  type Page,
  type PageQuery,
} from '@/shared/api/pagination'
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

/** Load one page of the provider catalog. */
export function getProviderPage(
  query: PageQuery,
  signal?: AbortSignal,
): Promise<Page<Provider>> {
  return apiRequest(`/providers?${pageParams(query)}`, { signal })
}

/** Load complete provider choices through bounded API requests. */
export function listProviders(signal?: AbortSignal): Promise<Provider[]> {
  return allPages((query) => getProviderPage(query, signal))
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
