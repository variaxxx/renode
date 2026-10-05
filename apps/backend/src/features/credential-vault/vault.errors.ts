export class VaultError extends Error {
  /** Describe an expected vault failure without secret data. */
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
