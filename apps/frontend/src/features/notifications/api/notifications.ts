import { pageParams, type Page, type PageQuery } from '@/shared/api/pagination'
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

export type UpcomingReminder = {
  serverId: string
  serverName: string
  eventType: string
  eventDate: string
  interval: number
  scheduledAt: string
}

export type NotificationDelivery = {
  id: string
  serverId: string
  serverName: string
  eventType: string
  eventDate: string
  status: string
  attempts: number
  nextAttemptAt: string
  sentAt: string | null
  lastError: string | null
}

export type NotificationStatus = {
  timezone: string
  workerAlive: boolean
  heartbeat: {
    lastCycleAt: string
    lastSuccessAt: string | null
    lastError: string | null
  } | null
  lastSentAt: string | null
  counts: { status: string; count: number }[]
}

/** Load one page of scheduled reminders. */
export function getUpcomingReminders(
  query: PageQuery,
  signal?: AbortSignal,
): Promise<Page<UpcomingReminder>> {
  return apiRequest(`/notifications/upcoming?${pageParams(query)}`, { signal })
}

/** Load one page of delivery history. */
export function getNotificationDeliveries(
  query: PageQuery,
  signal?: AbortSignal,
): Promise<Page<NotificationDelivery>> {
  return apiRequest(`/notifications/deliveries?${pageParams(query)}`, {
    signal,
  })
}

/** Read safe worker diagnostics and recent delivery history. */
export function getNotificationStatus(
  signal?: AbortSignal,
): Promise<NotificationStatus> {
  return apiRequest('/notifications/status', { signal })
}
