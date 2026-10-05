import {
  LayoutDashboard,
  Globe2,
  Server,
  Settings,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { lazy, type ComponentType } from 'react'

const OverviewPage = lazy(() =>
  import('@/features/overview/pages/OverviewPage').then((m) => ({
    default: m.OverviewPage,
  })),
)
const ProvidersPage = lazy(() =>
  import('@/features/providers/pages/ProvidersPage').then((m) => ({
    default: m.ProvidersPage,
  })),
)
const ServersPage = lazy(() =>
  import('@/features/servers/pages/ServersPage').then((m) => ({
    default: m.ServersPage,
  })),
)
const PaymentsPage = lazy(() =>
  import('@/features/payments/pages/PaymentsPage').then((m) => ({
    default: m.PaymentsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
)

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
