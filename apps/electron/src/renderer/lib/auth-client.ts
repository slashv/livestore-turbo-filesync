import { disposeFileSync } from '@livestore-filesync/core'
import { disposeThumbnails } from '@livestore-filesync/image/thumbnails'
import { createAuthClient } from 'better-auth/react'

// =============================================================================
// Electron uses bearer token authentication (not cookies).
//
// Flow:
// 1. Sign in → server returns `set-auth-token` response header
// 2. We store the token in localStorage
// 3. All subsequent requests (auth client, filesync, sync) use Authorization: Bearer <token>
//
// This avoids cross-origin cookie issues inherent to Electron's file:// origin.
// See: https://www.better-auth.com/docs/plugins/bearer
// =============================================================================

// API URL - use env var if set (production), otherwise default to localhost
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

const TOKEN_KEY = 'livestore-bearer-token'

// Get stored bearer token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// Store bearer token
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

// Clear stored bearer token
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    // Capture bearer token from the `set-auth-token` response header on every request.
    // The better-auth bearer plugin returns this header on sign-in/sign-up responses.
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token')
      if (authToken) {
        setToken(authToken)
      }
    },
    // Send bearer token with all auth client requests
    auth: {
      type: 'Bearer',
      token: () => getToken() ?? '',
    },
  },
})

// Wrap signOut to dispose FileSync/Thumbnails singletons and clear the token
const originalSignOut = authClient.signOut
export const signOut: typeof originalSignOut = async (options) => {
  // Dispose singletons before signing out to clear stale auth state
  await Promise.all([disposeFileSync(), disposeThumbnails()])
  const result = await originalSignOut(options)
  clearToken()
  return result
}

export const { signIn, useSession } = authClient
