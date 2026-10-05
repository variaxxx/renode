import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getNotificationSettings,
  saveNotificationSettings,
  testNotification,
  type NotificationSettings,
} from '@/features/notifications/api/notifications'

type SettingsForm = {
  chatId: string
  threadId: string
  timezone: string
  paymentIntervals: string
  rentalEndIntervals: string
  cancellationIntervals: string
}
const intervalFields = [
  ['paymentIntervals', 'До оплаты'],
  ['rentalEndIntervals', 'До окончания аренды'],
  ['cancellationIntervals', 'До срока отмены'],
] as const

/** Convert persisted settings into editable text fields. */
function toForm(settings: NotificationSettings): SettingsForm {
  return {
    ...settings,
    chatId: settings.chatId ?? '',
    threadId: settings.threadId?.toString() ?? '',
    paymentIntervals: settings.paymentIntervals.join(', '),
    rentalEndIntervals: settings.rentalEndIntervals.join(', '),
    cancellationIntervals: settings.cancellationIntervals.join(', '),
  }
}

/** Parse explicit day offsets, allowing an empty list to disable an event. */
function parseIntervals(value: string): number[] {
  if (!value.trim()) return []
  const items = value.split(',').map((item) => item.trim())
  if (
    items.length > 30 ||
    items.some((item) => !/^\d+$/.test(item) || Number(item) > 365)
  )
    throw new Error('Интервалы: до 30 целых чисел от 0 до 365 через запятую.')
  const result = items.map(Number)
  if (new Set(result).size !== result.length)
    throw new Error('Интервалы не должны повторяться.')
  return result
}

/** Edit Telegram settings and show the result of a saved-destination test. */
export function NotificationSettingsSection() {
  const [saved, setSaved] = useState<NotificationSettings | null>(null)
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    /** Load settings without applying results after navigation. */
    async function load() {
      setLoading(true)
      setError('')
      try {
        const settings = await getNotificationSettings(controller.signal)
        if (active) {
          setSaved(settings)
          setForm(toForm(settings))
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Не удалось загрузить настройки.',
          )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [revision])
  const dirty = Boolean(
    saved && form && JSON.stringify(toForm(saved)) !== JSON.stringify(form),
  )

  /** Save validated form data before enabling a destination test. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || busy) return
    setBusy('save')
    setError('')
    setMessage('')
    try {
      const chatId = form.chatId.trim() || null
      const thread = form.threadId.trim()
      if (
        chatId &&
        (!/^-?[1-9]\d{0,15}$/.test(chatId) ||
          !Number.isSafeInteger(Number(chatId)))
      )
        throw new Error('Укажите корректный числовой chat ID.')
      if (
        thread &&
        (!/^[1-9]\d*$/.test(thread) || Number(thread) > 2147483647 || !chatId)
      )
        throw new Error(
          'Thread ID должен быть положительным целым числом и требует chat ID.',
        )
      const settings = await saveNotificationSettings({
        chatId,
        threadId: thread ? Number(thread) : null,
        timezone: form.timezone.trim(),
        paymentIntervals: parseIntervals(form.paymentIntervals),
        rentalEndIntervals: parseIntervals(form.rentalEndIntervals),
        cancellationIntervals: parseIntervals(form.cancellationIntervals),
      })
      setSaved(settings)
      setForm(toForm(settings))
      setMessage('Настройки сохранены.')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось сохранить настройки.',
      )
    } finally {
      setBusy(null)
    }
  }

  /** Report whether Telegram accepted a test for the saved destination. */
  async function test() {
    if (busy || dirty || !saved?.chatId) return
    setBusy('test')
    setError('')
    setMessage('')
    try {
      await testNotification()
      setMessage('Тестовое уведомление отправлено в Telegram.')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось отправить уведомление.',
      )
    } finally {
      setBusy(null)
    }
  }

  /** Update one input and clear feedback for the previous form state. */
  function change(field: keyof SettingsForm, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current))
    setError('')
    setMessage('')
  }

  return (
    <section
      id="notifications"
      aria-labelledby="notifications-title"
      className="space-y-6"
    >
      <div>
        <h2 id="notifications-title" className="text-xl font-semibold">
          Уведомления
        </h2>
        <p className="mt-2 text-muted-foreground">
          Telegram и интервалы напоминаний
        </p>
      </div>
      {loading ? (
        <p role="status">Загружаем настройки…</p>
      ) : !form ? (
        <div className="space-y-4">
          <p role="alert" className="text-red-400">
            {error}
          </p>
          <Button onClick={() => setRevision((value) => value + 1)}>
            Повторить
          </Button>
        </div>
      ) : (
        <form
          onSubmit={save}
          className="space-y-6 rounded-xl border border-border bg-card p-6"
        >
          <div>
            <h2 className="text-lg font-semibold">Telegram</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {saved?.chatId
                ? `Чат настроен: ${saved.chatId}${saved.threadId ? `, тема ${saved.threadId}` : ''}. Доступность проверяется тестом.`
                : 'Чат не настроен.'}
            </p>
          </div>
          <fieldset disabled={busy !== null} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="chat-id">Chat ID</Label>
              <Input
                id="chat-id"
                value={form.chatId}
                onChange={(event) => change('chatId', event.target.value)}
                placeholder="-1001234567890"
                aria-describedby="chat-help"
              />
              <p id="chat-help" className="text-sm text-muted-foreground">
                Числовой ID чата. Бот должен иметь доступ к чату и право
                отправлять сообщения. Очистите оба ID, чтобы убрать адрес
                назначения.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thread-id">Thread ID (необязательно)</Label>
              <Input
                id="thread-id"
                inputMode="numeric"
                value={form.threadId}
                onChange={(event) => change('threadId', event.target.value)}
                placeholder="123"
                aria-describedby="thread-help"
              />
              <p id="thread-help" className="text-sm text-muted-foreground">
                ID темы Telegram. Оставьте пустым для отправки без указания
                темы.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Input
                id="timezone"
                required
                value={form.timezone}
                onChange={(event) => change('timezone', event.target.value)}
                placeholder="Europe/Moscow"
              />
            </div>
            <div>
              <h3 className="font-medium">Интервалы напоминаний</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Дни до события через запятую. 0 — в день события, пустое поле
                отключает этот тип напоминаний. Время — 09:00 в выбранном
                часовом поясе.
              </p>
            </div>
            {intervalFields.map(([field, label]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{label}</Label>
                <Input
                  id={field}
                  value={form[field]}
                  onChange={(event) => change(field, event.target.value)}
                  placeholder="7, 3, 1, 0"
                />
              </div>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-emerald-400">
              {message}
            </p>
          )}
          {dirty && (
            <p className="text-sm text-muted-foreground">
              Сохраните изменения перед тестом.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy !== null}>
              {busy === 'save' ? 'Сохраняем…' : 'Сохранить настройки'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null || !saved?.chatId || dirty}
              onClick={() => void test()}
            >
              {busy === 'test' ? 'Отправляем…' : 'Тест уведомлений'}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
