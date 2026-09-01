import argon2 from 'argon2'
import { prisma, RolUsuario } from '@black-cell/database'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: new URL('../../../../.env', import.meta.url) })

const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.string().trim().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_NAME: z.string().trim().min(2).default('Administrador BlackCell'),
})

const adminEnv = adminEnvSchema.parse(process.env)
const passwordHash = await argon2.hash(adminEnv.ADMIN_PASSWORD)

const user = await prisma.usuario.upsert({
  where: { email: adminEnv.ADMIN_EMAIL.toLocaleLowerCase('es') },
  update: {
    nombre: adminEnv.ADMIN_NAME,
    contrasenaHash: passwordHash,
    rol: RolUsuario.ADMINISTRADOR,
    activo: true,
  },
  create: {
    nombre: adminEnv.ADMIN_NAME,
    email: adminEnv.ADMIN_EMAIL.toLocaleLowerCase('es'),
    contrasenaHash: passwordHash,
    rol: RolUsuario.ADMINISTRADOR,
    activo: true,
  },
  select: {
    email: true,
    nombre: true,
    rol: true,
    activo: true,
  },
})

console.log(`Administrador listo: ${user.email}`)
await prisma.$disconnect()
