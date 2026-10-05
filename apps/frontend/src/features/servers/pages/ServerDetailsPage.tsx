import {
  Archive,
  Copy,
  CircleCheck,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  listProviders,
  type Provider,
} from '@/features/providers/api/providers'
import {
  archiveServer,
  createServer,
  deleteServer,
  getServer,
  updateServer,
  type Server,
  type ServerInput,
} from '@/features/servers/api/servers'
import { PaymentDialog } from '@/features/payments/components/PaymentDialog'
import { PaymentHistory } from '@/features/payments/components/PaymentHistory'
import { ServerForm } from '@/features/servers/components/ServerForm'
import { countryFlag, countryName } from '@/features/servers/lib/countries'

/** Format a date-only API value without local timezone shifts. */
function displayDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'UTC',
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

/** Show one named server field in the details grid. */
function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

/** Render the complete server card at a stable URL. */
export function ServerDetailsPage() {
  const { id } = useParams<{ id: string }>()
  return <ServerDetailsCard key={id} id={id} />
}

/** Keep requests and editor state isolated to one route identifier. */
function ServerDetailsCard({ id }: { id: string | undefined }) {
  const navigate = useNavigate()
  const [server, setServer] = useState<Server | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [providersError, setProvidersError] = useState('')
  const [paymentServer, setPaymentServer] = useState<Server | null>(null)
  const [paymentRevision, setPaymentRevision] = useState(0)
  const [paymentNotice, setPaymentNotice] = useState('')
  const [creatingCopy, setCreatingCopy] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [editorSession, setEditorSession] = useState(0)
  const [confirming, setConfirming] = useState<'archive' | 'delete' | null>(
    null,
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState('')

  /** Load the server card and provider links. */
  const loadDetails = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return
      setLoading(true)
      setError('')
      const [serverResult, providerResult] = await Promise.allSettled([
        getServer(id, signal),
        listProviders(),
      ])
      if (signal?.aborted) return
      if (serverResult.status === 'fulfilled') setServer(serverResult.value)
      else
        setError(
          serverResult.reason instanceof Error
            ? serverResult.reason.message
            : 'Не удалось загрузить сервер.',
        )
      if (providerResult.status === 'fulfilled') {
        setProviders(providerResult.value)
        setProvidersError('')
      } else {
        setProvidersError(
          providerResult.reason instanceof Error
            ? providerResult.reason.message
            : 'Не удалось загрузить провайдеров.',
        )
      }
      setLoading(false)
    },
    [id],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadDetails(controller.signal)
    return () => controller.abort()
  }, [loadDetails])

  /** Save edits and keep the visible card current. */
  async function handleUpdate(input: ServerInput) {
    if (!id) return
    if (creatingCopy) {
      const created = await createServer(input)
      setEditorOpen(false)
      navigate(`/servers/${created.id}`)
      return
    }
    if (!editingServer || editingServer.id !== id) return
    const changes = Object.fromEntries(
      Object.entries(input).filter(
        ([key, value]) =>
          JSON.stringify(value) !==
          JSON.stringify(editingServer[key as keyof Server]),
      ),
    )
    const updated = await updateServer(id, {
      ...changes,
      expectedUpdatedAt: editingServer.updatedAt,
    })
    setServer(updated)
    setEditorOpen(false)
  }

  /** Apply the confirmed archive or delete action. */
  async function handleAction() {
    if (!id || !confirming) return
    setActionPending(true)
    setActionError('')
    try {
      if (confirming === 'archive') {
        setServer(await archiveServer(id))
        setConfirmOpen(false)
      } else {
        await deleteServer(id)
        navigate('/servers', { replace: true })
      }
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось выполнить действие.',
      )
    } finally {
      setActionPending(false)
    }
  }

  const provider = providers.find((item) => item.id === server?.providerId)

  /** Keep dialog content stable while its closing animation runs. */
  function openConfirmation(action: 'archive' | 'delete') {
    setActionError('')
    setConfirming(action)
    setConfirmOpen(true)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/servers"
        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← К списку серверов
      </Link>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Загружаем сервер…
        </p>
      ) : error || !server ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <p role="alert" className="text-sm text-red-400">
            {error || 'Сервер не найден.'}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void loadDetails()}
          >
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Повторить
          </Button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="flex items-center gap-3 text-3xl font-semibold break-words">
                  {server.country && (
                    <span role="img" aria-label={countryName(server.country)}>
                      {countryFlag(server.country)}
                    </span>
                  )}
                  {server.name}
                </h1>
                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                  {server.status === 'ACTIVE' ? 'Активен' : 'Архив'}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground break-words">
                {server.purpose}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setPaymentNotice('')
                  setPaymentServer(server)
                }}
              >
                <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                Оплачено
              </Button>
              <Button
                variant="outline"
                disabled={providers.length === 0}
                onClick={() => {
                  setCreatingCopy(false)
                  setEditingServer(server)
                  setEditorSession((current) => current + 1)
                  setEditorOpen(true)
                }}
              >
                <Pencil aria-hidden="true" className="size-4 shrink-0" />
                Изменить
              </Button>
              <Button
                variant="outline"
                disabled={providers.length === 0}
                onClick={() => {
                  setCreatingCopy(true)
                  setEditingServer({
                    ...server,
                    name: `${server.name} (копия)`.slice(0, 160),
                    ipAddress: null,
                    domain: null,
                  })
                  setEditorSession((current) => current + 1)
                  setEditorOpen(true)
                }}
              >
                <Copy aria-hidden="true" className="size-4" />
                Дублировать
              </Button>
              {server.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  onClick={() => openConfirmation('archive')}
                >
                  <Archive aria-hidden="true" className="size-4 shrink-0" />
                  Архивировать
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => openConfirmation('delete')}
              >
                <Trash2 aria-hidden="true" className="size-4 shrink-0" />
                Удалить
              </Button>
            </div>
          </div>

          {paymentNotice && (
            <p role="status" className="text-sm text-emerald-400">
              {paymentNotice}
            </p>
          )}
          {paymentServer && (
            <PaymentDialog
              server={paymentServer}
              onClose={() => setPaymentServer(null)}
              onSaved={() => {
                setPaymentServer(null)
                setPaymentRevision((value) => value + 1)
                setPaymentNotice(
                  'Платёж записан. Дата следующей оплаты обновлена.',
                )
                void loadDetails()
              }}
            />
          )}
          {providersError && (
            <p role="alert" className="text-sm text-red-400">
              {providersError}
            </p>
          )}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Аренда и оплата</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Провайдер">
                {provider?.name ?? 'Провайдер недоступен'}
              </Detail>
              <Detail label="Тариф">{server.tariff}</Detail>
              <Detail label="Стоимость">
                {server.cost} {server.currency} за {server.billingPeriodMonths}{' '}
                мес.
              </Detail>
              <Detail label="Следующая оплата">
                {server.nextPaymentDate
                  ? displayDate(server.nextPaymentDate)
                  : 'Не указана'}
              </Detail>
              <Detail label="Автопродление">
                {server.autoRenew ? 'Включено' : 'Выключено'}
              </Detail>
              {server.rentalEndDate && (
                <Detail label="Окончание аренды">
                  {displayDate(server.rentalEndDate)}
                </Detail>
              )}
              {server.cancellationDeadline && (
                <Detail label="Срок отмены">
                  {displayDate(server.cancellationDeadline)}
                </Detail>
              )}
            </dl>
            {provider && (
              <a
                href={provider.accountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Личный кабинет провайдера ↗
              </a>
            )}
          </section>

          {(server.country ||
            server.ipAddress ||
            server.domain ||
            server.project ||
            server.tags.length > 0 ||
            server.note) && (
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Размещение и заметки</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                {server.country && (
                  <Detail label="Страна">
                    {countryFlag(server.country)} {countryName(server.country)}
                  </Detail>
                )}
                {server.ipAddress && (
                  <Detail label="IP">{server.ipAddress}</Detail>
                )}
                {server.domain && (
                  <Detail label="Домен">
                    <a
                      href={`https://${server.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {server.domain} ↗
                    </a>
                  </Detail>
                )}
                {server.project && (
                  <Detail label="Проект">{server.project}</Detail>
                )}
                {server.tags.length > 0 && (
                  <Detail label="Теги">{server.tags.join(', ')}</Detail>
                )}
                {server.note && (
                  <Detail label="Заметка">
                    <span className="whitespace-pre-wrap">{server.note}</span>
                  </Detail>
                )}
              </dl>
            </section>
          )}

          <PaymentHistory serverId={server.id} revision={paymentRevision} />

          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {creatingCopy ? 'Копия сервера' : 'Изменить сервер'}
                </DialogTitle>
                <DialogDescription>
                  Обновите сведения об аренде и сроках.
                </DialogDescription>
              </DialogHeader>
              {editingServer && (
                <ServerForm
                  key={editorSession}
                  providers={providers}
                  server={editingServer}
                  creatingCopy={creatingCopy}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditorOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => {
              if (!actionPending) setConfirmOpen(open)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirming === 'archive'
                    ? `Архивировать «${server.name}»?`
                    : `Удалить «${server.name}»?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirming === 'archive'
                    ? 'Карточка и история сохранятся. Сервер исчезнет из списка активных и будущих напоминаний.'
                    : 'Удаление необратимо. Если есть платежи, сервер можно только архивировать.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {actionError && (
                <p role="alert" className="text-sm text-red-400">
                  {actionError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={actionPending}>
                  Отмена
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={actionPending}
                  onClick={() => void handleAction()}
                >
                  {confirming === 'archive' ? (
                    <Archive aria-hidden="true" className="size-4 shrink-0" />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-4 shrink-0" />
                  )}
                  {actionPending
                    ? 'Сохраняем…'
                    : confirming === 'archive'
                      ? 'Архивировать'
                      : 'Подтвердить удаление'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
