import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    include: "**/*.{jsx,tsx,js,ts}",
    babel: {
      plugins: []
    }
  })],
  server: {
    port: 3000,
    host: 'localhost',
    open: true
  },
  build: {
    outDir: 'build'
  },
  esbuild: {
    include: /src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'ts',
        '.tsx': 'tsx'
      }
    }
  }
})
