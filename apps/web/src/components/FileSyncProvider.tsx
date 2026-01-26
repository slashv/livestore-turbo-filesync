import { initFileSync } from '@livestore-filesync/core'
import { createImagePreprocessor } from '@livestore-filesync/image/preprocessor'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { tables } from '@repo/store'
import { useAppStore } from '@repo/ui'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import ThumbnailWorker from '../workers/thumbnail.worker?worker'
import { useAuth } from './AuthProvider'

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
    // The singleton will auto-dispose if userId changed from previous init
    // Use VITE_API_URL in production, otherwise relative /api path for local dev
    const apiUrl = import.meta.env.VITE_API_URL || ''
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: `${apiUrl}/api`,
        // Include credentials for cross-origin requests (needed for cookie auth)
        includeCredentials: true,
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

    // Initialize thumbnail generation
    // The singleton will auto-dispose if userId changed from previous init
    // Use worker constructor (Vite's ?worker import) for proper bundling in production
    disposersRef.current.thumbnails = initThumbnails(store, {
      sizes: { small: 400, medium: 600, large: 1200 },
      format: 'webp',
      fileSystem: opfsLayer(),
      worker: ThumbnailWorker,
      userId, // Pass userId to detect user changes
      schema: { tables },
    })

    console.log('[FileSyncProvider] Thumbnails initialized, setting ready=true')
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
        <div className="flex justify-center items-center h-screen text-gray-400">Loading...</div>
      }
    >
      <FileSyncProviderInner {...props} />
    </Suspense>
  )
}
