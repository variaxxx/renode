import type { ComponentType } from 'react'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'
import { OverviewPage } from '@/features/overview/pages/OverviewPage'
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage'
import { ProvidersPage } from '@/features/providers/pages/ProvidersPage'
import { ServersPage } from '@/features/servers/pages/ServersPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export type AppRoute = {
  path: string
  title: string
  Page: ComponentType
}

export const routes: AppRoute[] = [
  { path: '/', title: 'Обзор', Page: OverviewPage },
  { path: '/providers', title: 'Провайдеры', Page: ProvidersPage },
  { path: '/servers', title: 'Серверы', Page: ServersPage },
  { path: '/payments', title: 'Платежи', Page: PaymentsPage },
  { path: '/notifications', title: 'Уведомления', Page: NotificationsPage },
  { path: '/settings', title: 'Настройки', Page: SettingsPage },
]
