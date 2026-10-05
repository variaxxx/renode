import * as React from 'react'
import { cn } from '@/lib/utils'

/** Render a shared label for a form control. */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn('block text-sm font-medium leading-none', className)}
      {...props}
    />
  )
}

export { Label }
