import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static_build',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8008',
      '/ws': {
        target: 'ws://localhost:8008',
        ws: true,
      },
    },
  },
})
