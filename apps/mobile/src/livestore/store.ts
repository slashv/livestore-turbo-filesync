import { makePersistedAdapter } from '@livestore/adapter-expo'
import { nanoid } from '@livestore/livestore'
import { useStore } from '@livestore/react'
import { makeWsSync } from '@livestore/sync-cf/client'
import { unstable_batchedUpdates as batchUpdates } from 'react-native'
import { events, schema, SyncPayload, tables } from '@repo/schema'

// Get sync URL from environment or use default
const syncUrl = process.env.EXPO_PUBLIC_LIVESTORE_SYNC_URL ?? 'http://localhost:8787/sync'
const storeId = process.env.EXPO_PUBLIC_LIVESTORE_STORE_ID ?? 'mobile-store'

const adapter = makePersistedAdapter({
  sync: { backend: makeWsSync({ url: syncUrl }) },
})

export function useAppStore() {
  return useStore({
    storeId,
    schema,
    adapter,
    batchUpdates,
    syncPayloadSchema: SyncPayload,
    syncPayload: { authToken: 'insecure-token-change-me' },
    boot: (store) => {
      // Seed with a sample todo if empty
      if (store.query(tables.todos.count()) === 0) {
        store.commit(events.todoCreated({ id: nanoid(), text: 'Welcome to LiveStore!' }))
      }
    },
  })
}
