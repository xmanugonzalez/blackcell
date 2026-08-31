import { config } from 'dotenv'
import { z } from 'zod'

config({ path: new URL('../../../../.env', import.meta.url) })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)
