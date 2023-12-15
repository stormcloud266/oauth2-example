import type { APIGatewayEvent, Context } from 'aws-lambda'
import cookie from 'cookie'

import { logger } from 'src/lib/logger'
import {
  createAuthUrl,
  createSessionCookie,
  createStateToken,
  createTokenExchangeParams,
  generateRandomString,
  verifyStateToken,
} from 'src/lib/oauth'

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  throw new Error('Missing Discord env vars')
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

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: createTokenExchangeParams({
      clientId: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      redirectUri: 'http://localhost:8910',
      code,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!res.ok) {
    console.error('whoops')
    return { statusCode: 500 }
  }

  const { refresh_token, access_token } = await res.json()

  const profileRes = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  if (profileRes.status !== 200) {
    logger.error('Error obtaining Discord profile')
    throw new Error('Error obtaining Discord profile')
  }

  const data = await profileRes.json()

  console.log(data)

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `success` }),
  }
}
