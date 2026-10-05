export class ProviderError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export class InvalidProviderError extends ProviderError {
  constructor(message: string) {
    super('PROVIDER_INVALID', 400, message)
  }
}

export class ProviderNotFoundError extends ProviderError {
  constructor() {
    super('PROVIDER_NOT_FOUND', 404, 'Provider not found')
  }
}

export class ProviderInUseError extends ProviderError {
  constructor() {
    super(
      'PROVIDER_HAS_SERVERS',
      409,
      'Move or delete the linked servers before deleting this provider',
    )
  }
}
