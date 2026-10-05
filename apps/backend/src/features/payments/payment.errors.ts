export class PaymentError extends Error {
  /** Expose a stable payment error without database details. */
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
