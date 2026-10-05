type ErrorBody = { error?: { code?: string; message?: string } }

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
  /\/$/,
  '',
)
let csrfToken: string | null = null
let onSessionExpired: (() => void) | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
  ) {
    super(message)
  }
}

/** Register the UI handler for an expired owner session. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onSessionExpired = handler
}

/** Keep the current CSRF token only in memory. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

/** Translate stable API errors into readable messages. */
function errorMessage(code: string, fallback?: string): string {
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: 'Неверный пароль.',
    UNAUTHENTICATED: 'Сессия истекла. Войдите снова.',
    CSRF_INVALID: 'Запрос не прошёл проверку безопасности. Обновите страницу.',
    RATE_LIMITED: 'Слишком много попыток. Подождите минуту и повторите вход.',
    VALIDATION_ERROR: 'Проверьте введённые данные.',
    INTERNAL_ERROR: 'Ошибка сервера. Повторите попытку позже.',
    PROVIDER_HAS_SERVERS:
      'Сначала перенесите или удалите серверы этого провайдера.',
    PROVIDER_NOT_FOUND: 'Провайдер не найден. Обновите список.',
    PROVIDER_INVALID: 'Проверьте данные провайдера.',
    SERVER_NOT_FOUND: 'Сервер не найден. Обновите список.',
    SERVER_HAS_PAYMENTS:
      'У сервера есть история платежей. Архивируйте его вместо удаления.',
    SERVER_INVALID: 'Проверьте данные сервера.',
  }
  return messages[code] ?? fallback ?? 'Не удалось выполнить запрос.'
}

/** Send a credentialed request and normalize network and API failures. */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  ignoreUnauthorized = false,
): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken)
    headers.set('x-csrf-token', csrfToken)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers,
    })
  } catch {
    throw new ApiError(
      'Сервер недоступен. Проверьте соединение и повторите попытку.',
      null,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null
    const code = body?.error?.code ?? 'HTTP_ERROR'
    if (
      response.status === 401 &&
      !ignoreUnauthorized &&
      code !== 'INVALID_CREDENTIALS'
    ) {
      setCsrfToken(null)
      onSessionExpired?.()
    }
    const message =
      response.status >= 500 && code === 'HTTP_ERROR'
        ? 'Сервер недоступен. Повторите попытку позже.'
        : errorMessage(code, body?.error?.message)
    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
