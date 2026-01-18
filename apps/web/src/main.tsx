import { StoreRegistry } from '@livestore/livestore'
import { StoreRegistryProvider } from '@livestore/react'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import './styles.css'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create store registry with batch updates for React
const storeRegistry = new StoreRegistry({
  defaultOptions: { batchUpdates },
})

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StoreRegistryProvider storeRegistry={storeRegistry}>
    <RouterProvider router={router} />
  </StoreRegistryProvider>
)
