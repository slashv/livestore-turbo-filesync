import { makeWorker } from '@livestore/adapter-web/worker'
import { makeWsSync } from '@livestore/sync-cf/client'
import { schema } from '@repo/schema'

// In production, use the full server URL; in dev, use same origin (proxied by Vite)
const syncUrl = import.meta.env.VITE_SYNC_URL ?? `${globalThis.location.origin}/sync`

makeWorker({
  schema,
  sync: {
    backend: makeWsSync({ url: syncUrl }),
    initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
  },
})
