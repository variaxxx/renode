import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { AppModule } from './core/app.module'

/** Start the HTTP API as its own Bun process. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get(ConfigService)
  const frontendOrigin = config.get<string>('FRONTEND_ORIGIN')
  app.enableCsrfProtection({
    trustedOrigins: frontendOrigin ? [frontendOrigin] : [],
  })
  if (frontendOrigin)
    app.enableCors({ origin: frontendOrigin, credentials: true })
  app.useBodyParser('json', { limit: '2mb' })
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.enableShutdownHooks()
  await app.listen(
    config.getOrThrow<number>('PORT'),
    config.getOrThrow<string>('HOST'),
  )
}

await bootstrap()
