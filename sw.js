/* WallCAD offline helper. You never need to edit this file.
   It keeps a copy of the app on the phone so it opens without internet.
   New versions are installed only when the user taps "Update" in the app. */
const SHELL_CACHE = 'plancad-shell';
const SHELL_FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_FILES.map(async f => {
      if (await cache.match(f)) return;            // keep the version the user already has
      try {
        const r = await fetch(f, { cache: 'reload' });
        if (r.ok) await cache.put(f, r);
      } catch (e) { /* offline or file missing: try again next time */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;   // always ask the website
  if (url.searchParams.has('fresh') || req.cache === 'reload' || req.cache === 'no-store') return;   // update downloads go to the website
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    if (req.mode === 'navigate') {
      const hit = await cache.match('./') || await cache.match('index.html');
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r.ok) cache.put('./', r.clone());
        return r;
      } catch (e) {
        return new Response('<h3 style="font-family:sans-serif">WallCAD needs internet the first time it opens.</h3>', { headers: { 'Content-Type': 'text/html' } });
      }
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return fetch(req);
  })());
});
