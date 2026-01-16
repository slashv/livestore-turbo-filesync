import { useState } from 'react'
import { useAuth } from './AuthProvider'

type AuthMode = 'login' | 'register'

export function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Name is required')
        setIsLoading(false)
        return
      }
      const result = await signUp(email, password, name)
      if (result.error) {
        setError(result.error.message)
      }
    } else {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error.message)
      }
    }
    setIsLoading(false)
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full mx-4">
        <h1 className="text-4xl font-thin text-center text-rose-800 mb-8">todos</h1>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h2 className="text-xl font-medium text-gray-800 mb-6 text-center">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  data-testid="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
            </div>

            {error && (
              <div data-testid="auth-error" className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              data-testid={mode === 'login' ? 'login-button' : 'register-button'}
              disabled={isLoading}
              className="w-full py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="toggle-auth-mode"
              onClick={toggleMode}
              className="text-rose-600 hover:text-rose-700 text-sm font-medium"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
