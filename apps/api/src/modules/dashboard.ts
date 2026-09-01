import { Router, type Router as ExpressRouter } from 'express'
import { prisma, EstadoCliente, TipoCliente, type Cliente } from '@black-cell/database'
import { type Customer, type DashboardSummary } from '@black-cell/shared'
import { success } from '../http/responses.js'

const customerTypeFromDb: Record<TipoCliente, Customer['customerType']> = {
  [TipoCliente.REGULAR]: 'regular',
  [TipoCliente.FRECUENTE]: 'frequent',
  [TipoCliente.EMPRESA]: 'business',
}

const customerStatusFromDb: Record<EstadoCliente, Customer['status']> = {
  [EstadoCliente.ACTIVO]: 'active',
  [EstadoCliente.VIP]: 'vip',
  [EstadoCliente.INACTIVO]: 'inactive',
}

function toCustomer(cliente: Cliente): Customer {
  return {
    id: cliente.id,
    name: cliente.nombre,
    documentNumber: cliente.documento,
    phone: cliente.telefono,
    email: cliente.email,
    city: cliente.ciudad,
    customerType: customerTypeFromDb[cliente.tipo as TipoCliente],
    status: customerStatusFromDb[cliente.estado as EstadoCliente],
    lastDevice: cliente.equipoReciente,
    notes: cliente.notas,
    createdAt: cliente.creadoEn.toISOString(),
  }
}

export const dashboardRouter: ExpressRouter = Router()

dashboardRouter.get('/resumen', async (_request, response, next) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      vipCustomers,
      businessCustomers,
      totalUsers,
      activeUsers,
      totalImages,
      recentCustomers,
    ] = await prisma.$transaction([
      prisma.cliente.count(),
      prisma.cliente.count({ where: { estado: { not: EstadoCliente.INACTIVO } } }),
      prisma.cliente.count({ where: { estado: EstadoCliente.VIP } }),
      prisma.cliente.count({ where: { tipo: TipoCliente.EMPRESA } }),
      prisma.usuario.count(),
      prisma.usuario.count({ where: { activo: true } }),
      prisma.imagen.count(),
      prisma.cliente.findMany({
        orderBy: { creadoEn: 'desc' },
        take: 5,
      }),
    ])

    const summary: DashboardSummary = {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        vip: vipCustomers,
        business: businessCustomers,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      images: {
        total: totalImages,
      },
      recentCustomers: recentCustomers.map(toCustomer),
    }

    response.json(success(summary))
  } catch (error) {
    next(error)
  }
})
