import { randomBytes } from 'crypto'

import cookie from 'cookie'

import { db } from 'src/lib/db'

export const generateRandomString = () => {
  return randomBytes(16).toString('hex')
}

export const createStateToken = async (sessionId: string) => {
  const token = generateRandomString()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10) // 10 minutes from now

  await db.authState.upsert({
    where: { sessionId },
    create: {
      token,
      sessionId,
      expiresAt,
    },
    update: {
      token,
      expiresAt,
    },
  })

  return token
}

export const verifyStateToken = async (sessionId: string, token: string) => {
  const tokenRecord = await db.authState.findUnique({
    where: { token, sessionId },
  })

  if (!tokenRecord) {
    return false
  }

  const isValid = tokenRecord.expiresAt > new Date()

  await db.authState.delete({ where: { id: tokenRecord.id } })

  return isValid
}

export const createSessionCookie = (sessionId: string) => {
  return cookie.serialize('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    maxAge: 300, // 5 minutes
    sameSite: 'strict',
    path: '/',
  })
}

export const createAuthUrl = (clientId: string, stateToken: string) => {
  const url = new URL('https://discord.com/api/oauth2/authorize')

  url.searchParams.set('state', stateToken)
  url.searchParams.set('scope', 'identify')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', 'http://localhost:8910')

  return url.toString()
}
