import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a dashboard reloading itself mid-read is how you lose the number
      // you were looking at. The user decides when to take the new version.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DoneBot Admin',
        short_name: 'DoneBot Admin',
        description: 'Live operations panel for DoneBot',
        start_url: '/',
        display: 'standalone',
        background_color: '#F8F9FC',
        theme_color: '#4566EC',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // The whole point of this panel is that its numbers are current. Caching an authenticated
            // API response would defeat that, and would also leave operator-visible data sitting in the
            // browser cache of whatever device happened to open it.
            urlPattern: /\/admin\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Recharts is most of the bundle and is only needed on the overview. Splitting it keeps the
        // login screen — the one thing loaded on a phone over mobile data — small.
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
