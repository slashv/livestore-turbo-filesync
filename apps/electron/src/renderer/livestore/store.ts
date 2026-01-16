import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { useStore } from '@livestore/react'
import { SyncPayload, schema } from '@repo/schema'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import LiveStoreWorker from './worker?worker'

// Note: Sync backend is configured in worker.ts, not here
const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

// Accept userId as parameter - each user gets their own store
export function useAppStore(userId: string) {
  return useStore({
    storeId: userId,
    schema,
    adapter,
    batchUpdates,
    syncPayloadSchema: SyncPayload,
    syncPayload: { authToken: userId },
  })
}
