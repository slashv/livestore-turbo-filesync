import type { ConfigContext, ExpoConfig } from 'expo/config'

// Default to localhost for development safety
// In production builds (EAS), these are set via eas.json environment variables
const DEFAULT_DEV_SERVER = 'http://localhost:8787'

// Use environment variables if provided, otherwise default to localhost (dev-safe)
// For production, set these via eas.json or CI environment
const syncUrl = process.env.LIVESTORE_SYNC_URL ?? `${DEFAULT_DEV_SERVER}/sync`
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
