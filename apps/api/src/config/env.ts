import { config } from 'dotenv'
import { z } from 'zod'

config({ path: new URL('../../../../.env', import.meta.url) })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32).optional(),
})

const parsedEnv = envSchema.parse(process.env)

if (parsedEnv.NODE_ENV === 'production' && !parsedEnv.JWT_SECRET) {
  throw new Error('JWT_SECRET es requerido en produccion.')
}

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET ?? 'blackcell-development-jwt-secret-change-before-production',
}
