import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate', not 'prompt'.
      //
      // 'prompt' was the first instinct — a dashboard reloading itself mid-read is how you lose the
      // number you were looking at — but it only works if something actually offers the update, and a
      // prompt UI was never built. The result was a service worker that installed every new version and
      // then waited forever, serving the first build it ever cached. That shipped a broken Google
      // client id to a browser that had no way to ever move past it, while the file on the server was
      // correct the whole time — a failure with no visible cause from either end.
      //
      // For an operations panel, always-current wins: stale code is a worse failure than a reload.
      registerType: 'autoUpdate',
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
        // Take over immediately rather than waiting for every tab to close — otherwise a pinned tab
        // keeps the old worker, and its cache, alive indefinitely.
        clientsClaim: true,
        skipWaiting: true,
        // Never let a stale index.html survive and keep pointing at asset hashes that no longer exist.
        cleanupOutdatedCaches: true,
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
