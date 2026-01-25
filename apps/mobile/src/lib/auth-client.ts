import { expoClient } from '@better-auth/expo/client'
import { disposeFileSync } from '@livestore-filesync/core'
import { createAuthClient } from 'better-auth/react'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const expoConfig = Constants.expoConfig?.extra ?? {}
const baseURL = (expoConfig.API_URL as string) ?? 'http://localhost:8787'

// Log configured URLs on startup for debugging
console.log('[Mobile] Auth server:', baseURL)

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: 'livestore-todo',
      storagePrefix: 'livestore-todo',
      storage: SecureStore,
    }),
  ],
})

// Wrap signOut to dispose FileSync singleton
// This ensures auth credentials don't persist after logout
const originalSignOut = authClient.signOut
export const signOut: typeof originalSignOut = async (options) => {
  // Dispose FileSync singleton to clear stale auth state
  // Note: Mobile doesn't use thumbnails currently
  await disposeFileSync()
  return originalSignOut(options)
}

export const { signIn, useSession } = authClient
