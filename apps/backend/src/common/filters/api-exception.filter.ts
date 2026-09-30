import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { AuthError } from '../../features/auth/auth.errors'
import { ProviderError } from '../../features/providers/provider.errors'
import { ServerError } from '../../features/servers/server.errors'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  /** Return a stable error envelope without exposing internal failures. */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, code, message } = this.describe(exception)
    response.status(status).json({ error: { code, message } })
  }

  /** Map expected application and framework failures to safe messages. */
  private describe(exception: unknown): {
    status: number
    code: string
    message: string
  } {
    if (
      exception instanceof AuthError ||
      exception instanceof ProviderError ||
      exception instanceof ServerError
    ) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
      }
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      if (status === HttpStatus.BAD_REQUEST)
        return { status, code: 'VALIDATION_ERROR', message: 'Invalid request' }
      if (status === HttpStatus.TOO_MANY_REQUESTS)
        return { status, code: 'RATE_LIMITED', message: 'Too many requests' }
      if (status === HttpStatus.NOT_FOUND)
        return { status, code: 'NOT_FOUND', message: 'Route not found' }
      return {
        status,
        code: 'HTTP_ERROR',
        message: status >= 500 ? 'Internal server error' : exception.message,
      }
    }
    this.logger.error(exception)
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    }
  }
}
