import { RefreshCw } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'

/** Gate all admin routes on the current owner session. */
export function ProtectedRoute() {
  const { state, error, restore } = useAuth()
  const location = useLocation()

  if (state === 'checking')
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Проверяем сессию…
      </main>
    )
  if (state === 'error')
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Не удалось открыть админку</h1>
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
          <Button className="mt-6" onClick={() => void restore()}>
            <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            Повторить
          </Button>
        </section>
      </main>
    )
  if (state === 'unauthenticated')
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  return <Outlet />
}
