import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:9000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-router', 'react-redux', '@reduxjs/toolkit'],
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'react-toastify', 'react-bootstrap', 'react-virtuoso'],
          'vendor-charts': ['echarts'],
          'vendor-firebase': ['firebase/app', 'firebase/messaging'],
          'vendor-utils': ['axios', 'socket.io-client', 'html-to-image', 'html2canvas'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
    minify: 'esbuild',
    sourcemap: false,
    cssMinify: true,
  },
})
