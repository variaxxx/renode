import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
  type Provider,
  type ProviderInput,
} from '@/features/providers/api/providers'
import { ProviderForm } from '@/features/providers/components/ProviderForm'
import { ProviderList } from '@/features/providers/components/ProviderList'

/** Render the providers section. */
export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<
    { kind: 'create' } | { kind: 'edit'; provider: Provider } | null
  >(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSession, setEditorSession] = useState(0)

  /** Start a fresh form while retaining the previous one during exit. */
  function openEditor(value: NonNullable<typeof editor>) {
    setEditor(value)
    setEditorSession((current) => current + 1)
    setEditorOpen(true)
  }

  /** Refresh the catalog after entry or a failed request. */
  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProviders(await listProviders())
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось загрузить провайдеров.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])

  /** Add a saved provider to the visible catalog. */
  async function handleCreate(input: ProviderInput) {
    const provider = await createProvider(input)
    setProviders((current) =>
      [...current, provider].sort((left, right) =>
        left.name.localeCompare(right.name, 'ru'),
      ),
    )
    setEditorOpen(false)
  }

  /** Replace the updated provider in the visible catalog. */
  async function handleUpdate(provider: Provider, input: ProviderInput) {
    const updated = await updateProvider(provider.id, input)
    setProviders((current) =>
      current
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    )
    setEditorOpen(false)
  }

  /** Remove a deleted provider from the visible catalog. */
  async function handleDelete(provider: Provider) {
    await deleteProvider(provider.id)
    setProviders((current) => current.filter((item) => item.id !== provider.id))
    if (editor?.kind === 'edit' && editor.provider.id === provider.id)
      setEditorOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Провайдеры</h1>
        <Button onClick={() => openEditor({ kind: 'create' })}>
          Добавить провайдера
        </Button>
      </div>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === 'edit'
                ? 'Изменить провайдера'
                : 'Новый провайдер'}
            </DialogTitle>
            <DialogDescription>
              Укажите название, ссылку на личный кабинет и заметку при
              необходимости.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <ProviderForm
              key={editorSession}
              provider={editor.kind === 'edit' ? editor.provider : undefined}
              onSubmit={(input) =>
                editor.kind === 'edit'
                  ? handleUpdate(editor.provider, input)
                  : handleCreate(input)
              }
              onCancel={() => setEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <ProviderList
        providers={providers}
        loading={loading}
        error={error}
        onRetry={() => void loadProviders()}
        onEdit={(provider) => openEditor({ kind: 'edit', provider })}
        onDelete={handleDelete}
      />
    </div>
  )
}
