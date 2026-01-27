import { createR2Handler } from '@livestore-filesync/r2'
import * as SyncBackend from '@livestore/sync-cf/cf-worker'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAuth, registerUser } from './auth'
import type { Env } from './env'

// Re-export the Durable Object class
export { SyncBackendDO } from './sync-backend'

// Create file routes handler for R2 storage
const fileRoutes = createR2Handler<Request, Env, ExecutionContext>({
  bucket: (env) => env.FILE_BUCKET,
  basePath: '/api',
  filesBasePath: '/livestore-filesync-files',
  getSigningSecret: (env) => env.FILE_SIGNING_SECRET,

  // Validate auth using existing better-auth session
  validateAuth: async (request, env) => {
    const auth = createAuth(env, request.url)
    const authHeader = request.headers.get('Authorization')
    const cookie = request.headers.get('Cookie')

    const headers = new Headers()
    if (authHeader) headers.set('Authorization', authHeader)
    if (cookie) headers.set('Cookie', cookie)

    const session = await auth.api.getSession({ headers })
    if (!session) return null // Deny

    // Return user ID as allowed prefix (user can only access their files)
    return [`${session.user.id}/`]
  },
})

const app = new Hono<{ Bindings: Env }>()

// CORS configuration - handles both development and production
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow null/missing origin (Electron file:// requests, curl, mobile apps, etc.)
      if (!origin || origin === 'null') return '*'
      // Allow custom app schemes (mobile development builds)
      if (origin.startsWith('livestore-todo://')) return origin
      // Allow localhost origins (development)
      if (origin.startsWith('http://localhost:')) return origin
      // Allow production origins
      if (origin === 'https://livestore-filesync-gallery.pages.dev') return origin
      // Allow *.pages.dev subdomains (for preview deployments)
      if (origin.endsWith('.pages.dev')) return origin
      return null
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['set-auth-token'],
  })
)

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'livestore-app-server' })
})

// File storage routes (R2)
// Handles: /api/v1/sign/upload, /api/v1/sign/download, /api/v1/delete, /api/health
app.all('/api/v1/*', async (c) => {
  const response = await fileRoutes(c.req.raw, c.env, c.executionCtx)
  if (response) return response
  return c.json({ error: 'Not found' }, 404)
})

app.all('/api/health', async (c) => {
  const response = await fileRoutes(c.req.raw, c.env, c.executionCtx)
  if (response) return response
  return c.json({ error: 'Not found' }, 404)
})

// Serve files from R2 storage
app.all('/livestore-filesync-files/*', async (c) => {
  const response = await fileRoutes(c.req.raw, c.env, c.executionCtx)
  if (response) return response
  return c.json({ error: 'Not found' }, 404)
})

// Register user endpoint
app.post('/api/register', async (c) => {
  const auth = createAuth(c.env, c.req.url)
  const body = await c.req.json<{ email: string; password: string; name: string }>()

  if (!body.email || !body.password || !body.name) {
    return c.json(
      { success: false, message: 'Missing required fields: email, password, name' },
      400
    )
  }

  const result = await registerUser(auth, body)
  return c.json(result, result.success ? 201 : 409)
})

// Better-auth routes
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  try {
    const auth = createAuth(c.env, c.req.url)
    // Clone the request with mutable headers for better-auth/expo plugin
    // The expo plugin needs to modify headers, but Cloudflare Workers have immutable headers
    const clonedRequest = new Request(c.req.raw.url, {
      method: c.req.raw.method,
      headers: new Headers(c.req.raw.headers),
      body: c.req.raw.body,
      redirect: c.req.raw.redirect,
    })
    return auth.handler(clonedRequest)
  } catch (error) {
    console.error('Auth error:', error)
    return c.json({ error: String(error) }, 500)
  }
})

// Auth credentials extracted from headers or payload
type AuthCredentials = { type: 'cookie'; value: string } | { type: 'bearer'; value: string }

// Helper to extract auth credentials from headers or payload
// Priority: 1) Bearer token from payload (Electron), 2) Cookie from headers (web), 3) Cookie from payload (mobile)
function extractAuthCredentials(
  headers: ReadonlyMap<string, string>,
  payload: unknown
): AuthCredentials | undefined {
  // 1. Check for bearer token in payload (Electron)
  if (payload && typeof payload === 'object' && 'bearerToken' in payload) {
    const bearerToken = (payload as { bearerToken?: string }).bearerToken
    if (bearerToken) return { type: 'bearer', value: bearerToken }
  }

  // 2. Try cookie from HTTP headers (web - sent automatically by browser)
  const headerCookie = headers.get('cookie')
  if (headerCookie) return { type: 'cookie', value: headerCookie }

  // 3. Fall back to cookie from syncPayload (mobile - passed explicitly via expo plugin)
  if (payload && typeof payload === 'object' && 'cookie' in payload) {
    const cookie = (payload as { cookie?: string }).cookie
    if (cookie) return { type: 'cookie', value: cookie }
  }

  return undefined
}

// LiveStore sync endpoint with auth validation
app.all('/sync', async (c) => {
  const searchParams = SyncBackend.matchSyncRequest(c.req.raw)

  if (searchParams === undefined) {
    return c.json({ error: 'Invalid sync request' }, 400)
  }

  const auth = createAuth(c.env, c.req.url)

  // Validate session from cookies or bearer tokens
  // - Web: Cookie from headers (automatic)
  // - Mobile: Cookie from syncPayload (via expo plugin)
  // - Electron: Bearer token from syncPayload (via bearer plugin)
  const validatePayload = async (
    payload: unknown,
    { storeId, headers }: { storeId: string; headers: ReadonlyMap<string, string> }
  ) => {
    const credentials = extractAuthCredentials(headers, payload)

    if (!credentials) {
      throw new Error('Unauthorized: No authentication credentials')
    }

    // Build headers for session validation based on credential type
    const authHeaders = new Headers()
    if (credentials.type === 'bearer') {
      authHeaders.set('authorization', `Bearer ${credentials.value}`)
    } else {
      authHeaders.set('cookie', credentials.value)
    }

    // Validate session using better-auth
    const session = await auth.api.getSession({ headers: authHeaders })

    if (!session) {
      throw new Error('Unauthorized: Invalid session')
    }

    // Verify user has access to this store (storeId === userId)
    if (session.user.id !== storeId) {
      throw new Error('Unauthorized: User does not have access to this store')
    }
  }

  // @ts-expect-error - Type instantiation is excessively deep due to complex generics in handleSyncRequest
  return SyncBackend.handleSyncRequest({
    request: c.req.raw,
    searchParams,
    ctx: c.executionCtx,
    env: c.env,
    syncBackendBinding: 'SYNC_BACKEND_DO',
    validatePayload,
  })
})

export default app
