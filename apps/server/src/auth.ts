import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'
import type { Env } from './env'

// Custom password hashing using PBKDF2 (Web Crypto API) - much faster than bcrypt in Workers
// This is necessary because bcrypt exceeds CPU time limits on Cloudflare Workers free tier
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  // Format: base64(salt):base64(hash)
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return `${saltB64}:${hashB64}`
}

async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  const { hash: storedHash, password } = data
  const [saltB64, hashB64] = storedHash.split(':')
  if (!saltB64 || !hashB64) return false

  const encoder = new TextEncoder()
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const expectedHash = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  const hashArray = new Uint8Array(hash)

  // Constant-time comparison
  if (hashArray.length !== expectedHash.length) return false
  let result = 0
  for (let i = 0; i < hashArray.length; i++) {
    result |= (hashArray[i] ?? 0) ^ (expectedHash[i] ?? 0)
  }
  return result === 0
}

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
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
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
