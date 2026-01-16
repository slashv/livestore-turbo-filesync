import { makeWorker } from '@livestore/adapter-web/worker'
import { makeWsSync } from '@livestore/sync-cf/client'
import { schema } from '@repo/schema'

// In production, use the deployed server; in dev, use localhost
const syncUrl =
  import.meta.env.VITE_SYNC_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:8787/sync'
    : 'https://livestore-app-server.contact-106.workers.dev/sync')

makeWorker({
  schema,
  sync: {
    backend: makeWsSync({ url: syncUrl }),
    initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
  },
})
