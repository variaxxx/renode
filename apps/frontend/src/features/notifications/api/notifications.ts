import { apiRequest } from '@/shared/api/client'

export interface NotificationSettings {
  chatId: string | null
  threadId: number | null
  timezone: string
  paymentIntervals: number[]
  rentalEndIntervals: number[]
  cancellationIntervals: number[]
}

/** Load saved notification settings. */
export function getNotificationSettings(
  signal?: AbortSignal,
): Promise<NotificationSettings> {
  return apiRequest('/notifications/settings', { signal })
}

/** Save the Telegram destination and reminder intervals. */
export function saveNotificationSettings(
  input: NotificationSettings,
): Promise<NotificationSettings> {
  return apiRequest('/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/** Send a test to the saved chat and optional topic. */
export function testNotification(): Promise<void> {
  return apiRequest('/notifications/test', { method: 'POST' })
}
