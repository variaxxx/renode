import { cn } from '@/lib/utils'

/** Display the Renode logo with its service name. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/brand/renode-logo.png"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="size-10 shrink-0 object-contain"
      />
      <div>
        <p className="text-xl font-semibold tracking-tight">Renode</p>
        <p className="text-xs text-muted-foreground">Учет аренды серверов</p>
      </div>
    </div>
  )
}
