import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'
import { env } from '../config/env.js'

const sessionCookieName = 'blackcell_session'
const defaultSessionMaxAgeSeconds = 60 * 60 * 8
const rememberedSessionMaxAgeSeconds = 60 * 60 * 24 * 30

type SessionPayload = {
  sub: string
  exp: number
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function signValue(value: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(value).digest('base64url')
}

function createToken(payload: SessionPayload): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = encodeBase64Url(JSON.stringify(payload))
  const signature = signValue(`${header}.${body}`)

  return `${header}.${body}.${signature}`
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, signature] = parts
  if (!header || !body || !signature) return null

  const expectedSignature = signValue(`${header}.${body}`)
  const signatureBuffer = Buffer.from(signature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length
    || !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SessionPayload>
    if (!payload.sub || typeof payload.exp !== 'number') return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return { sub: payload.sub, exp: payload.exp }
  } catch {
    return null
  }
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${name}=`))

  return sessionCookie ? decodeURIComponent(sessionCookie.slice(name.length + 1)) : null
}

export function setSessionCookie(response: Response, userId: string, remember: boolean): void {
  const maxAgeSeconds = remember ? rememberedSessionMaxAgeSeconds : defaultSessionMaxAgeSeconds
  const token = createToken({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  })

  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  })
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  })
}

export function getSessionUserId(request: Request): string | null {
  const token = readCookie(request, sessionCookieName)
  if (!token) return null

  return verifyToken(token)?.sub ?? null
}
