import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Dev-mode only (npm run dev). chiefvoice-crm-backend is a fully
    // separate project/deployment now (CORS-enabled) — this proxy just
    // forwards /api calls to it during local development.
    proxy: {
      '/api': {
        target: env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
 preview: {
    allowedHosts: ['chiefvoicecrm-fe-production.up.railway.app'],
  };
})
