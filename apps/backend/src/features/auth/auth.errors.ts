export class AuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('INVALID_CREDENTIALS', 401, 'Invalid password')
  }
}

export class UnauthenticatedError extends AuthError {
  constructor() {
    super('UNAUTHENTICATED', 401, 'Authentication required')
  }
}

export class InvalidCsrfTokenError extends AuthError {
  constructor() {
    super('CSRF_INVALID', 403, 'CSRF token is missing or invalid')
  }
}
