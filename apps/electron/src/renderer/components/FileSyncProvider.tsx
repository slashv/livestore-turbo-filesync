import { initFileSync } from '@livestore-filesync/core'
import { createCanvasImagePreprocessor } from '@livestore-filesync/image/preprocessor/canvas'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { tables } from '@repo/store'
import { useAppStore } from '@repo/ui'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { getToken } from '~/lib/auth-client'
import ThumbnailWorker from '../workers/thumbnail.worker?worker'
import { useAuth } from './AuthProvider'

// Get API URL from environment or use localhost for dev
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

interface FileSyncProviderProps {
  children: ReactNode
}

function FileSyncProviderInner({ children }: FileSyncProviderProps) {
  const store = useAppStore()
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const disposersRef = useRef<{ fileSync?: () => Promise<void>; thumbnails?: () => Promise<void> }>(
    {}
  )

  // Get user ID - this ensures singletons are recreated when user changes
  const userId = user?.id

  // Get bearer token — read on each render so we always have the latest
  const token = getToken()

  useEffect(() => {
    // Skip if no user (shouldn't happen as FileSyncProvider is used within authenticated routes)
    if (!userId) {
      console.log('[FileSyncProvider] No user, skipping initialization')
      return
    }

    if (!token) {
      console.log('[FileSyncProvider] No bearer token, skipping initialization')
      return
    }

    console.log('[FileSyncProvider] Initializing FileSync for user:', userId)

    // Initialize file sync with bearer token authentication.
    // Electron uses bearer tokens (not cookies) for all server requests.
    // The token is passed as authToken which sets the Authorization header.
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: `${API_URL}/api`,
        authToken: token,
      },
      userId, // Pass userId to detect user changes
      options: {
        maxConcurrentUploads: 5,
        maxConcurrentDownloads: 5,
        preprocessors: {
          'image/*': createCanvasImagePreprocessor({
            maxDimension: 1500,
            quality: 85,
            format: 'jpeg',
          }),
        },
      },
    })

    console.log('[FileSyncProvider] FileSync initialized')

    // Initialize thumbnail generation (using canvas processor - works in both dev and production)
    // The singleton will auto-dispose if userId changed from previous init
    disposersRef.current.thumbnails = initThumbnails(store, {
      sizes: { small: 400, medium: 600, large: 1200 },
      format: 'webp',
      fileSystem: opfsLayer(),
      worker: ThumbnailWorker,
      userId, // Pass userId to detect user changes
      schema: { tables },
      onEvent: (event) => {
        console.log('[Thumbnails] Event:', event.type, event)
      },
    })
    console.log('[FileSyncProvider] Thumbnails initialized')

    console.log('[FileSyncProvider] Ready')
    setReady(true)

    // Don't return a cleanup function - the singleton's user-awareness
    // handles cleanup when user changes, and explicit dispose happens on logout
  }, [store, userId, token])

  if (!ready) {
    return null
  }

  return <>{children}</>
}

export function FileSyncProvider(props: FileSyncProviderProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen text-gray-400">Loading...</div>
      }
    >
      <FileSyncProviderInner {...props} />
    </Suspense>
  )
}
