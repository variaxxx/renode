import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PUBLIC_ROUTE_KEY } from '../../../common/public-route.decorator'
import { InvalidCsrfTokenError } from '../auth.errors'
import { requireAuth, type AuthenticatedRequest } from '../auth.request'
import { AuthService } from '../services/auth.service'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  /** Require a session-bound CSRF token for authenticated writes. */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (SAFE_METHODS.has(request.method)) return true
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (isPublic) return true

    const { token } = requireAuth(request)
    const submitted = request.headers['x-csrf-token']
    if (
      typeof submitted !== 'string' ||
      !this.auth.verifyCsrfToken(token, submitted)
    ) {
      throw new InvalidCsrfTokenError()
    }
    return true
  }
}
