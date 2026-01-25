import { createAuthClient } from 'better-auth/react'

// In development, use same-origin requests through Vite's proxy to avoid cross-origin cookie issues
// The Vite dev server proxies /api/* to the backend at localhost:8787
// In production, use the explicit API URL
const baseURL = import.meta.env.VITE_API_URL ?? ''

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
})

export const { signIn, signOut, useSession } = authClient
