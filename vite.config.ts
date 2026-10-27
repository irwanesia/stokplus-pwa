import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icons/icon.svg',
        'icons/maskable.svg',
        'icons/apple-touch-icon-180x180.png',
      ],
      manifest: {
        id: '/',
        name: 'StokPlus',
        short_name: 'StokPlus',
        description:
          'Stok, penjualan, pembelian, beban, dan laba untuk usaha frozen food — local-first.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1E2A78',
        background_color: '#F7F5F1',
        categories: ['business', 'productivity'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Catat penjualan',
            short_name: 'Penjualan',
            description: 'Buka form penjualan baru.',
            url: '/transaksi/penjualan/baru',
            icons: [{ src: 'icons/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Catat pembelian',
            short_name: 'Pembelian',
            description: 'Buka form pembelian baru.',
            url: '/transaksi/pembelian/baru',
            icons: [{ src: 'icons/icon-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})
