import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
})
