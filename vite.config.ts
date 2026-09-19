import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    netlify({
      // Deno edge emulation is broken in some environments; this app uses Functions + Blobs only.
      edgeFunctions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'shared'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
