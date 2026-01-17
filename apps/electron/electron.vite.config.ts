import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

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
    },
    optimizeDeps: {
      exclude: ['@livestore/wa-sqlite'],
    },
    assetsInclude: ['**/*.wasm'],
  },
})
