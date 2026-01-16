# Authentication for LiveStore Sync

This document describes the authentication approach used for WebSocket-based sync connections across web, mobile (Expo), and Electron platforms.

## Problem

The `/sync` endpoint uses WebSocket connections for real-time data synchronization. WebSocket authentication presents challenges:

1. **Web browsers** automatically include cookies with WebSocket upgrade requests (same-origin)
2. **Mobile apps (Expo)** don't have native cookie support - cookies are stored in `expo-secure-store` and must be passed explicitly
3. **Electron apps** work like web browsers but may have cookie handling nuances

We use [better-auth](https://www.better-auth.com/) for authentication, which is a cookie-based auth framework with Expo integration via `@better-auth/expo`.

## Solution Overview

The solution uses a **hybrid approach**:

- **Web/Electron**: Rely on native browser cookie headers (automatic)
- **Mobile**: Pass cookies explicitly via `syncPayload`

The server checks both sources and validates the session using better-auth.

## Architecture

```
                         CONNECTION TIME
+------------------------------------------------------------------+
|                                                                   |
|  Web/Electron:                                                    |
|    Browser -> WS upgrade with Cookie header (automatic)           |
|            -> validatePayload receives headers.get('cookie')      |
|            -> better-auth validates session                       |
|                                                                   |
|  Mobile:                                                          |
|    App -> authClient.getCookie() from SecureStore                 |
|        -> syncPayload: { cookie: "..." }                          |
|        -> validatePayload receives payload.cookie                 |
|        -> better-auth validates session                           |
|                                                                   |
+------------------------------------------------------------------+

                       AFTER CONNECTION
+------------------------------------------------------------------+
|                                                                   |
|  forwardHeaders captures Cookie at connection time                |
|  Headers available in onPush/onPull via context.headers           |
|  (Can be used for per-push validation if needed)                  |
|                                                                   |
+------------------------------------------------------------------+
```

## Implementation Details

### 1. SyncPayload Schema (`packages/schema/src/index.ts`)

The `SyncPayload` schema includes an optional `cookie` field for mobile:

```typescript
export const SyncPayload = Schema.Struct({
  authToken: Schema.String,      // User ID for store identification
  cookie: Schema.optional(Schema.String),  // Session cookie (mobile only)
})
```

### 2. Mobile Client (`apps/mobile/src/livestore/store.ts`)

Mobile apps retrieve cookies from `expo-secure-store` via better-auth's `getCookie()` method:

```typescript
import { authClient } from '../lib/auth-client'

export function useAppStore(userId: string) {
  // Get session cookie from SecureStore (better-auth expo client)
  const cookie = authClient.getCookie()

  return useStore({
    storeId: userId,
    schema,
    adapter,
    batchUpdates,
    syncPayloadSchema: SyncPayload,
    syncPayload: {
      authToken: userId,
      cookie: cookie || undefined,  // Pass cookie for mobile auth
    },
    // ...
  })
}
```

### 3. Server Validation (`apps/server/src/index.ts`)

The server extracts cookies from headers (web) or payload (mobile):

```typescript
function extractCookie(
  headers: ReadonlyMap<string, string>,
  payload: unknown
): string | undefined {
  // Try cookie from HTTP headers first (web/electron)
  const headerCookie = headers.get('cookie')
  if (headerCookie) return headerCookie

  // Fall back to cookie from syncPayload (mobile)
  if (payload && typeof payload === 'object' && 'cookie' in payload) {
    return (payload as { cookie?: string }).cookie
  }

  return undefined
}
```

The `validatePayload` callback validates the session:

```typescript
const validatePayload = async (payload, { storeId, headers }) => {
  const cookie = extractCookie(headers, payload)

  if (!cookie) {
    throw new Error('Unauthorized: No authentication cookie')
  }

  // Validate session using better-auth
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  })

  if (!session) {
    throw new Error('Unauthorized: Invalid session')
  }

  // Verify user has access to this store (storeId === userId)
  if (session.user.id !== storeId) {
    throw new Error('Unauthorized: User does not have access to this store')
  }
}
```

### 4. Durable Object (`apps/server/src/sync-backend.ts`)

The `forwardHeaders` option captures cookies at WebSocket upgrade time:

```typescript
export class SyncBackendDO extends SyncBackend.makeDurableObject({
  forwardHeaders: ['Cookie'],
  // Headers available in onPush/onPull via context.headers
}) {}
```

## Security Considerations

### Cookie in syncPayload (Mobile)

Passing cookies in `syncPayload` exposes them in:
- Server logs (if you log the payload - **don't do this**)
- Network inspection tools
- Memory dumps

**Mitigations:**
- The `syncPayload` is sent over WebSocket (encrypted via TLS in production)
- better-auth cookies can be revoked server-side if compromised
- Mobile storage (`expo-secure-store`) is encrypted at rest

### Why Not JWT?

We considered passing JWTs instead of cookies, but:
- better-auth is cookie-based by design
- Cookies can be revoked instantly; JWTs cannot (without a blacklist)
- We'd need to generate JWTs from sessions, adding complexity

### Store Access Control

Each user can only sync their own store (`storeId === userId`). This is enforced in `validatePayload`:

```typescript
if (session.user.id !== storeId) {
  throw new Error('Unauthorized: User does not have access to this store')
}
```

## Open Questions

### Session Expiry Mid-Sync

If a session expires while a WebSocket connection is active:
- The connection remains open until the next push/pull
- The next operation will fail with "Invalid session"
- The client will need to reconnect after re-authenticating

This is acceptable for now, but could be improved by:
- Implementing session refresh on the client
- Adding per-push validation in `onPush`/`onPull` callbacks
- Using WebSocket close codes to signal auth failure

## References

- [LiveStore Auth Documentation](https://dev.docs.livestore.dev/patterns/auth/)
- [better-auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)
- [LiveStore Cloudflare Sync Provider](https://dev.docs.livestore.dev/sync-providers/cloudflare/)
