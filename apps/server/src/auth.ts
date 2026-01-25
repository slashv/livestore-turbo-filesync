import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'
import type { Env } from './env'

export function createAuth(env: Env, requestUrl?: string) {
  const db = drizzle(env.DB, { schema })

  // Determine if we're running in a secure (HTTPS) environment
  // Check the actual request URL if provided, otherwise fall back to config
  const isLocalDev = requestUrl?.includes('localhost') || requestUrl?.includes('127.0.0.1')
  const isSecure = !isLocalDev && env.BETTER_AUTH_URL?.startsWith('https://')

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: isLocalDev ? requestUrl?.split('/api/')[0] : env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    plugins: [expo(), bearer()],
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: ['livestore-todo://', '*'],
    advanced: {
      // Only use secure cookies when running over HTTPS
      // This is required for Safari compatibility in local dev (HTTP)
      useSecureCookies: isSecure,
      cookies: {
        session_token: {
          attributes: {
            // sameSite: 'none' requires secure: true, which only works over HTTPS
            // For local dev (HTTP), use 'lax' which works cross-port on localhost
            sameSite: isSecure ? ('none' as const) : ('lax' as const),
            secure: isSecure,
          },
        },
      },
    },
  })
}

// Register a new user
export async function registerUser(
  auth: ReturnType<typeof createAuth>,
  userData: { email: string; password: string; name: string }
) {
  try {
    await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
      },
    })
    return { success: true, message: `Created user: ${userData.email}` }
  } catch (error) {
    // User likely already exists
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, message: `User exists or error: ${userData.email} - ${message}` }
  }
}

export type Auth = ReturnType<typeof createAuth>
