import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthContext'

/** Render the owner password form. */
export function LoginPage() {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { state, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedPath = (location.state as { from?: string } | null)?.from
  const destination =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
      ? requestedPath
      : '/'

  /** Submit the password without persisting it. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await signIn(password)
      setPassword('')
      navigate(destination, { replace: true })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось войти.')
    } finally {
      setPending(false)
    }
  }

  if (state === 'authenticated') return <Navigate to={destination} replace />

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-card-foreground shadow-xl">
        <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Renode
        </p>
        <h1 className="mt-6 text-2xl font-semibold">Вход в админку</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Введите пароль владельца, чтобы открыть учет аренды серверов.
        </p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="owner-password">Пароль</Label>
            <Input
              id="owner-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          {error && (
            <p id="login-error" role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </section>
    </main>
  )
}
