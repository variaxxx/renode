import {
  allPages,
  pageParams,
  type Page,
  type PageQuery,
} from '@/shared/api/pagination'
import { apiRequest } from '@/shared/api/client'

export type ServerStatus = 'ACTIVE' | 'ARCHIVED'
export type Currency = 'RUB' | 'USD' | 'EUR'

export type Server = {
  id: string
  providerId: string
  name: string
  purpose: string
  status: ServerStatus
  tariff: string
  cost: string
  currency: Currency
  billingPeriodMonths: number
  nextPaymentDate: string | null
  rentalEndDate: string | null
  cancellationDeadline: string | null
  autoRenew: boolean
  ipAddress: string | null
  domain: string | null
  country: string | null
  project: string | null
  tags: string[]
  note: string | null
  createdAt: string
  updatedAt: string
}

export type ServerInput = {
  providerId: string
  name: string
  purpose: string
  tariff: string
  cost: string
  currency: Currency
  billingPeriodMonths: number
  nextPaymentDate: string
  rentalEndDate: string | null
  cancellationDeadline: string | null
  autoRenew: boolean
  ipAddress: string | null
  domain: string | null
  country: string | null
  project: string | null
  tags: string[]
  note: string | null
}

export type ServerFilters = {
  sort?: 'name' | 'payment' | 'costAsc' | 'costDesc'
  search: string
  providerId: string
  status: ServerStatus | ''
  projectOrTag: string
}

/** Load one bounded page matching the visible catalog filters. */
export function getServerPage(
  filters: ServerFilters,
  query: PageQuery,
  signal?: AbortSignal,
): Promise<Page<Server>> {
  const params = pageParams(query)
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, value.trim())
  }
  return apiRequest(`/servers?${params}`, { signal })
}

/** Read the complete filtered catalog for aggregates and CSV exports. */
export function listServers(
  filters: ServerFilters,
  signal?: AbortSignal,
): Promise<Server[]> {
  return allPages((query) => getServerPage(filters, query, signal))
}

/** Load one server card by its identifier. */
export function getServer(id: string, signal?: AbortSignal): Promise<Server> {
  return apiRequest<Server>(`/servers/${encodeURIComponent(id)}`, { signal })
}

/** Create a server from the catalog form. */
export function createServer(input: ServerInput): Promise<Server> {
  return apiRequest<Server>('/servers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Save changed server fields. */
export function updateServer(
  id: string,
  input: Partial<ServerInput> & { expectedUpdatedAt: string },
): Promise<Server> {
  return apiRequest<Server>(`/servers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** Archive a server while preserving its card. */
export function archiveServer(id: string): Promise<Server> {
  return apiRequest<Server>(`/servers/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  })
}

/** Delete a server without payment history. */
export function deleteServer(id: string): Promise<void> {
  return apiRequest<void>(`/servers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
