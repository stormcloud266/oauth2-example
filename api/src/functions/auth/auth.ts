import type { APIGatewayEvent, Context } from 'aws-lambda'
import cookie from 'cookie'

import { logger } from 'src/lib/logger'
import {
  createAuthUrl,
  createSessionCookie,
  createStateToken,
  generateRandomString,
  verifyStateToken,
} from 'src/lib/oauth'

const { DISCORD_CLIENT_ID } = process.env

if (!DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_CLIENT_ID')
}

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  logger.info(`${event.httpMethod} ${event.path}: auth function`)

  const { headers, queryStringParameters } = event
  const { code, state } = queryStringParameters || {}
  const cookies = cookie.parse(headers?.cookie || '')
  const cookieSession = cookies.session_id

  // Begin the auth flow
  if (!code || !state) {
    const sessionId = cookieSession || generateRandomString()
    const stateToken = await createStateToken(sessionId)

    const authUrl = createAuthUrl(DISCORD_CLIENT_ID, stateToken)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(cookieSession
          ? {}
          : {
              'Set-Cookie': createSessionCookie(sessionId),
            }),
      },
      body: JSON.stringify({ authUrl }),
    }
  }

  // Begin token exchange
  const verified = await verifyStateToken(cookieSession, state)

  if (!cookieSession || !verified) {
    return {
      statusCode: 401,
      body: 'Invalid state token',
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `success` }),
  }
}
