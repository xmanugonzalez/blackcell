import type { NextFunction, Request, Response } from 'express'
import { prisma } from '@black-cell/database'
import { failure } from '../http/responses.js'
import { getSessionUserId } from './session.js'

export async function requireAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getSessionUserId(request)

    if (!userId) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, activo: true },
    })

    if (!user?.activo) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}
