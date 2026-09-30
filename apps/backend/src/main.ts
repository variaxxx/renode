import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './core/app.module'

/** Start the HTTP API as its own Bun process. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const frontendOrigin = config.get<string>('FRONTEND_ORIGIN')
  app.enableCsrfProtection({
    trustedOrigins: frontendOrigin ? [frontendOrigin] : [],
  })
  if (frontendOrigin)
    app.enableCors({ origin: frontendOrigin, credentials: true })
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.enableShutdownHooks()
  await app.listen(config.getOrThrow<number>('PORT'), '127.0.0.1')
}

await bootstrap()
