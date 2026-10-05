import { z } from 'zod'

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]+$/)
    .optional(),
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
  FRONTEND_ORIGIN: z
    .url()
    .refine(
      (value) =>
        URL.canParse(value) &&
        ['http:', 'https:'].includes(new URL(value).protocol) &&
        new URL(value).origin === value,
      { message: 'must be an HTTP(S) origin without a path' },
    )
    .optional(),
})
