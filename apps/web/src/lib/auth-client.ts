import { disposeFileSync } from '@livestore-filesync/core'
import { disposeThumbnails } from '@livestore-filesync/image/thumbnails'
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

// Wrap signOut to dispose FileSync and Thumbnails singletons
// This ensures auth credentials don't persist after logout
const originalSignOut = authClient.signOut
export const signOut: typeof originalSignOut = async (options) => {
  // Dispose singletons before signing out to clear stale auth state
  await Promise.all([disposeFileSync(), disposeThumbnails()])
  return originalSignOut(options)
}

export const { signIn, useSession } = authClient
