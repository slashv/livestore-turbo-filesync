import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { useStore } from '@livestore/react'
import { SyncPayload, schema } from '@repo/schema'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { useAuth } from '~/components/AuthProvider'
import LiveStoreWorker from './worker?worker'

// Note: Sync backend is configured in worker.ts, not here
const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

export function useAppStore() {
  const { user } = useAuth()

  if (!user) {
    throw new Error('useAppStore must be used when user is authenticated')
  }

  return useStore({
    storeId: user.id,
    schema,
    adapter,
    batchUpdates,
    syncPayloadSchema: SyncPayload,
    syncPayload: { authToken: user.id },
  })
}
