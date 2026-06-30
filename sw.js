const CACHE_NAME = 'busan-trip-v41.2-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './13972.png',
  './assets/css/style.css',
  './services/storage.js',
  './services/network.js',
  './services/nearby.js',
  './js/firebase.js',
  './js/ui.js',
  './js/maps.js',
  './js/wallet.js',
  './js/memory.js',
  './js/itinerary.js',
  './js/app.js',
  './data/places.json',
  './data/restaurants.json',
  './data/hotels.json',
  './data/tickets.json',
  './ute/ute_storage.js',
  './ute/ute_network.js',
  './ute/ute_knowledge.js',
  './ute/ute_place.js',
  './ute/ute_city.js',
  './ute/ute_weather.js',
  './ute/ute_navigation.js',
  './ute/ute_budget.js',
  './ute/ute_ai.js',
  './ute/ute_context.js',
  './ute/ute_main.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('api.imgbb.com') || 
      event.request.url.includes('exchangerate-api.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
