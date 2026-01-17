import path from 'node:path'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    livestoreDevtoolsPlugin({ schemaPath: '../../packages/schema/src/index.ts' }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/wasm-vips/lib/vips.wasm',
          dest: 'wasm-vips',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/sync': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  worker: {
    format: 'es',
  },
})
