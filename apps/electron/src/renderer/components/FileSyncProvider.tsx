import { initFileSync } from '@livestore-filesync/core'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { useAppStore } from '~/livestore/store'

// Get API URL from environment or use localhost for dev
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

interface FileSyncProviderProps {
  userId: string
  children: ReactNode
}

function FileSyncProviderInner({ userId, children }: FileSyncProviderProps) {
  const store = useAppStore(userId)
  const [ready, setReady] = useState(false)
  const disposersRef = useRef<{ fileSync?: () => Promise<void> }>({})

  useEffect(() => {
    // If we already have disposers, we're in a StrictMode re-render - skip
    if (disposersRef.current.fileSync) {
      setReady(true)
      return
    }

    // Initialize file sync (without image preprocessing for now - wasm-vips has issues)
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: `${API_URL}/api`,
      },
    })

    setReady(true)
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
