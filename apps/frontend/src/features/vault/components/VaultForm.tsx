import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/shared/api/client'
import { getVault, saveMasterWrapper, saveVault } from '../api/vault'
import {
  createVault,
  lockVault,
  isVaultUnlocked,
  subscribeVault,
  getVaultGeneration,
  rewrapMasterPassword,
  unlockWithMasterPassword,
  type VaultMetadata,
} from '../lib/crypto'
import { VaultPasswordField } from './VaultPasswordField'

type Mode = 'setup' | 'unlock' | 'master' | 'recovery'
type Props = {
  mode: Mode
  onComplete: (metadata: VaultMetadata, message: string) => void
}

/** Handle setup, unlocking and rewrapping without sending open secrets. */
export function VaultForm({ mode, onComplete }: Props) {
  const [secret, setSecret] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [candidate, setCandidate] = useState<Awaited<
    ReturnType<typeof createVault>
  > | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  const inFlight = useRef(false)

  useEffect(() => {
    alive.current = true
    const unsubscribe = subscribeVault(() => {
      if (!isVaultUnlocked()) {
        setSecret('')
        setPassword('')
        setConfirmation('')
      }
    })
    return () => {
      unsubscribe()
      alive.current = false
      if (inFlight.current && !isVaultUnlocked()) lockVault()
    }
  }, [])

  /** Forget input secrets before reporting a completed operation. */
  function complete(metadata: VaultMetadata, message: string) {
    setSecret('')
    setPassword('')
    setConfirmation('')
    setCandidate(null)
    onComplete(metadata, message)
  }

  /** Keep cryptography local and persist only confirmed encrypted metadata. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    setError('')
    if (mode !== 'unlock' && !candidate && password !== confirmation) {
      setError('Новый мастер-пароль и подтверждение не совпадают.')
      return
    }
    if (candidate && !confirmed) return
    const generation = getVaultGeneration()
    inFlight.current = true
    setPending(true)
    try {
      if (mode === 'setup') {
        if (!candidate) {
          const created = await createVault(password)
          lockVault()
          if (!alive.current) return
          setPassword('')
          setConfirmation('')
          setCandidate(created)
        } else {
          const saved = await saveVault(candidate.metadata)
          if (!alive.current) return
          complete(
            saved,
            'Хранилище создано. Разблокируйте его мастер-паролем.',
          )
        }
      } else {
        const metadata = await getVault()
        if (!alive.current || generation !== getVaultGeneration()) return
        if (!metadata)
          throw new ApiError(
            'Сначала создайте хранилище.',
            404,
            'VAULT_NOT_FOUND',
          )
        if (mode === 'unlock') {
          await unlockWithMasterPassword(secret, metadata)
          if (!alive.current) return
          complete(metadata, 'Хранилище разблокировано в этой вкладке.')
        } else {
          const master = await rewrapMasterPassword(
            metadata,
            secret,
            password,
            mode === 'recovery' ? 'recovery' : 'master',
          )
          if (!alive.current) return
          const saved = await saveMasterWrapper(master)
          if (!alive.current || generation !== getVaultGeneration()) return
          await unlockWithMasterPassword(password, saved)
          if (!alive.current) return
          complete(
            saved,
            mode === 'recovery'
              ? 'Доступ восстановлен. Новый мастер-пароль установлен.'
              : 'Мастер-пароль изменён. Сохранённые пароли доступны.',
          )
        }
      }
    } catch (failure) {
      if (!alive.current) return
      setSecret('')
      setPassword('')
      setConfirmation('')
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Не удалось открыть хранилище. Проверьте мастер-пароль или резервный ключ и повторите попытку.',
      )
    } finally {
      inFlight.current = false
      if (alive.current) setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 max-w-xl space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        {candidate ? (
          <>
            <p className="text-sm text-muted-foreground">
              Сохраните резервный ключ в безопасном месте. Он показывается
              только на этом шаге. После завершения настройки увидеть его снова
              нельзя.
            </p>
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              Если вы потеряете мастер-пароль и резервный ключ, восстановить
              пароли провайдеров будет невозможно.
            </p>
            <Label htmlFor="vault-recovery-key">Резервный ключ</Label>
            <Textarea
              id="vault-recovery-key"
              value={candidate.recoveryKey}
              readOnly
              autoComplete="off"
              spellCheck={false}
              className="font-mono break-all"
            />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                required
                className="mt-1 size-4 accent-primary"
              />
              Я сохранил резервный ключ и понимаю, что потеря обоих ключей
              делает восстановление невозможным.
            </label>
          </>
        ) : (
          <>
            {mode !== 'setup' && (
              <VaultPasswordField
                id="vault-unlock-secret"
                label={
                  mode === 'recovery'
                    ? 'Резервный ключ'
                    : mode === 'master'
                      ? 'Текущий мастер-пароль'
                      : 'Мастер-пароль'
                }
                value={secret}
                onChange={setSecret}
              />
            )}
            {mode !== 'unlock' && (
              <>
                <VaultPasswordField
                  id="vault-new-password"
                  label={
                    mode === 'setup' ? 'Мастер-пароль' : 'Новый мастер-пароль'
                  }
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
                <VaultPasswordField
                  id="vault-confirm-password"
                  label="Повторите мастер-пароль"
                  value={confirmation}
                  onChange={setConfirmation}
                  autoComplete="new-password"
                />
              </>
            )}
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || (!!candidate && !confirmed)}>
        {pending
          ? 'Обрабатываем…'
          : candidate
            ? 'Завершить настройку'
            : mode === 'setup'
              ? 'Создать резервный ключ'
              : mode === 'unlock'
                ? 'Разблокировать'
                : mode === 'recovery'
                  ? 'Восстановить доступ'
                  : 'Сохранить мастер-пароль'}
      </Button>
    </form>
  )
}
