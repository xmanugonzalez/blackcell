import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { APP_NAME, type HealthStatus } from '@black-cell/shared'
import { requireAuth } from './auth/require-auth.js'
import { env } from './config/env.js'
import { failure, success } from './http/responses.js'
import { authRouter } from './modules/auth.js'
import { customersRouter } from './modules/customers.js'

export function createApp(): express.Express {
  const app = express()

  app.use(helmet())
  app.use(cors({ credentials: true, origin: env.CORS_ORIGIN }))
  app.use(express.json())
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  app.get('/health', (_request, response) => {
    const status: HealthStatus = {
      app: APP_NAME,
      status: 'ok',
      timestamp: new Date().toISOString(),
    }

    response.json(success(status))
  })

  app.use('/auth', authRouter)
  app.use('/clientes', requireAuth, customersRouter)

  app.use((_request, response) => {
    response.status(404).json(failure('NOT_FOUND', 'Recurso no encontrado.'))
  })

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next
      console.error(error)
      response.status(500).json(failure('INTERNAL_SERVER_ERROR', 'Ocurrio un error inesperado.'))
    },
  )

  return app
}
