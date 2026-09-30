import React from 'react'
import ReactDOM from 'react-dom/client'
import { Button } from '@/components/ui/button'
import './index.css'

/** Render the initial dark application shell. */
function App() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-xl border bg-card p-8 text-card-foreground shadow-xl">
        <p className="mb-4 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Renode
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Учет аренды серверов
        </h1>
        <p className="mt-4 text-muted-foreground">
          Здесь появятся провайдеры, серверы, платежи и ближайшие сроки
          продления.
        </p>
        <Button className="mt-8" disabled>
          Скоро доступно
        </Button>
      </section>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
