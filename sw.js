const CACHE = 'audio-insight-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    // API calls and external CDN always go to network
    const url = new URL(e.request.url);
    if (url.pathname.startsWith('/api/') ||
        url.hostname !== self.location.hostname) {
        return;
    }

    // Cache-first for local assets
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
        }))
    );
});
