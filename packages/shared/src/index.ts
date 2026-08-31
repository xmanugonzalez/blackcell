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
