import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const APP_BASE = '/kgpwa';

export default defineConfig({
  base: APP_BASE,
  define: {
    'import.meta.env.APP_BASE': JSON.stringify(APP_BASE),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Knowledge Graph',
        short_name: 'KG',
        description: 'Personal knowledge graph editor',
        theme_color: '#01696f',
        background_color: '#171614',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/xstate') || id.includes('node_modules/@xstate')) return 'xstate';
          if (id.includes('node_modules/react-router')) return 'router';
          if (id.includes('node_modules/idb')) return 'idb';
          if (id.includes('node_modules/workbox')) return 'workbox';
        },
      },
    },
  },
});
