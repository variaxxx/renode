import {
  LayoutDashboard,
  Globe2,
  Server,
  Settings,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { OverviewPage } from '@/features/overview/pages/OverviewPage'
import { ProvidersPage } from '@/features/providers/pages/ProvidersPage'
import { ServersPage } from '@/features/servers/pages/ServersPage'
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export type AppRoute = {
  path: string
  title: string
  icon: LucideIcon
  Page: ComponentType
}

export const routes: AppRoute[] = [
  { path: '/', title: 'Обзор', icon: LayoutDashboard, Page: OverviewPage },
  {
    path: '/providers',
    title: 'Провайдеры',
    icon: Globe2,
    Page: ProvidersPage,
  },
  { path: '/servers', title: 'Серверы', icon: Server, Page: ServersPage },
  { path: '/payments', title: 'Платежи', icon: CreditCard, Page: PaymentsPage },
  { path: '/settings', title: 'Настройки', icon: Settings, Page: SettingsPage },
]
