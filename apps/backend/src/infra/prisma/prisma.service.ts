import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL')
    super({ adapter: new PrismaPg({ connectionString, max: 5 }) })
  }

  /** Open and verify the database connection before the process is ready. */
  async onModuleInit(): Promise<void> {
    await this.$connect()
    await this.$queryRaw`SELECT 1`
  }

  /** Close the connection pool during graceful shutdown. */
  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect()
  }
}
