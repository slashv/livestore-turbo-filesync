import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '~/components/AuthProvider'
import { TodoApp } from '~/components/TodoApp'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-rose-600 hover:text-rose-700"
        >
          Sign out
        </button>
      </div>
      <TodoApp userId={user.id} />
    </div>
  )
}
