import type { AuthContextType } from '@repo/ui'
import { type ReactNode, createContext, useContext } from 'react'
import { authClient, useSession } from '~/lib/auth-client'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

  const handleSignIn = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password })
    return {
      error: result.error ? { message: result.error.message ?? 'Sign in failed' } : undefined,
    }
  }

  const handleSignUp = async (email: string, password: string, name: string) => {
    const result = await authClient.signUp.email({ email, password, name })
    return {
      error: result.error ? { message: result.error.message ?? 'Sign up failed' } : undefined,
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut()
  }

  const value: AuthContextType = {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
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
