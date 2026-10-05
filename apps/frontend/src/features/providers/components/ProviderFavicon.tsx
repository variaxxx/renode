import { useState } from 'react'
import { Globe2 } from 'lucide-react'

type ProviderFaviconProps = {
  accountUrl: string
}

/** Load a provider icon from the account site's origin. */
export function ProviderFavicon({ accountUrl }: ProviderFaviconProps) {
  const [failed, setFailed] = useState(false)
  let faviconUrl: string | null = null

  try {
    faviconUrl = new URL('/favicon.ico', accountUrl).href
  } catch {
    // Keep the fallback icon when the account URL is invalid.
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
      {faviconUrl && !failed ? (
        <img
          src={faviconUrl}
          alt=""
          className="size-6 object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Globe2 aria-hidden="true" className="size-5 text-muted-foreground" />
      )}
    </span>
  )
}
