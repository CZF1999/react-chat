/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // 本地开发用 `/`；生产构建（含 GitHub Pages）用 `/react-chat/`
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/react-chat/' : '/'),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'jat-case-dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/jat-case': {
        target: 'http://192.168.1.38:9012/jat-cms/',
        changeOrigin: true,
        ws: true,
        rewrite: (urlPath) => urlPath.replace(/^\/jat-case/, ''),
      },
    },
  },
})
