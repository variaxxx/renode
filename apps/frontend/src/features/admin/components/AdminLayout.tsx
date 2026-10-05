import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { routes } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { ApiError } from '@/shared/api/client'

/** Render navigation only for a live owner session. */
export function AdminLayout() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  /** Revoke the session before leaving the protected area. */
  async function handleSignOut() {
    setPending(true)
    setError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) return
      setError(failure instanceof Error ? failure.message : 'Не удалось выйти.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-card md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xl font-semibold">Renode</p>
            <p className="text-xs text-muted-foreground">
              Учет аренды серверов
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            disabled={pending}
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" className="size-4 shrink-0" />
            Выйти
          </Button>
        </div>
        <nav
          aria-label="Разделы админки"
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col"
        >
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 shrink-0 rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`
              }
            >
              <route.icon aria-hidden="true" className="size-4 shrink-0" />
              {route.title}
            </NavLink>
          ))}
        </nav>
        <div className="hidden p-5 md:block">
          <Button
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={handleSignOut}
          >
            <LogOut aria-hidden="true" className="size-4 shrink-0" />
            {pending ? 'Выходим…' : 'Выйти'}
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        {error && (
          <p role="alert" className="mb-5 text-sm text-red-400">
            {error}
          </p>
        )}
        <Outlet />
      </main>
    </div>
  )
}
