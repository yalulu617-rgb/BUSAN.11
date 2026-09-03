// ─────────────────────────────────────────────────────────────────────────
// V45 Production Service Worker
// ─────────────────────────────────────────────────────────────────────────
// Rules:
// - Cache ONLY local files that physically exist in this repository
// - Do NOT cache CDN URLs (Firebase, FontAwesome, Google Fonts, wttr.in, etc.)
// - Network-first for Critical App Shell (HTML, JS, CSS, JSON) to ensure instant updates
// - Cache-first with network fallback for static media (images, icons)
// ─────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'busan-trip-v45-production-v4-image1';

const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    './13972.png',
    './style.css',
    './assets/css/item-images.css',
    './assets/images/scentica-gwangan-thumb.webp',
    './assets/images/scentica-gwangan.webp',
    './assets/images/olive-young-nampo-thumb.webp',
    './assets/images/olive-young-nampo.webp',
    './data/release.json',
    './data/recommended.js',
    './data/travel-content.js',
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
    './services/nearby.js',
    './services/utils.js',
    './services/item-images.js',
    './js/firebase.js',
    './js/ui.js',
    './js/wallet.js',
    './js/memory.js',
    './js/itinerary.js',
    './components/renderers.js',
    './js/app.js'
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

// ── Install: precache local assets and immediately take over ──
self.addEventListener('install', event => {
    self.skipWaiting();
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
        })
    );
});

// ── Activate: aggressively remove all previous/stale caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Purging old cache:', key);
                    return caches.delete(key);
                }
            }))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch strategy ──
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 1. External APIs: Network only
    if (isNetworkOnly(url)) {
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
        return;
    }

    // 2. Critical Application Shell (HTML navigation, JS, CSS, JSON)
    // Strategy: Network-First with offline cache fallback
    const isShell = event.request.mode === 'navigate' ||
                    /\.(html|js|css|json)($|\?)/i.test(url) ||
                    event.request.headers.get('accept')?.includes('text/html');

    if (isShell) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (event.request.method === 'GET' && response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request, { ignoreSearch: true }).then(cached => {
                        if (cached) return cached;
                        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('./index.html', { ignoreSearch: true });
                        }
                        return new Response('', { status: 503, statusText: 'Offline - Resource Unavailable' });
                    });
                })
        );
        return;
    }

    // 3. Static Media Assets (Images, Icons, Fonts)
    // Strategy: Cache-First with Network Fallback
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET' && response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => {
                return new Response('', { status: 404 });
            });
        })
    );
});

// ── Message: skipWaiting support ──
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
