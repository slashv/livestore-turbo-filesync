import { initFileSync } from '@livestore-filesync/core'
import { createImagePreprocessor } from '@livestore-filesync/image/preprocessor'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { useAppStore } from '@repo/core'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'

interface FileSyncProviderProps {
  children: ReactNode
}

function FileSyncProviderInner({ children }: FileSyncProviderProps) {
  const store = useAppStore()
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

    // Initialize file sync with image preprocessing (using canvas processor - no WASM needed)
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: '/api',
      },
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
    disposersRef.current.thumbnails = initThumbnails(store, {
      sizes: { small: 200, medium: 400 },
      format: 'webp',
      fileSystem: opfsLayer(),
      workerUrl: new URL('../workers/thumbnail.worker.ts', import.meta.url),
    })

    console.log('[FileSyncProvider] Thumbnails initialized, setting ready=true')
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
        <div className="flex justify-center items-center h-screen text-gray-400">Loading...</div>
      }
    >
      <FileSyncProviderInner {...props} />
    </Suspense>
  )
}
