import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'
import type { Env } from './env'

export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema })

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
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    plugins: [expo()],
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins: ['*'],
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
  } catch (_error) {
    // User likely already exists
    return { success: false, message: `User exists or error: ${userData.email}` }
  }
}

export type Auth = ReturnType<typeof createAuth>
