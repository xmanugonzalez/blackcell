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

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(120),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
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

async function findActiveSessionUser(userId: string | null) {
  if (!userId) return null

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })

  return usuario?.activo ? usuario : null
}

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
    const usuario = await findActiveSessionUser(getSessionUserId(request))

    if (!usuario) {
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

authRouter.put('/me', async (request, response, next) => {
  try {
    const usuario = await findActiveSessionUser(getSessionUserId(request))

    if (!usuario) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const result = updateProfileSchema.safeParse(request.body)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Revisa los datos de tu perfil.'))
      return
    }

    const nextEmail = result.data.email.toLocaleLowerCase('es')
    const existingUser = await prisma.usuario.findUnique({ where: { email: nextEmail } })

    if (existingUser && existingUser.id !== usuario.id) {
      response.status(409).json(failure('EMAIL_ALREADY_EXISTS', 'Ese correo ya pertenece a otro usuario.'))
      return
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        nombre: result.data.name,
        email: nextEmail,
      },
      select: { id: true, nombre: true, email: true, rol: true },
    })

    response.json(success<AuthSession>({ user: toAuthUser(updatedUser) }))
  } catch (error) {
    next(error)
  }
})

authRouter.put('/password', async (request, response, next) => {
  try {
    const userId = getSessionUserId(request)

    if (!userId) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const result = changePasswordSchema.safeParse(request.body)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'La nueva contrasena debe tener al menos 8 caracteres.'))
      return
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } })

    if (!usuario?.activo) {
      response.status(401).json(failure('UNAUTHENTICATED', 'Debes iniciar sesion.'))
      return
    }

    const validPassword = await argon2.verify(usuario.contrasenaHash, result.data.currentPassword)

    if (!validPassword) {
      response.status(401).json(failure('INVALID_PASSWORD', 'La contrasena actual no es correcta.'))
      return
    }

    const passwordHash = await argon2.hash(result.data.newPassword)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash: passwordHash },
    })

    clearSessionCookie(response)
    response.json(success({ passwordChanged: true }))
  } catch (error) {
    next(error)
  }
})
