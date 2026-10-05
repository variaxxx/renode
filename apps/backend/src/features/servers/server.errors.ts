export class ServerError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export class InvalidServerError extends ServerError {
  constructor(message: string) {
    super('SERVER_INVALID', 400, message)
  }
}

export class ServerNotFoundError extends ServerError {
  constructor() {
    super('SERVER_NOT_FOUND', 404, 'Server not found')
  }
}

export class ServerHasPaymentsError extends ServerError {
  constructor() {
    super(
      'SERVER_HAS_PAYMENTS',
      409,
      'Archive this server to preserve its payment history',
    )
  }
}
