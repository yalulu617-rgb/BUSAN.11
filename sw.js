// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored Service Worker
// ─────────────────────────────────────────────────────────────────────────
// Rules:
// - Cache ONLY local files that physically exist in this repository
// - Do NOT cache CDN URLs (Firebase, FontAwesome, Google Fonts, wttr.in, etc.)
// - Each file cached individually so one 404 never kills the install
// ─────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'busan-trip-v41-refactored-v3';

const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './13972.png',
    './style.css',
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
    './services/nearby.js',
    './services/utils.js',
    './data/recommended.js',
    './data/places.json',
    './data/restaurants.json',
    './data/hotels.json',
    './data/tickets.json',
    './js/firebase.js',
    './js/ui.js',
    './js/wallet.js',
    './js/memory.js',
    './js/itinerary.js',
    './js/app.js',
    './components/renderers.js'
];

// Domains that must ALWAYS go to network (never cache)
const NETWORK_ONLY_DOMAINS = [
    'firebase',
    'firebaseio',
    'gstatic.com',
    'googleapis.com',
    'imgbb.com',
    'exchangerate-api.com',
    'wttr.in',
    'cdnjs.cloudflare.com',
    'fonts.gstatic.com'
];

function isNetworkOnly(url) {
    return NETWORK_ONLY_DOMAINS.some(d => url.includes(d));
}

// ── Install: cache each asset individually so one failure doesn't abort all ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            const results = await Promise.allSettled(
                LOCAL_ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn('[SW] Failed to cache:', url, err.message);
                    })
                )
            );
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) console.warn(`[SW] ${failed} assets failed to cache — continuing install`);
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: remove all old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: cache-first for local, network-only for external ──
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Always use network for external APIs
    if (isNetworkOnly(url)) {
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
        return;
    }

    // Cache-first for local assets
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET' && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => {
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// ── Message: skipWaiting for update banner ──
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
