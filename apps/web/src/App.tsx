import { LoginScreen } from '@repo/ui'
import { Suspense } from 'react'
import { AuthProvider, useAuth } from '~/components/AuthProvider'
import { HomePage } from './HomePage'

function AuthGate() {
  const auth = useAuth()
  const { isLoading, isAuthenticated } = auth

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen auth={auth} />
  }

  return <HomePage />
}

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-gray-500">Loading...</div>
            </div>
          }
        >
          <AuthGate />
        </Suspense>
      </div>
    </AuthProvider>
  )
}
