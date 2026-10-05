export class NotificationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export class TelegramSendError extends NotificationError {
  constructor(
    code: string,
    status: number,
    message: string,
    readonly retryable: boolean,
    readonly retryAfterSeconds?: number,
  ) {
    super(code, status, message)
  }
}
