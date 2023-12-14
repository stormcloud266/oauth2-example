import { randomBytes } from 'crypto'

import type { APIGatewayEvent, Context } from 'aws-lambda'
import cookie from 'cookie'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

/**
 * The handler function is your code that processes http request events.
 * You can use return and throw to send a response or error, respectively.
 *
 * Important: When deployed, a custom serverless function is an open API endpoint and
 * is your responsibility to secure appropriately.
 *
 * @see {@link https://redwoodjs.com/docs/serverless-functions#security-considerations|Serverless Function Considerations}
 * in the RedwoodJS documentation for more information.
 *
 * @typedef { import('aws-lambda').APIGatewayEvent } APIGatewayEvent
 * @typedef { import('aws-lambda').Context } Context
 * @param { APIGatewayEvent } event - an object which contains information from the invoker.
 * @param { Context } context - contains information about the invocation,
 * function, and execution environment.
 */

const { DISCORD_CLIENT_ID } = process.env

if (!DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_CLIENT_ID')
}

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  logger.info(`${event.httpMethod} ${event.path}: auth function`)

  const { headers, queryStringParameters } = event
  const { code, state } = queryStringParameters || {}
  const cookies = cookie.parse(headers?.cookie || '')
  console.log(cookies)
  console.log({ code, state })

  // Begin the auth flow
  if (!code || !state) {
    const sessionId = cookies.session_id || generateRandomString()
    const stateToken = await createStateToken(sessionId)
    console.log('stateToken: ', stateToken)

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8910&scope=identify&state=${stateToken}`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies.session_id
          ? {}
          : {
              'Set-Cookie': cookie.serialize('session_id', sessionId, {
                httpOnly: true,
                secure: true,
                maxAge: 300, // 5 minutes
                sameSite: 'strict',
                path: '/',
              }),
            }),
      },
      body: JSON.stringify({
        authUrl: authUrl,
      }),
    }
  }

  const verified = await verifyStateToken(cookies.session_id, state)

  if (!cookies.session_id || !verified) {
    return {
      statusCode: 401,
      body: 'Invalid state token',
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `success`,
    }),
  }
}

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

  if (tokenRecord.expiresAt < new Date()) {
    await db.authState.delete({ where: { id: tokenRecord.id } })
    return false
  }

  await db.authState.delete({ where: { id: tokenRecord.id } })
  return true
}
