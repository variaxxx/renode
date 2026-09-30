import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PUBLIC_ROUTE_KEY } from '../../../common/public-route.decorator'
import { readSessionToken } from '../auth.cookie'
import { UnauthenticatedError } from '../auth.errors'
import type { AuthenticatedRequest } from '../auth.request'
import { AuthService } from '../services/auth.service'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  /** Require a live owner session unless the route is public. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = readSessionToken(request)
    if (!token) throw new UnauthenticatedError()
    const ownerId = await this.auth.getOwnerId(token)
    if (!ownerId) throw new UnauthenticatedError()
    request.auth = { ownerId, token }
    return true
  }
}
