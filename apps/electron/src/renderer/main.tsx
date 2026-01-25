import { StoreRegistry } from '@livestore/livestore'
import { StoreRegistryProvider } from '@livestore/react'
import { AppStoreProvider } from '@repo/core'
import { LoginScreen } from '@repo/ui'
import { StrictMode, Suspense } from 'react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { FileSyncProvider } from './components/FileSyncProvider'
import { Gallery } from './components/Gallery'
import { useAppStore } from './livestore/store'
import './styles.css'

// Create store registry with batch updates for React
const storeRegistry = new StoreRegistry({
  defaultOptions: { batchUpdates },
})

function AuthenticatedApp() {
  const { user, signOut } = useAuth()
  const store = useAppStore()

  if (!user) return null

  return (
    <AppStoreProvider value={store}>
      <div className="relative">
        <div className="absolute top-8 right-4 flex items-center gap-4 z-10">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-rose-600 hover:text-rose-700"
          >
            Sign out
          </button>
        </div>
        <FileSyncProvider>
          <Gallery />
        </FileSyncProvider>
      </div>
    </AppStoreProvider>
  )
}

function AuthGate() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        auth={useAuth()}
        headerContent={
          // Electron window title bar spacer
          <div className="absolute top-0 left-0 right-0 h-6" />
        }
      />
    )
  }

  return (
    <StoreRegistryProvider storeRegistry={storeRegistry}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-gray-500">Loading...</div>
          </div>
        }
      >
        <AuthenticatedApp />
      </Suspense>
    </StoreRegistryProvider>
  )
}

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </StrictMode>
)
