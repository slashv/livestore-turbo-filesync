import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { authClient, clearToken } from '~/lib/auth-client'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error?: { message: string } }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'livestore-auth-token'
const USER_KEY = 'livestore-auth-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:8787'}/api/auth/get-session`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser(data.user)
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          } else {
            // Invalid session
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(USER_KEY)
            setUser(null)
          }
        } else {
          // Session invalid
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setUser(null)
        }
      } catch {
        // Network error - keep existing user if available
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

    // On success, the token is saved by customFetch, now save user
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
