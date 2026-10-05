import { NotificationSettingsSection } from '@/features/notifications/components/NotificationSettingsSection'
import { VaultSettingsSection } from '@/features/vault/components/VaultSettingsSection'

/** Combine notification and vault settings in one protected page. */
export function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <h1 className="text-3xl font-semibold">Настройки</h1>
      <NotificationSettingsSection />
      <VaultSettingsSection />
    </div>
  )
}
