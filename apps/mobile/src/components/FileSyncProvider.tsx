import { initFileSync } from '@livestore-filesync/core'
import {
  ExpoFile,
  createExpoImageProcessor,
  layer as expoFileSystemLayer,
} from '@livestore-filesync/expo'
import Constants from 'expo-constants'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { authClient } from '../lib/auth-client'
import { useAppStore } from '../livestore/store'

interface FileSyncProviderProps {
  userId: string
  children: ReactNode
}

// Get API URL from Expo constants
const expoConfig = Constants.expoConfig?.extra ?? {}
const apiUrl = (expoConfig.API_URL as string) ?? 'http://localhost:8787'

/**
 * Create an Expo-specific image preprocessor using ExpoImageProcessor.
 * This runs on the main thread but uses native image manipulation.
 */
function createExpoImagePreprocessor() {
  const processor = createExpoImageProcessor()
  let initialized = false

  return async (file: File): Promise<File> => {
    // Initialize processor on first use
    if (!initialized) {
      await processor.init()
      initialized = true
    }

    // Get the URI - ExpoFile has it directly, otherwise we need to handle differently
    let sourceUri: string

    if ('uri' in file && typeof (file as ExpoFile).uri === 'string') {
      sourceUri = (file as ExpoFile).uri
    } else {
      // For regular File objects, we'd need to write to temp first
      // This shouldn't happen in normal mobile flow since we use ExpoFile
      console.warn('[FileSyncProvider] Received non-ExpoFile, skipping preprocessing')
      return file
    }

    try {
      // Process the image: resize to max 1500px, convert to JPEG
      const result = await processor.process(sourceUri, {
        maxDimension: 1500,
        format: 'jpeg',
        quality: 85,
      })

      // Return as ExpoFile
      return ExpoFile.fromUri(result.uri, {
        type: result.mimeType,
        name: file.name.replace(/\.[^/.]+$/, '.jpg'),
      })
    } catch (error) {
      console.error('[FileSyncProvider] Image preprocessing failed:', error)
      // Return original file if preprocessing fails
      return file
    }
  }
}

function FileSyncProviderInner({ userId, children }: FileSyncProviderProps) {
  const store = useAppStore(userId)
  const [ready, setReady] = useState(false)
  const disposersRef = useRef<{ fileSync?: () => Promise<void> }>({})

  useEffect(() => {
    // If we already have disposers, we're in a StrictMode re-render - skip
    if (disposersRef.current.fileSync) {
      console.log('[FileSyncProvider] Already initialized, skipping')
      setReady(true)
      return
    }

    console.log('[FileSyncProvider] Initializing FileSync...')

    // Get auth cookie for authenticated requests
    const cookie = authClient.getCookie()

    // Initialize file sync with Expo filesystem and image preprocessing
    disposersRef.current.fileSync = initFileSync(store, {
      fileSystem: expoFileSystemLayer(),
      remote: {
        signerBaseUrl: `${apiUrl}/api`,
        // Include auth cookie in headers for mobile
        ...(cookie ? { headers: { Cookie: cookie } } : {}),
      },
      options: {
        preprocessors: {
          'image/*': createExpoImagePreprocessor(),
        },
        onEvent: (event) => {
          // Log events for debugging
          if (event.type.includes('error')) {
            console.error('[FileSyncProvider] Event:', event)
          }
        },
      },
    })

    console.log('[FileSyncProvider] FileSync initialized')
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
  return <FileSyncProviderInner {...props} />
}
