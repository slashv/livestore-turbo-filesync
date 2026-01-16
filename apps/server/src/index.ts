import * as SyncBackend from '@livestore/sync-cf/cf-worker'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAuth, registerUser } from './auth'
import type { Env } from './env'

// Re-export the Durable Object class
export { SyncBackendDO } from './sync-backend'

const app = new Hono<{ Bindings: Env }>()

// CORS for development - handle null/missing origins for Electron
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow null/missing origin (Electron file:// requests, curl, etc.)
      if (!origin || origin === 'null') return 'http://localhost:8787'
      // Allow localhost origins
      if (origin.startsWith('http://localhost:')) return origin
      return null
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// Health check
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'livestore-app-server' })
})

// Register user endpoint
app.post('/api/register', async (c) => {
  const auth = createAuth(c.env)
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
    const auth = createAuth(c.env)
    return auth.handler(c.req.raw)
  } catch (error) {
    console.error('Auth error:', error)
    return c.json({ error: String(error) }, 500)
  }
})

// LiveStore sync endpoint with auth validation
app.all('/sync', async (c) => {
  const searchParams = SyncBackend.matchSyncRequest(c.req.raw)

  if (searchParams === undefined) {
    return c.json({ error: 'Invalid sync request' }, 400)
  }

  // Validate auth token from request cookies
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return SyncBackend.handleSyncRequest({
    request: c.req.raw,
    searchParams,
    ctx: c.executionCtx,
    syncBackendBinding: 'SYNC_BACKEND_DO',
    headers: {},
  })
})

export default app
