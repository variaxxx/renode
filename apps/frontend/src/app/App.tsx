import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { routes } from '@/app/routes'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
const ServerDetailsPage = lazy(() =>
  import('@/features/servers/pages/ServerDetailsPage').then((m) => ({
    default: m.ServerDetailsPage,
  })),
)

/** Render feature routes behind the owner session guard. */
export function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <p role="status" className="p-6 text-muted-foreground">
            Загружаем страницу…
          </p>
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/servers/:id" element={<ServerDetailsPage />} />
              <Route
                path="/notifications"
                element={<Navigate to="/settings#notifications" replace />}
              />
              <Route
                path="/vault"
                element={<Navigate to="/settings#vault" replace />}
              />
              {routes.map(({ path, Page }) => (
                <Route key={path} path={path} element={<Page />} />
              ))}
              <Route
                path="*"
                element={
                  <>
                    <h1 className="text-3xl font-semibold">
                      Страница не найдена
                    </h1>
                    <p className="mt-8 text-muted-foreground">
                      Выберите раздел в меню.
                    </p>
                  </>
                }
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
