import { SetMetadata } from '@nestjs/common'

export const PUBLIC_ROUTE_KEY = 'publicRoute'

/** Mark an endpoint that does not require an owner session. */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true)
