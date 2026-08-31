import { Router, type Router as ExpressRouter } from 'express'
import { prisma, EstadoCliente, TipoCliente, type Cliente } from '@black-cell/database'
import {
  customerStatuses,
  customerTypes,
  type Customer,
  type CustomerInput,
} from '@black-cell/shared'
import { z } from 'zod'
import { failure, success } from '../http/responses.js'

const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentNumber: z.string().trim().max(32).default(''),
  phone: z.string().trim().max(32).default(''),
  email: z.string().trim().max(120).refine(
    (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Correo invalido',
  ).default(''),
  city: z.string().trim().max(80).default(''),
  customerType: z.enum(customerTypes).default('regular'),
  status: z.enum(customerStatuses).default('active'),
  lastDevice: z.string().trim().max(90).default(''),
  notes: z.string().trim().max(240).default(''),
})

const customerTypeToDb: Record<CustomerInput['customerType'], TipoCliente> = {
  regular: TipoCliente.REGULAR,
  frequent: TipoCliente.FRECUENTE,
  business: TipoCliente.EMPRESA,
}

const customerTypeFromDb: Record<TipoCliente, Customer['customerType']> = {
  [TipoCliente.REGULAR]: 'regular',
  [TipoCliente.FRECUENTE]: 'frequent',
  [TipoCliente.EMPRESA]: 'business',
}

const customerStatusToDb: Record<CustomerInput['status'], EstadoCliente> = {
  active: EstadoCliente.ACTIVO,
  vip: EstadoCliente.VIP,
  inactive: EstadoCliente.INACTIVO,
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

export const customersRouter: ExpressRouter = Router()

customersRouter.get('/', async (_request, response, next) => {
  try {
    const customers = await prisma.cliente.findMany({
      orderBy: { creadoEn: 'desc' },
    })

    response.json(success(customers.map(toCustomer)))
  } catch (error) {
    next(error)
  }
})

customersRouter.post('/', async (request, response, next) => {
  try {
    const result = customerInputSchema.safeParse(request.body)

    if (!result.success) {
      response.status(400).json(failure('VALIDATION_ERROR', 'Revisa los datos del cliente.'))
      return
    }

    const customer = await prisma.cliente.create({
      data: {
        nombre: result.data.name,
        documento: result.data.documentNumber,
        telefono: result.data.phone,
        email: result.data.email,
        ciudad: result.data.city,
        tipo: customerTypeToDb[result.data.customerType],
        estado: customerStatusToDb[result.data.status],
        equipoReciente: result.data.lastDevice,
        notas: result.data.notes,
      },
    })

    response.status(201).json(success(toCustomer(customer)))
  } catch (error) {
    next(error)
  }
})

customersRouter.delete('/:id', async (request, response, next) => {
  try {
    const id = z.string().min(1).parse(request.params.id)

    await prisma.cliente.delete({ where: { id } })

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})
