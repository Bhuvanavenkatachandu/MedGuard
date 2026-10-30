import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
      proxy: {
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/resend/, ''),
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || ''}`
          }
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            pdf: ['jspdf', 'jspdf-autotable'],
            icons: ['lucide-react'],
          }
        }
      }
    }
  }
})
