import type { Store } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import type { schema } from '@repo/schema'
import { createContext, useContext } from 'react'

export type AppStore = Store<typeof schema> & ReactApi

const AppStoreContext = createContext<AppStore | null>(null)

export const AppStoreProvider = AppStoreContext.Provider

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext)
  if (!store) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return store
}
