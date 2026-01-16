import * as SyncBackend from '@livestore/sync-cf/cf-worker'

// LiveStore Sync Backend Durable Object
// Handles WebSocket connections and event synchronization
export class SyncBackendDO extends SyncBackend.makeDurableObject({
  // Forward Cookie header to onPush/onPull callbacks for auth validation
  // Headers are captured at WebSocket upgrade time and stored in the connection
  // This enables cookie-based auth to work across web, mobile, and Electron
  forwardHeaders: ['Cookie'],

  // Optional: Add logging for debugging
  // onPush: async (message, { storeId, headers }) => {
  //   console.log(`[Sync] Push to store ${storeId}:`, message.batch.length, 'events')
  //   console.log(`[Sync] Cookie present:`, !!headers?.get('cookie'))
  // },
  // onPull: async (message, { storeId }) => {
  //   console.log(`[Sync] Pull from store ${storeId}`)
  // },
}) {}
