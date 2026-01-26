import { isOnline as getIsOnline, onFileSyncEvent, setOnline } from '@livestore-filesync/core'
import { useCallback, useEffect, useState } from 'react'

declare global {
  interface Window {
    __debugLiveStore?: {
      default?: {
        _dev?: {
          overrideNetworkStatus: (status: 'online' | 'offline') => void
        }
      }
    }
  }
}

export interface UseOnlineStatusReturn {
  /** Current online status (from filesync) */
  isOnline: boolean
  /** Whether sync is enabled (controlled by the toggle) */
  isSyncEnabled: boolean
  /** Toggle sync on/off - controls both filesync and LiveStore sync */
  toggle: () => void
}

/**
 * Hook to manage online/sync status for both LiveStore and LiveStore-FileSync.
 *
 * When toggling OFF:
 * - Calls setOnline(false) on filesync
 * - Calls __debugLiveStore.default._dev.overrideNetworkStatus('offline') on LiveStore
 *
 * When toggling ON:
 * - Calls setOnline(true) on filesync
 * - Calls __debugLiveStore.default._dev.overrideNetworkStatus('online') on LiveStore
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  // Track browser's online status
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Track whether sync is enabled (user-controlled toggle)
  const [isSyncEnabled, setIsSyncEnabled] = useState(true)

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to filesync events to stay in sync with its internal state
  useEffect(() => {
    const unsubscribe = onFileSyncEvent((event) => {
      if (event.type === 'online') {
        setIsOnline(true)
      } else if (event.type === 'offline') {
        setIsOnline(false)
      }
    })

    return unsubscribe
  }, [])

  // Sync initial state from filesync (it may have already determined online status)
  useEffect(() => {
    try {
      const fileSyncOnline = getIsOnline()
      setIsOnline(fileSyncOnline)
    } catch {
      // FileSync not initialized yet, use browser state
    }
  }, [])

  const toggle = useCallback(() => {
    const newEnabled = !isSyncEnabled

    // Update local state
    setIsSyncEnabled(newEnabled)

    // Control filesync
    try {
      setOnline(newEnabled)
    } catch (e) {
      console.warn('[useOnlineStatus] Failed to set filesync online status:', e)
    }

    // Control LiveStore sync via _dev API
    const debugStore = window.__debugLiveStore?.default
    if (debugStore?._dev?.overrideNetworkStatus) {
      debugStore._dev.overrideNetworkStatus(newEnabled ? 'online' : 'offline')
      console.log(`[useOnlineStatus] LiveStore sync ${newEnabled ? 'enabled' : 'disabled'}`)
    } else {
      console.warn('[useOnlineStatus] LiveStore _dev API not available')
    }
  }, [isSyncEnabled])

  return {
    isOnline,
    isSyncEnabled,
    toggle,
  }
}
