import { createAuthClient } from 'better-auth/react'

// API URL - use env var if set (production), otherwise default to localhost
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

const TOKEN_KEY = 'livestore-bearer-token'

// Get stored bearer token
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// Clear stored bearer token
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    // Capture bearer token from response headers on successful auth
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token')
      if (authToken) {
        localStorage.setItem(TOKEN_KEY, authToken)
      }
    },
    // Send bearer token with all requests
    auth: {
      type: 'Bearer',
      token: () => getToken() ?? '',
    },
  },
})

// Wrap signOut to also clear the token
const originalSignOut = authClient.signOut
export const signOut: typeof originalSignOut = async (options) => {
  const result = await originalSignOut(options)
  clearToken()
  return result
}

export const { signIn, useSession } = authClient
