const CACHE = 'taskflow-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Network-first for API and auth endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached =>
          cached || new Response(JSON.stringify({ detail: 'You are offline.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    );
    return;
  }

  // Cache-first for static assets — store on first fetch
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first with offline HTML fallback for navigation
  e.respondWith(
    fetch(request).catch(() =>
      caches.match('/').then(cached =>
        cached || new Response('<h1>Taskflow is offline</h1>', {
          headers: { 'Content-Type': 'text/html' },
        })
      )
    )
  );
});
