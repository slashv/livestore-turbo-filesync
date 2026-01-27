import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { loadEnv } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_')

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      },
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
      plugins: [tailwindcss(), wasm(), topLevelAwait(), react()],
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
          // Required for SharedArrayBuffer support (wa-sqlite)
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
      },
      optimizeDeps: {
        exclude: ['@livestore/wa-sqlite'],
      },
    },
  }
})
