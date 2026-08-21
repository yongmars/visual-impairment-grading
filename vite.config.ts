import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'vig_icon192.png', 'vig_icon512.png',
        'normal.png', 'central.png', 'eccentric.png', 'peripheral.png', 'separation.png',
      ],
      manifest: {
        name: '視覚障害等級判定',
        short_name: '等級判定',
        description: '視力・視野検査結果から視覚障害等級の計算と確認を補助する業務用PWA',
        theme_color: '#1d4ed8',
        background_color: '#eef4fb',
        display: 'standalone',
        start_url: '/',
        lang: 'ja',
        icons: [
          { src: '/vig_icon192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/vig_icon512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false
      }
    })
  ]
})
