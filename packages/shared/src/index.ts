export const APP_NAME = 'BlackCell Manager'

export const currencyCode = 'PYG'

export function formatGuarani(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount)
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiFailure = {
  ok: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type HealthStatus = {
  app: string
  status: 'ok'
  timestamp: string
}

export const userRoles = ['administrador', 'gerente', 'tecnico', 'cajero'] as const

export type UserRole = typeof userRoles[number]

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type LoginInput = {
  email: string
  password: string
  remember: boolean
}

export type AuthSession = {
  user: AuthUser
}

export type UpdateProfileInput = {
  name: string
  email: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export const customerTypes = ['regular', 'frequent', 'business'] as const
export const customerStatuses = ['active', 'vip', 'inactive'] as const

export type CustomerType = typeof customerTypes[number]
export type CustomerStatus = typeof customerStatuses[number]

export type Customer = {
  id: string
  name: string
  documentNumber: string
  phone: string
  email: string
  city: string
  customerType: CustomerType
  status: CustomerStatus
  lastDevice: string
  notes: string
  createdAt: string
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>

export type DashboardSummary = {
  customers: {
    total: number
    active: number
    vip: number
    business: number
  }
  users: {
    total: number
    active: number
  }
  images: {
    total: number
  }
  recentCustomers: Customer[]
}

export const imageEntityTypes = ['producto', 'reparacion', 'usuario'] as const

export type ImageEntityType = typeof imageEntityTypes[number]

export type EntityImage = {
  id: string
  entityType: ImageEntityType
  entityId: string
  originalName: string
  fileName: string
  mimeType: string
  sizeBytes: number
  url: string
  isPrimary: boolean
  order: number
  createdAt: string
}
