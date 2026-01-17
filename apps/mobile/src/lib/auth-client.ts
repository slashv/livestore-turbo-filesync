import { expoClient } from '@better-auth/expo/client'
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

export const { signIn, signOut, useSession } = authClient
