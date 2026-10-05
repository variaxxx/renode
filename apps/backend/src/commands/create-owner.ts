import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../core/app.module'
import { OwnerSetupService } from '../features/auth/services/owner-setup.service'

/** Read the setup password from stdin without accepting command-line secrets. */
async function main(): Promise<void> {
  if (process.stdin.isTTY) throw new Error('Pipe the owner password to stdin')
  const password = (await Bun.stdin.text()).replace(/\r?\n$/, '')
  const app = await NestFactory.createApplicationContext(AppModule)
  try {
    await app.get(OwnerSetupService).createOwner(password)
    process.stdout.write('Owner created\n')
  } finally {
    await app.close()
  }
}

await main()
