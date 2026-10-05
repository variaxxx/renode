import type { ComponentType } from 'react'
import { OverviewPage } from '@/features/overview/pages/OverviewPage'
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
  { path: '/settings', title: 'Настройки', Page: SettingsPage },
]
