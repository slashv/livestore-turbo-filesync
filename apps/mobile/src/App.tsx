import { StoreRegistry } from '@livestore/livestore'
import { StoreRegistryProvider } from '@livestore/react'
import { StatusBar } from 'expo-status-bar'
import { Suspense, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { FileSyncProvider } from './components/FileSyncProvider'
import { Gallery } from './components/Gallery'
import { LoginScreen } from './components/LoginScreen'

function LoadingFallback() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}

function AuthGate() {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) {
    return <LoadingFallback />
  }

  if (!isAuthenticated || !user) {
    return <LoginScreen />
  }

  // Wrap Gallery with FileSyncProvider to enable file sync
  return (
    <FileSyncProvider userId={user.id}>
      <Gallery userId={user.id} />
    </FileSyncProvider>
  )
}

export default function App() {
  const [storeRegistry] = useState(() => new StoreRegistry())

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <StoreRegistryProvider storeRegistry={storeRegistry}>
            <SafeAreaView style={styles.container}>
              <StatusBar style="dark" />
              <AuthGate />
            </SafeAreaView>
          </StoreRegistryProvider>
        </Suspense>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
})
