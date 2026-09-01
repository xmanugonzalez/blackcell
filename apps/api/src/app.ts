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
import { imagesRouter } from './modules/images.js'

function isJsonParseError(error: unknown): error is SyntaxError & { status: number; type: string } {
  return error instanceof SyntaxError
    && 'status' in error
    && 'type' in error
    && (error as { status?: unknown }).status === 400
    && (error as { type?: unknown }).type === 'entity.parse.failed'
}

export function createApp(): express.Express {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ credentials: true, origin: env.CORS_ORIGINS }))
  app.use('/uploads', express.static(env.UPLOADS_DIR, {
    immutable: true,
    maxAge: '30d',
  }))
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
  app.use('/imagenes', requireAuth, imagesRouter)

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

      if (isJsonParseError(error)) {
        response.status(400).json(failure('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON valido.'))
        return
      }

      console.error(error)
      response.status(500).json(failure('INTERNAL_SERVER_ERROR', 'Ocurrio un error inesperado.'))
    },
  )

  return app
}
