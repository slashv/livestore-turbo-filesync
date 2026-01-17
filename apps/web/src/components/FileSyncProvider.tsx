import { initFileSync } from '@livestore-filesync/core'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { useAppStore } from '~/livestore/store'

interface FileSyncProviderProps {
  userId: string
  children: ReactNode
}

function FileSyncProviderInner({ userId, children }: FileSyncProviderProps) {
  const store = useAppStore(userId)
  const [ready, setReady] = useState(false)
  const disposersRef = useRef<{ fileSync?: () => Promise<void>; thumbnails?: () => Promise<void> }>(
    {}
  )

  useEffect(() => {
    // If we already have disposers, we're in a StrictMode re-render - skip
    if (disposersRef.current.fileSync) {
      console.log('[FileSyncProvider] Already initialized, skipping')
      setReady(true)
      return
    }

    console.log('[FileSyncProvider] Initializing FileSync...')

    // Initialize file sync (without image preprocessing for now - wasm-vips has issues in dev)
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: '/api',
      },
    })

    console.log('[FileSyncProvider] FileSync initialized')

    // Skip thumbnail initialization for now - wasm-vips has issues in dev
    // disposersRef.current.thumbnails = initThumbnails(store, {
    //   sizes: { small: 200, medium: 400 },
    //   format: 'webp',
    //   fileSystem: opfsLayer(),
    //   workerUrl: new URL('../workers/thumbnail.worker.ts', import.meta.url),
    // })

    console.log('[FileSyncProvider] Setting ready=true')
    setReady(true)

    // Don't return a cleanup function - let the singleton persist
    // This is intentional because the singleton pattern in initFileSync
    // doesn't handle async disposal well with React StrictMode
  }, [store])

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
