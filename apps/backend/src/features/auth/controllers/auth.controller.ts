import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { Public } from '../../../common/public-route.decorator'
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '../auth.cookie'
import { requireAuth, type AuthenticatedRequest } from '../auth.request'
import { LoginDto } from '../dto/login.dto'
import { AuthService } from '../services/auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Exchange the owner password for a secure session cookie. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ csrfToken: string; expiresAt: string }> {
    const grant = await this.auth.signIn(body.password)
    response.cookie(SESSION_COOKIE_NAME, grant.token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: grant.expiresAt,
    })
    response.setHeader('Cache-Control', 'no-store')
    return {
      csrfToken: grant.csrfToken,
      expiresAt: grant.expiresAt.toISOString(),
    }
  }

  /** Return the current session state and its CSRF token. */
  @Get('session')
  @Header('Cache-Control', 'no-store')
  session(@Req() request: AuthenticatedRequest): {
    authenticated: true
    csrfToken: string
  } {
    const { token } = requireAuth(request)
    return { authenticated: true, csrfToken: this.auth.createCsrfToken(token) }
  }

  /** Revoke the current session and remove its browser cookie. */
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const token = readSessionToken(request)
    if (token) await this.auth.signOut(token)
    response.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS)
    response.setHeader('Cache-Control', 'no-store')
    return { ok: true }
  }
}
