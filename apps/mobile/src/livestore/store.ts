import { makePersistedAdapter } from '@livestore/adapter-expo'
import { nanoid } from '@livestore/livestore'
import { useStore } from '@livestore/react'
import { makeWsSync } from '@livestore/sync-cf/client'
import { events, SyncPayload, schema, tables } from '@repo/schema'
import Constants from 'expo-constants'
import { unstable_batchedUpdates as batchUpdates } from 'react-native'
import { authClient } from '../lib/auth-client'

// Get sync URL from Expo constants or use default
const expoConfig = Constants.expoConfig?.extra ?? {}
const syncUrl = (expoConfig.LIVESTORE_SYNC_URL as string) ?? 'http://localhost:8787/sync'

// Log configured URLs on startup for debugging
console.log('[Mobile] Sync server:', syncUrl)

const adapter = makePersistedAdapter({
  sync: { backend: makeWsSync({ url: syncUrl }) },
})

// Accept userId as parameter - each user gets their own store
export function useAppStore(userId: string) {
  // Get session cookie from SecureStore (better-auth expo client)
  // This is needed because mobile WebSocket connections don't carry cookies automatically
  const cookie = authClient.getCookie()

  return useStore({
    storeId: userId,
    schema,
    adapter,
    batchUpdates,
    syncPayloadSchema: SyncPayload,
    syncPayload: {
      authToken: userId,
      cookie: cookie || undefined,
    },
    boot: (store) => {
      // Seed with a sample todo if empty
      if (store.query(tables.todos.count()) === 0) {
        store.commit(events.todoCreated({ id: nanoid(), text: 'Welcome to LiveStore!' }))
      }
    },
  })
}
