import { Pagination } from '@/shared/ui/Pagination'
import { emptyPage, useUrlPagination } from '@/shared/lib/pagination'
import type { Page } from '@/shared/api/pagination'
import { Plus } from 'lucide-react'
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
  getProviderPage,
  updateProvider,
  type Provider,
  type ProviderInput,
} from '@/features/providers/api/providers'
import { ProviderForm } from '@/features/providers/components/ProviderForm'
import { ProviderList } from '@/features/providers/components/ProviderList'

/** Render the providers section. */
export function ProvidersPage() {
  const { query, change } = useUrlPagination()
  const [result, setResult] = useState<Page<Provider>>(emptyPage)
  const providers = result.items
  const [revision, setRevision] = useState(0)
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
  const loadProviders = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError('')
      try {
        const page = await getProviderPage(query, signal)
        if (!signal?.aborted) setResult(page)
      } catch (failure) {
        if (signal?.aborted) return
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить провайдеров.',
        )
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [query],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadProviders(controller.signal)
    return () => controller.abort()
  }, [loadProviders, revision])

  /** Refresh sorted pages after creating a provider. */
  async function handleCreate(input: ProviderInput) {
    await createProvider(input)
    setEditorOpen(false)
    change(1)
    setRevision((value) => value + 1)
  }

  /** Reload the page after a provider changes its sort position. */
  async function handleUpdate(provider: Provider, input: ProviderInput) {
    await updateProvider(provider.id, input)
    setEditorOpen(false)
    setRevision((value) => value + 1)
  }

  /** Reload and clamp navigation after deleting the last item on a page. */
  async function handleDelete(provider: Provider) {
    await deleteProvider(provider.id)
    setRevision((value) => value + 1)
    if (editor?.kind === 'edit' && editor.provider.id === provider.id)
      setEditorOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Провайдеры</h1>
        <Button onClick={() => openEditor({ kind: 'create' })}>
          <Plus aria-hidden="true" className="size-4 shrink-0" />
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
      {!error && (
        <Pagination
          result={result}
          onChange={change}
          label="Провайдеры"
          disabled={loading}
        />
      )}
    </div>
  )
}
