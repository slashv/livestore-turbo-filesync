import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '~/components/AuthProvider'
import { FileSyncProvider } from '~/components/FileSyncProvider'
import { Gallery } from '~/components/Gallery'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="relative">
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
      <FileSyncProvider userId={user.id}>
        <Gallery userId={user.id} />
      </FileSyncProvider>
    </div>
  )
}
