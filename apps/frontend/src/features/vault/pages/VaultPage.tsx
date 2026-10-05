import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getVault } from '../api/vault'
import { VaultForm } from '../components/VaultForm'
import { lockVault, type VaultMetadata } from '../lib/crypto'
import { useVaultUnlocked } from '../lib/use-vault'

type Mode = 'setup' | 'unlock' | 'master' | 'recovery'

/** Manage the vault independently from the owner login session. */
export function VaultPage() {
  const unlocked = useVaultUnlocked()
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<Mode | null>(null)
  const [reload, setReload] = useState(0)
  const [formSession, setFormSession] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    getVault(abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setMetadata(value)
          setLoading(false)
        }
      })
      .catch((failure: unknown) => {
        if (!abort.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить хранилище.',
          )
          setLoading(false)
        }
      })
    return () => abort.abort()
  }, [reload])

  /** Reset secret inputs when switching between unlock and recovery actions. */
  function selectMode(next: Mode) {
    setMode(next)
    setMessage('')
    setFormSession((current) => current + 1)
  }

  /** Refresh the view after the encrypted metadata has been saved. */
  function handleComplete(value: VaultMetadata, success: string) {
    setMetadata(value)
    setMessage(success)
    setMode(null)
    setFormSession((current) => current + 1)
  }

  /** Remove the DEK and all visible secret inputs immediately. */
  function handleLock() {
    lockVault()
    setMode(null)
    setMessage('Хранилище заблокировано.')
    setFormSession((current) => current + 1)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Хранилище паролей</h1>
        {unlocked && (
          <Button variant="outline" onClick={handleLock}>
            Заблокировать хранилище
          </Button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Вход в админку и разблокировка паролей — отдельные действия. После
        перезагрузки или выхода хранилище блокируется.
      </p>
      {loading ? (
        <p role="status" className="mt-8">
          Загружаем хранилище…
        </p>
      ) : error ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setError('')
              setLoading(true)
              setReload((value) => value + 1)
            }}
          >
            Повторить
          </Button>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium" role="status">
            {metadata
              ? unlocked
                ? 'Хранилище разблокировано'
                : 'Хранилище заблокировано'
              : 'Хранилище ещё не создано'}
          </p>
          {message && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {message}
            </p>
          )}
          {!metadata ? (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                Выберите отдельный мастер-пароль, сохраните резервный ключ и
                подтвердите сохранение.
              </p>
              <Button className="mt-5" onClick={() => selectMode('setup')}>
                Создать хранилище
              </Button>
            </>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {!unlocked && (
                  <Button
                    variant="outline"
                    onClick={() => selectMode('unlock')}
                  >
                    Разблокировать хранилище
                  </Button>
                )}
                <Button variant="outline" onClick={() => selectMode('master')}>
                  Сменить мастер-пароль
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectMode('recovery')}
                >
                  Восстановить по резервному ключу
                </Button>
              </div>
              {unlocked && (
                <p className="mt-5 text-sm text-muted-foreground">
                  Откройте раздел «Провайдеры», чтобы сохранить или посмотреть
                  пароль личного кабинета.
                </p>
              )}
              <p className="mt-5 text-sm text-muted-foreground">
                Без мастер-пароля и резервного ключа восстановить доступ
                невозможно.
              </p>
            </>
          )}
        </section>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null)
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'setup'
                ? 'Создание хранилища'
                : mode === 'recovery'
                  ? 'Восстановление доступа'
                  : mode === 'master'
                    ? 'Смена мастер-пароля'
                    : 'Разблокировка хранилища'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'setup'
                ? 'Создайте мастер-пароль и сохраните резервный ключ перед завершением настройки.'
                : mode === 'recovery'
                  ? 'Введите резервный ключ и установите новый мастер-пароль.'
                  : mode === 'master'
                    ? 'Подтвердите текущий мастер-пароль и укажите новый.'
                    : 'Введите мастер-пароль, чтобы открыть пароли в этой вкладке.'}
            </DialogDescription>
          </DialogHeader>
          {mode && (
            <VaultForm
              key={`${mode}-${formSession}`}
              mode={mode}
              onComplete={handleComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
