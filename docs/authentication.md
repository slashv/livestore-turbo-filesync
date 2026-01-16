# Authentication

This project uses [better-auth](https://www.better-auth.com/) for cookie-based authentication with LiveStore sync.

## Overview

| Platform | How Auth Works |
|----------|----------------|
| **Web** | Cookies sent automatically via browser headers |
| **Electron** | Same as web (Chromium-based) |
| **Mobile (Expo)** | Cookies stored in `expo-secure-store`, passed via `syncPayload` |

The server validates sessions at WebSocket connection time using better-auth's session API.

## How It Works

### Web & Electron

Browsers automatically include cookies with WebSocket upgrade requests. The server reads the `Cookie` header and validates the session.

### Mobile (Expo)

Mobile apps don't have native cookie support. Instead:

1. `@better-auth/expo` stores session cookies in `expo-secure-store`
2. The app retrieves cookies via `authClient.getCookie()`
3. Cookies are passed to the server via `syncPayload`

```typescript
// apps/mobile/src/livestore/store.ts
const cookie = authClient.getCookie()

return useStore({
  syncPayload: {
    authToken: userId,
    cookie: cookie || undefined,
  },
})
```

### Server Validation

The server checks cookies from headers first (web), then falls back to the payload (mobile):

```typescript
// apps/server/src/index.ts
const validatePayload = async (payload, { storeId, headers }) => {
  const cookie = headers.get('cookie') || payload?.cookie

  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  })

  if (!session || session.user.id !== storeId) {
    throw new Error('Unauthorized')
  }
}
```

## Store Access Control

Each user can only sync their own store. The server enforces `storeId === session.user.id`.

## Security Considerations

### Mobile Cookie Exposure

On mobile, cookies are passed in the WebSocket payload. Mitigations:

- WebSocket traffic is encrypted via TLS in production
- Cookies can be revoked server-side if compromised
- `expo-secure-store` encrypts data at rest

### Why Cookies Over JWTs?

- better-auth is cookie-based by design
- Cookies can be revoked instantly; JWTs require a blacklist
- Simpler implementation without token generation

## Open Questions

### Session Expiry

If a session expires mid-connection:
- The connection stays open until the next sync operation
- The operation fails, and the client must re-authenticate

Future improvements could include client-side session refresh or WebSocket close codes for auth failures.

## References

- [LiveStore Auth Patterns](https://dev.docs.livestore.dev/patterns/auth/)
- [better-auth Documentation](https://www.better-auth.com/docs)
- [better-auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)
- [LiveStore Cloudflare Sync](https://dev.docs.livestore.dev/sync-providers/cloudflare/)
