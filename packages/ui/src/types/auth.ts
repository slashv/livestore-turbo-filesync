export interface User {
  id: string
  email: string
  name: string
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error?: { message: string } }>
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error?: { message: string } }>
  signOut: () => Promise<void>
}
