import { Save, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  Provider,
  ProviderInput,
} from '@/features/providers/api/providers'

type ProviderFormProps = {
  provider?: Provider
  onSubmit: (input: ProviderInput) => Promise<void>
  onCancel: () => void
}

/** Collect and validate provider catalog fields. */
export function ProviderForm({
  provider,
  onSubmit,
  onCancel,
}: ProviderFormProps) {
  const [name, setName] = useState(provider?.name ?? '')
  const [accountUrl, setAccountUrl] = useState(provider?.accountUrl ?? '')
  const [note, setNote] = useState(provider?.note ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const editing = Boolean(provider)

  /** Save normalized values and show validation or API failures. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const trimmedName = name.trim()
    const trimmedUrl = accountUrl.trim()
    if (!trimmedName) {
      setError('Укажите название провайдера.')
      return
    }
    try {
      const url = new URL(trimmedUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:')
        throw new Error('invalid protocol')
    } catch {
      setError('Укажите ссылку на кабинет с http:// или https://.')
      return
    }

    setPending(true)
    try {
      await onSubmit({
        name: trimmedName,
        accountUrl: trimmedUrl,
        note: note.trim() || null,
      })
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось сохранить провайдера.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="provider-name">Название</Label>
        <Input
          id="provider-name"
          autoFocus
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider-account-url">Ссылка на личный кабинет</Label>
        <Input
          id="provider-account-url"
          type="url"
          required
          maxLength={2048}
          placeholder="https://example.com/account"
          value={accountUrl}
          onChange={(event) => setAccountUrl(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="provider-note">Заметка (необязательно)</Label>
        <Textarea
          id="provider-note"
          maxLength={4000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Заметка хранится без шифрования. Не указывайте в ней пароли.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          <Save aria-hidden="true" className="size-4 shrink-0" />
          {pending
            ? 'Сохраняем…'
            : editing
              ? 'Сохранить изменения'
              : 'Добавить'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          <X aria-hidden="true" className="size-4 shrink-0" />
          Отмена
        </Button>
      </div>
    </form>
  )
}
