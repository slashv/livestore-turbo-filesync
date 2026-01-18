import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import type { Plugin } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

// Plugin to serve wasm-vips wasm files with correct MIME type in dev mode
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
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    plugins: [
      wasmVipsPlugin(),
      wasm(),
      topLevelAwait(),
      react(),
      viteStaticCopy({
        targets: [
          {
            src: path.resolve(
              __dirname,
              '../../node_modules/.pnpm/wasm-vips@0.0.16/node_modules/wasm-vips/lib/vips.wasm'
            ),
            dest: 'wasm-vips',
          },
        ],
      }),
    ],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src/renderer'),
      },
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    worker: {
      format: 'es',
    },
    server: {
      fs: { strict: false },
      headers: {
        // Required for wasm-vips SharedArrayBuffer support
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    optimizeDeps: {
      exclude: ['@livestore/wa-sqlite', 'wasm-vips'],
    },
    assetsInclude: ['**/*.wasm'],
  },
})
