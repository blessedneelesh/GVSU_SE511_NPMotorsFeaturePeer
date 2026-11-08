/// <reference types="vitest/config" />
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
      // Vendor endpoints live on the same .NET API. Capitalised, so the /vendors page route is unaffected.
      '/Vendor': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Employee endpoints, same API. Capitalised, so the /employees page route is unaffected.
      '/Employee': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Vehicle endpoints, same API. Capitalised, so the /vehicle-inventory page route is unaffected.
      '/Vehicle': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Part endpoints, same API. Capitalised, so the /parts-inventory page route is unaffected.
      '/Part': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Sales invoice endpoints, same API. Capitalised, so the /sales-invoices page route is unaffected.
      '/SalesInvoice': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Bank account endpoints (Banks & Accounts page, Receive Parts "Pay From" list), same API. Capitalised, so the /banks page route is unaffected.
      '/BankAccount': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Transaction endpoints, same API. Capitalised, so the /transactions page route is unaffected.
      '/Transaction': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
      // Statement line endpoints (Bank Statement page), same API. Capitalised, so the /bank-statement page route is unaffected.
      '/StatementLine': {
        target: 'https://localhost:7003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    restoreMocks: true,
    css: false,
    coverage: { provider: 'v8', include: ['src/redux/**', 'src/pages/**'], reporter: ['text', 'html'] },
  },
})
