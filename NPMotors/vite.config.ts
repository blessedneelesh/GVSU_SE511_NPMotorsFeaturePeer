import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Same-origin calls (http://localhost:5173/Customer/...) forwarded to the .NET Customer API;
      // avoids CORS and the self-signed dev certificate. Case-sensitive, so the /customers page route is unaffected.
      '/Customer': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
