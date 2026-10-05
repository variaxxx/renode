import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getProviderSecret, saveProviderSecret } from '../api/vault'
import { VaultForm } from './VaultForm'
import {
  decryptProviderPassword,
  encryptProviderPassword,
  type Ciphertext,
} from '../lib/crypto'
import { useVaultUnlocked } from '../lib/use-vault'

type Props = { providerId: string; providerName: string }

/** Keep provider password actions behind the tab's vault lock. */
export function ProviderSecret({ providerId, providerName }: Props) {
  const unlocked = useVaultUnlocked()
  const [unlockOpen, setUnlockOpen] = useState(false)
  return (
    <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Пароль личного кабинета</h3>
        {unlocked ? (
          <UnlockedProviderSecret
            key={providerId}
            providerId={providerId}
            providerName={providerName}
          />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Хранилище заблокировано.{' '}
            <DialogTrigger asChild>
              <button
                type="button"
                className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Разблокировать хранилище
              </button>
            </DialogTrigger>
          </p>
        )}
      </div>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Разблокировка хранилища</DialogTitle>
          <DialogDescription>
            Введите мастер-пароль, чтобы открыть пароли в этой вкладке.
          </DialogDescription>
        </DialogHeader>
        {unlockOpen && (
          <VaultForm mode="unlock" onComplete={() => setUnlockOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Mount secret state only while the dialog is open. */
function UnlockedProviderSecret({ providerId, providerName }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  return (
    <div className="mt-3 space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={() => setMessage('')}>
            <KeyRound aria-hidden="true" className="size-4" /> Пароль
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 break-words">
              Пароль · {providerName}
            </DialogTitle>
            <DialogDescription>
              Пароль от личного кабинета провайдера.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <ProviderSecretDialog
              providerId={providerId}
              onClose={() => setOpen(false)}
              onSaved={() => {
                setMessage('Пароль сохранён.')
                setOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}

type DialogProps = {
  providerId: string
  onClose: () => void
  onSaved: () => void
}

/** Present loading, saved-password and edit states as separate tasks. */
function ProviderSecretDialog({ providerId, onClose, onSaved }: DialogProps) {
  const [encrypted, setEncrypted] = useState<Ciphertext | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState<string | null>(null)
  const [showInput, setShowInput] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const alive = useRef(true)
  const sequence = useRef(0)
  const inputId = `provider-password-${providerId}`

  /** Inspect stored ciphertext without decrypting it on dialog entry. */
  const load = useCallback(async () => {
    const operation = ++sequence.current
    setLoading(true)
    setError('')
    try {
      const value = await getProviderSecret(providerId)
      if (!alive.current || sequence.current !== operation) return
      setEncrypted(value)
      setEditing(value === null)
    } catch (failure) {
      if (alive.current && sequence.current === operation)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить пароль.',
        )
    } finally {
      if (alive.current && sequence.current === operation) setLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    alive.current = true
    void load()
    return () => {
      alive.current = false
      sequence.current += 1
    }
  }, [load])

  /** Decrypt only for an explicit reveal or copy action. */
  async function usePassword(action: 'reveal' | 'copy') {
    if (!encrypted || pending) return
    if (action === 'reveal' && revealed !== null) {
      setRevealed(null)
      return
    }
    const operation = ++sequence.current
    setPending(true)
    setError('')
    setMessage('')
    try {
      const plaintext = await decryptProviderPassword(providerId, encrypted)
      if (!alive.current || sequence.current !== operation) return
      if (action === 'reveal') setRevealed(plaintext)
      else {
        await navigator.clipboard.writeText(plaintext)
        if (alive.current && sequence.current === operation)
          setMessage('Пароль скопирован.')
      }
    } catch {
      if (alive.current && sequence.current === operation)
        setError(
          action === 'copy'
            ? 'Не удалось скопировать пароль. Попробуйте показать его и скопировать вручную.'
            : 'Не удалось расшифровать пароль. Разблокируйте хранилище заново.',
        )
    } finally {
      if (alive.current && sequence.current === operation) setPending(false)
    }
  }

  /** Clear plaintext before entering or leaving the edit state. */
  function setEditMode(value: boolean) {
    sequence.current += 1
    setPassword('')
    setRevealed(null)
    setShowInput(false)
    setError('')
    setMessage('')
    setEditing(value)
  }

  /** Save a replacement only after successful local encryption. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !password) return
    if (new TextEncoder().encode(password).length > 16384) {
      setError('Пароль слишком длинный (максимум 16 КБ).')
      return
    }
    const operation = ++sequence.current
    setPending(true)
    setError('')
    setShowInput(false)
    try {
      const value = await encryptProviderPassword(providerId, password)
      if (!alive.current || sequence.current !== operation) return
      await saveProviderSecret(providerId, value)
      if (!alive.current || sequence.current !== operation) return
      setPassword('')
      onSaved()
    } catch (failure) {
      if (alive.current && sequence.current === operation)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось сохранить пароль.',
        )
    } finally {
      if (alive.current && sequence.current === operation) setPending(false)
    }
  }

  if (loading)
    return (
      <p
        role="status"
        className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Загружаем
        пароль…
      </p>
    )
  if (!editing && !encrypted)
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X aria-hidden="true" className="size-4 shrink-0" />
            Закрыть
          </Button>
          <Button onClick={() => void load()}>Повторить</Button>
        </DialogFooter>
      </div>
    )

  return (
    <form onSubmit={save} className="space-y-5">
      {editing && (
        <p className="text-sm text-muted-foreground">
          {encrypted
            ? 'Новый пароль заменит сохранённый после нажатия «Сохранить».'
            : 'Пароль ещё не сохранён. Добавьте его, чтобы держать доступ под рукой.'}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor={inputId}>
          {editing
            ? encrypted
              ? 'Новый пароль'
              : 'Пароль'
            : 'Сохранённый пароль'}
        </Label>
        <div className="relative">
          <Input
            key={editing ? 'edit' : 'view'}
            id={inputId}
            type={
              editing
                ? showInput
                  ? 'text'
                  : 'password'
                : revealed !== null
                  ? 'text'
                  : 'password'
            }
            value={editing ? password : (revealed ?? '••••••••••••')}
            readOnly={!editing}
            required={editing}
            disabled={pending && editing}
            autoComplete={editing ? 'new-password' : 'off'}
            spellCheck={false}
            autoFocus={editing}
            className="pr-12 font-mono"
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={pending || (editing && !password)}
            aria-label={
              (editing ? showInput : revealed !== null)
                ? 'Скрыть пароль'
                : 'Показать пароль'
            }
            aria-pressed={editing ? showInput : revealed !== null}
            onClick={() =>
              editing
                ? setShowInput((value) => !value)
                : void usePassword('reveal')
            }
          >
            {(editing ? showInput : revealed !== null) ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-red-400"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <DialogFooter>
        {editing ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => (encrypted ? setEditMode(false) : onClose())}
            >
              <X aria-hidden="true" className="size-4 shrink-0" />
              Отмена
            </Button>
            <Button type="submit" disabled={pending || !password}>
              <Save aria-hidden="true" className="size-4 shrink-0" />
              {pending ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditMode(true)}
            >
              <Pencil aria-hidden="true" className="size-4 shrink-0" />
              Изменить пароль
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void usePassword('copy')}
            >
              <Copy aria-hidden="true" className="size-4" />{' '}
              {pending ? 'Обрабатываем…' : 'Скопировать'}
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  )
}
