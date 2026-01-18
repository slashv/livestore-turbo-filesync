import { initFileSync } from '@livestore-filesync/core'
import { createImagePreprocessor } from '@livestore-filesync/image/preprocessor'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { useAppStore } from '~/livestore/store'

// Get API URL from environment or use localhost for dev
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

// Custom locateFile for wasm-vips to find the wasm file
// Only needed in dev mode - in production, Vite bundles the wasm file
const vipsLocateFile = import.meta.env.DEV
  ? (path: string): string => {
      if (path.endsWith('.wasm')) {
        return `/node_modules/wasm-vips/lib/${path}`
      }
      return path
    }
  : undefined

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

    // Initialize file sync
    // Note: Image preprocessing with wasm-vips only works in dev mode due to Electron CSP/worker issues
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: `${API_URL}/api`,
      },
      options: import.meta.env.DEV
        ? {
            preprocessors: {
              'image/*': createImagePreprocessor({
                maxDimension: 1500,
                quality: 85,
                format: 'jpeg',
                vipsOptions: {
                  locateFile: vipsLocateFile!,
                },
              }),
            },
          }
        : undefined,
    })

    console.log('[FileSyncProvider] FileSync initialized')

    // Initialize thumbnail generation
    // Note: Only enable in dev mode - Electron production has issues with wasm-vips in data URL workers
    if (import.meta.env.DEV) {
      disposersRef.current.thumbnails = initThumbnails(store, {
        sizes: { small: 200, medium: 400 },
        format: 'webp',
        fileSystem: opfsLayer(),
        workerUrl: new URL('../workers/thumbnail.worker.ts', import.meta.url),
      })
      console.log('[FileSyncProvider] Thumbnails initialized')
    } else {
      console.log('[FileSyncProvider] Thumbnails disabled in production (wasm-vips worker issue)')
    }

    console.log('[FileSyncProvider] Ready')
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
