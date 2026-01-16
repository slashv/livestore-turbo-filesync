import { createAuthClient } from 'better-auth/react'

// In production, use the deployed server; in dev, use localhost
const baseURL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://livestore-app-server.contact-106.workers.dev')

const TOKEN_KEY = 'livestore-auth-token'

// Custom fetch that adds token header for Electron
const customFetch: typeof fetch = async (input, init) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(init?.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, { ...init, headers })

  // If sign-in or sign-up response, save the token
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  if ((url.includes('/sign-in') || url.includes('/sign-up')) && response.ok) {
    try {
      const cloned = response.clone()
      const data = await cloned.json()
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token)
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return response
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    customFetchImpl: customFetch,
  },
})

export const { signIn, signOut, useSession } = authClient

// Helper to clear token on sign out
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
