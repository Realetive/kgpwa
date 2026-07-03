/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Cache version — bump to force invalidation of all old caches
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  pages: `pages-${CACHE_VERSION}`,
  assets: `assets-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`,
} as const;

cleanupOutdatedCaches();
enableNavigationPreload();

// On activate: delete ALL old caches that don't match current CACHE_VERSION
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const currentCaches = Object.values(CACHE_NAMES);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) =>
            (key.startsWith('pages-') ||
              key.startsWith('assets-') ||
              key.startsWith('images-') ||
              key.startsWith('api-cache-')) &&
            !((currentCaches as readonly string[]).includes(key)),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: CACHE_NAMES.pages,
    networkTimeoutSeconds: 3,
  }),
);

// Don't cache Vite dev resources (@vite/*) — they change between sessions
registerRoute(
  ({ request, url }) => {
    if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh') || url.pathname.startsWith('/@id')) {
      return false;
    }
    return ['script', 'style', 'font'].includes(request.destination);
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.assets,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ] as never,
  }),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ] as never,
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60,
      }),
    ] as never,
  }),
);

self.addEventListener('install', () => {
  self.skipWaiting();
});
