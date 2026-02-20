/* Service Worker — Mindful Life AI PWA */

const CACHE_NAME = 'mindful-v1';
const PRECACHE = [
    '/',
    '/static/style.css',
    '/static/app.js',
    '/static/icon-512.png',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // API calls: network-first (always fresh data)
    if (url.pathname.startsWith('/api/')) {
        e.respondWith(
            fetch(e.request)
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Static assets: cache-first
    e.respondWith(
        caches.match(e.request).then(cached => {
            const fetchPromise = fetch(e.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return response;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
