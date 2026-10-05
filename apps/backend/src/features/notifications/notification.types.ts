export interface NotificationSettings {
  chatId: string | null
  threadId: number | null
  timezone: string
  paymentIntervals: number[]
  rentalEndIntervals: number[]
  cancellationIntervals: number[]
}
export const DEFAULT_SETTINGS: NotificationSettings = {
  chatId: null,
  threadId: null,
  timezone: 'Europe/Moscow',
  paymentIntervals: [7, 3, 1, 0],
  rentalEndIntervals: [7, 3, 1, 0],
  cancellationIntervals: [7, 3, 1, 0],
}
