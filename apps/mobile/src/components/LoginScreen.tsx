import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
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

  const handleSubmit = async () => {
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>todos</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>

        {mode === 'register' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              testID="name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="email-input"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="password-input"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
            placeholderTextColor="#999"
            secureTextEntry
          />
        </View>

        {error ? (
          <Text testID="auth-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          testID={mode === 'login' ? 'login-button' : 'register-button'}
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="toggle-auth-mode"
          onPress={toggleMode}
          style={styles.toggleButton}
        >
          <Text style={styles.toggleText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '100',
    color: '#b83f45',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#b83f45',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#b83f45',
    fontSize: 14,
    fontWeight: '500',
  },
})
