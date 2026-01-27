import type { AuthContextType, User } from '@repo/ui'
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { authClient, clearToken, getToken } from '~/lib/auth-client'

const AuthContext = createContext<AuthContextType | null>(null)

const USER_KEY = 'livestore-auth-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Verify session on mount using bearer token
  useEffect(() => {
    const verifySession = async () => {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        // Use the auth client's getSession which automatically includes the bearer token
        const { data } = await authClient.getSession()

        if (data?.user) {
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        } else {
          // Invalid session — clear stale token
          clearToken()
          localStorage.removeItem(USER_KEY)
          setUser(null)
        }
      } catch {
        // Network error — keep existing user if available
      }
      setIsLoading(false)
    }

    verifySession()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password })

    if (result.error) {
      return { error: { message: result.error.message ?? 'Sign in failed' } }
    }

    // On success, the bearer token is saved by auth-client's onSuccess handler
    if (result.data?.user) {
      setUser(result.data.user)
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.user))
    }

    return {}
  }

  const handleSignUp = async (email: string, password: string, name: string) => {
    const result = await authClient.signUp.email({ email, password, name })

    if (result.error) {
      return { error: { message: result.error.message ?? 'Sign up failed' } }
    }

    // On success, the bearer token is saved by auth-client's onSuccess handler
    if (result.data?.user) {
      setUser(result.data.user)
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.user))
    }

    return {}
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Ignore errors
    }
    clearToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
