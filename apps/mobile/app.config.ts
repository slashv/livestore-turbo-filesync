import type { ConfigContext, ExpoConfig } from 'expo/config'

// Production URLs
const PRODUCTION_SERVER = 'https://livestore-app-server.contact-106.workers.dev'

// Use environment variables if provided, otherwise use production URLs
// In development, set LIVESTORE_SYNC_URL=http://localhost:8787/sync
const syncUrl = process.env.LIVESTORE_SYNC_URL ?? `${PRODUCTION_SERVER}/sync`
const apiUrl = process.env.API_URL ?? syncUrl.replace('/sync', '')

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
