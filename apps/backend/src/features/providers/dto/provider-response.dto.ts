import type { Provider } from '../provider.types'

export class ProviderResponseDto {
  id!: string
  name!: string
  accountUrl!: string
  note!: string | null
  createdAt!: string
  updatedAt!: string

  /** Expose only the provider fields intended for the catalog API. */
  static fromProvider(provider: Provider): ProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      accountUrl: provider.accountUrl,
      note: provider.note,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
    }
  }
}
