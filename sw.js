const CACHE_NAME = 'recipe-pwa-v2';

// Static App Shell assets to cache immediately on install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './recipes/index.json',
  './icons/favicon-32x32.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 1. Install Event: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if version changes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Network-First Strategy for Recipes, Cache-First for Shell
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Strategy A: Stale-While-Revalidate for individual JSON recipes
  // Serves cached recipe instantly if offline, but updates cache when online
 self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Stale-While-Revalidate Strategy for JSON files (catalog & recipes)
  if (requestUrl.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Fetch network version in parallel to update cache
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse); // Fallback to cache if offline

          // Return cached version immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Cache-First Strategy for static UI assets (HTML, CSS, JS, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

  // Strategy B: Cache-First for static assets (HTML, CSS, JS, Images, Icons)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache external image URLs (e.g., Unsplash) as users view them
        if (event.request.destination === 'image' && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Allow app to force new Service Worker activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});