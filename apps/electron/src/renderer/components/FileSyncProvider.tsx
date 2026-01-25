import { initFileSync } from '@livestore-filesync/core'
import { createImagePreprocessor } from '@livestore-filesync/image/preprocessor'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { useAppStore } from '@repo/core'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { getToken } from '~/lib/auth-client'
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

  useEffect(() => {
    // Skip if no user (shouldn't happen as FileSyncProvider is used within authenticated routes)
    if (!userId) {
      console.log('[FileSyncProvider] No user, skipping initialization')
      return
    }

    console.log('[FileSyncProvider] Initializing FileSync for user:', userId)

    // Initialize file sync with image preprocessing (using canvas processor - no WASM needed)
    // Pass bearer token for authentication (Electron uses bearer tokens, not cookies)
    // The singleton will auto-dispose if userId changed from previous init
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: `${API_URL}/api`,
        authToken: getToken() ?? undefined,
      },
      userId, // Pass userId to detect user changes
      options: {
        preprocessors: {
          'image/*': createImagePreprocessor({
            maxDimension: 1500,
            quality: 85,
            format: 'jpeg',
            processor: 'canvas',
          }),
        },
      },
    })

    console.log('[FileSyncProvider] FileSync initialized')

    // Initialize thumbnail generation (using canvas processor - works in both dev and production)
    // The singleton will auto-dispose if userId changed from previous init
    disposersRef.current.thumbnails = initThumbnails(store, {
      sizes: { small: 200, medium: 400 },
      format: 'webp',
      fileSystem: opfsLayer(),
      workerUrl: new URL('../workers/thumbnail.worker.ts', import.meta.url),
      userId, // Pass userId to detect user changes
    })
    console.log('[FileSyncProvider] Thumbnails initialized')

    console.log('[FileSyncProvider] Ready')
    setReady(true)

    // Don't return a cleanup function - the singleton's user-awareness
    // handles cleanup when user changes, and explicit dispose happens on logout
  }, [store, userId])

  if (!ready) {
    return null
  }

  return <>{children}</>
}

export function FileSyncProvider(props: FileSyncProviderProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
      }
    >
      <FileSyncProviderInner {...props} />
    </Suspense>
  )
}
