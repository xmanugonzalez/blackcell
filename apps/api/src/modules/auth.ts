import argon2 from 'argon2'
import { Router, type Router as ExpressRouter } from 'express'
import { prisma, RolUsuario, type Usuario } from '@black-cell/database'
import { type AuthSession, type AuthUser, userRoles } from '@black-cell/shared'
import { z } from 'zod'
import { failure, success } from '../http/responses.js'
import { clearSessionCookie, getSessionUserId, setSessionCookie } from '../auth/session.js'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  remember: z.boolean().default(false),
})

const roleFromDb: Record<RolUsuario, AuthUser['role']> = {
  [RolUsuario.ADMINISTRADOR]: 'administrador',
  [RolUsuario.GERENTE]: 'gerente',
  [RolUsuario.TECNICO]: 'tecnico',
  [RolUsuario.CAJERO]: 'cajero',
}

function toAuthUser(usuario: Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol'>): AuthUser {
  return {
    id: usuario.id,
    name: usuario.nombre,
    email: usuario.email,
    role: roleFromDb[usuario.rol as RolUsuario],
  }
}

export const authRouter: ExpressRouter = Router()

authRouter.post('/login', async (request, response, next) => {
  try {
    const result = loginSchema.safeParse(request.body)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Ingresa un correo y una contrasena validos.'))
      return
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: result.data.email.toLocaleLowerCase('es') },
    })

    if (!usuario || !usuario.activo) {
      response.status(401).json(failure('INVALID_CREDENTIALS', 'Correo o contrasena incorrectos.'))
      return
    }

    const validPassword = await argon2.verify(usuario.contrasenaHash, result.data.password)

    if (!validPassword) {
      response.status(401).json(failure('INVALID_CREDENTIALS', 'Correo o contrasena incorrectos.'))
      return
    }

    setSessionCookie(response, usuario.id, result.data.remember)
    response.json(success<AuthSession>({ user: toAuthUser(usuario) }))
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', (_request, response) => {
  clearSessionCookie(response)
  response.json(success({ loggedOut: true }))
})

authRouter.get('/me', async (request, response, next) => {
  try {
    const userId = getSessionUserId(request)

    if (!userId) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    })

    if (!usuario?.activo) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const role = roleFromDb[usuario.rol as RolUsuario]
    if (!userRoles.includes(role)) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    response.json(success<AuthSession>({
      user: {
        id: usuario.id,
        name: usuario.nombre,
        email: usuario.email,
        role,
      },
    }))
  } catch (error) {
    next(error)
  }
})
