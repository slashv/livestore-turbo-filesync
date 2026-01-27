import { StoreRegistry } from '@livestore/livestore'
import { StoreRegistryProvider } from '@livestore/react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// Create store registry with batch updates for React
const storeRegistry = new StoreRegistry({
  defaultOptions: { batchUpdates },
})

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StoreRegistryProvider storeRegistry={storeRegistry}>
    <App />
  </StoreRegistryProvider>
)
