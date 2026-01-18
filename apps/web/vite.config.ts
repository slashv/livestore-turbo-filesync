import fs from 'node:fs'
import path from 'node:path'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Plugin to serve wasm-vips wasm files with correct MIME type
function wasmVipsPlugin(): Plugin {
  return {
    name: 'wasm-vips-serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve wasm files from node_modules/wasm-vips/lib/
        if (req.url?.startsWith('/node_modules/wasm-vips/lib/') && req.url.endsWith('.wasm')) {
          const filename = req.url.replace('/node_modules/wasm-vips/lib/', '')
          const wasmPath = path.join(__dirname, 'node_modules/wasm-vips/lib', filename)

          if (fs.existsSync(wasmPath)) {
            res.setHeader('Content-Type', 'application/wasm')
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
            fs.createReadStream(wasmPath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    wasmVipsPlugin(),
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
    dedupe: ['react', 'react-dom', '@livestore/livestore', '@livestore/react', 'effect'],
  },
  server: {
    port: 5173,
    fs: { strict: false },
    headers: {
      // Required for wasm-vips SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
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
  optimizeDeps: {
    exclude: ['@livestore/wa-sqlite', 'wasm-vips'],
  },
})
