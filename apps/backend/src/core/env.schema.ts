import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) =>
        value.startsWith('postgres://') || value.startsWith('postgresql://'),
      {
        message: 'must be a PostgreSQL URL',
      },
    ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
})
