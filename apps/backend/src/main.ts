import 'reflect-metadata'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './core/app.module'

/** Start the HTTP API as its own Bun process. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  await app.listen(
    app.get(ConfigService).getOrThrow<number>('PORT'),
    '127.0.0.1',
  )
}

await bootstrap()
