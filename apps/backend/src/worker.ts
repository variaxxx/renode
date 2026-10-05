import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { WorkerModule } from './core/worker.module'

/** Start the notification worker as a separate Bun process. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule)
  app.enableShutdownHooks()
}

await bootstrap()
