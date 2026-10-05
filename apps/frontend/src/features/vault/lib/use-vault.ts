import { useSyncExternalStore } from 'react'
import { isVaultUnlocked, subscribeVault } from './crypto'

/** Read lock state shared by all views in this tab. */
export function useVaultUnlocked(): boolean {
  return useSyncExternalStore(subscribeVault, isVaultUnlocked, () => false)
}
