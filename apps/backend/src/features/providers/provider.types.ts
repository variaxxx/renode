export type Provider = {
  id: string
  name: string
  accountUrl: string
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateProviderInput = {
  name: string
  accountUrl: string
  note?: string | null
}

export type UpdateProviderInput = Partial<CreateProviderInput>
