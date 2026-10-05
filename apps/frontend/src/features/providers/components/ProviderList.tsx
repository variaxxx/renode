import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ProviderSecret } from '@/features/vault/components/ProviderSecret'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Provider } from '@/features/providers/api/providers'
import { ProviderFavicon } from '@/features/providers/components/ProviderFavicon'

type ProviderListProps = {
  providers: Provider[]
  loading: boolean
  error: string
  onRetry: () => void
  onEdit: (provider: Provider) => void
  onDelete: (provider: Provider) => Promise<void>
}

/** Render the provider catalog and its loading states. */
export function ProviderList({
  providers,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
}: ProviderListProps) {
  const [confirming, setConfirming] = useState<Provider | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  /** Delete the confirmed provider and display API failures. */
  async function handleDelete(provider: Provider) {
    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete(provider)
      setConfirmOpen(false)
    } catch (failure) {
      setDeleteError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось удалить провайдера.',
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading)
    return (
      <p role="status" className="mt-8 text-sm text-muted-foreground">
        Загружаем провайдеров…
      </p>
    )

  if (error)
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Повторить
        </Button>
      </section>
    )

  if (providers.length === 0)
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-medium">Провайдеров пока нет</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Добавьте первого провайдера, чтобы вести каталог серверов.
        </p>
      </section>
    )

  return (
    <>
      <ul className="mt-8 grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <ProviderFavicon
                key={provider.accountUrl}
                accountUrl={provider.accountUrl}
              />
              <h2 className="min-w-0 flex-1 text-lg font-semibold break-words">
                {provider.name}
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-9 shrink-0 p-0"
                    aria-label={`Действия с провайдером «${provider.name}»`}
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(provider)}>
                    <Pencil aria-hidden="true" className="size-4" /> Изменить
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400"
                    onSelect={() => {
                      setDeleteError('')
                      setConfirming(provider)
                      setConfirmOpen(true)
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" /> Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <a
              href={provider.accountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block truncate text-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Личный кабинет ↗
            </a>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {provider.accountUrl}
            </p>
            {provider.note && (
              <p className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground break-words">
                {provider.note}
              </p>
            )}
            <ProviderSecret
              providerId={provider.id}
              providerName={provider.name}
            />
          </li>
        ))}
      </ul>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleting) setConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{confirming?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Если к провайдеру привязаны серверы, удаление будет отклонено.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-red-400">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <Button
              disabled={deleting}
              onClick={() => {
                if (confirming) void handleDelete(confirming)
              }}
            >
              {deleting ? 'Удаляем…' : 'Подтвердить удаление'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
