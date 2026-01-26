import { AppStoreProvider, ConnectionStatus } from '@repo/ui'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '~/components/AuthProvider'
import { FileSyncProvider } from '~/components/FileSyncProvider'
import { Gallery } from '~/components/Gallery'
import { useAppStore } from '~/livestore/store'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user, signOut } = useAuth()
  const store = useAppStore()

  if (!user) return null

  return (
    <AppStoreProvider value={store}>
      <div className="relative">
        <div className="flex absolute top-4 left-4 z-10 items-center">
          <ConnectionStatus />
        </div>
        <div className="flex absolute top-4 right-4 z-10 gap-4 items-center">
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
