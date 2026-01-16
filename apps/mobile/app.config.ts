import type { ConfigContext, ExpoConfig } from 'expo/config'

// Parse sync URL to get API base URL
const syncUrl = process.env.LIVESTORE_SYNC_URL ?? 'http://localhost:8787/sync'
const apiUrl = syncUrl.replace('/sync', '')

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LiveStore Todo',
  slug: 'livestore-todo',
  scheme: 'livestore-todo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.livestore.todo',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.livestore.todo',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    // API URL for authentication
    API_URL: apiUrl,
    // Sync URL for LiveStore
    LIVESTORE_SYNC_URL: syncUrl,
  },
})
