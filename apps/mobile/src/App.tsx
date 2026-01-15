import { Suspense } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { StoreRegistry } from '@livestore/livestore'
import { StoreRegistryProvider } from '@livestore/react'
import { unstable_batchedUpdates as batchUpdates } from 'react-native'
import { TodoApp } from './components/TodoApp'

// Create store registry with batch updates for React Native
const storeRegistry = new StoreRegistry({
  defaultOptions: { batchUpdates },
})

function LoadingFallback() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#b83f45" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreRegistryProvider storeRegistry={storeRegistry}>
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />
          <Suspense fallback={<LoadingFallback />}>
            <TodoApp />
          </Suspense>
        </SafeAreaView>
      </StoreRegistryProvider>
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
