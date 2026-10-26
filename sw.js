/* Value Shoots — offline support for the team page (and the Derma Finder + Product Hub inside it).
   Pages and data: network first, cached copy when offline. Files: served from cache, refreshed in the background.
   The page sends SAVE_ALL with every file URL so the whole library is available offline. */
const SHELL = 'vs-shell-v2', DATA = 'vs-data-v1', FILES = 'vs-files-v1';
const SCOPE = self.registration.scope;
const CORE = ['', 'index.html', 'data.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'derma/', 'derma/team.js', 'products/', 'products/catalog.json', 'assets/index.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(CORE.map(p => c.add(new Request(SCOPE + p, { cache: 'reload' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, DATA, FILES];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// one cache key per resource: drop cache-busting params (t, v, x)
function key(u) {
  const url = new URL(u);
  ['t', 'v', 'x', '_'].forEach(p => url.searchParams.delete(p));
  if (url.origin + url.pathname === SCOPE.replace(/\/$/, '') ) url.pathname += '/';
  if (url.pathname.endsWith('/index.html')) url.pathname = url.pathname.slice(0, -10);
  url.hash = '';
  return url.toString();
}
const isFile = url => /\/assets\/(f|t|p)\//.test(url.pathname) || /\/products\/stock\//.test(url.pathname)
  || /\.(png|jpe?g|webp|gif|svg|pdf|woff2?|ttf|mjs|wasm|bcmap|pfb)$/i.test(url.pathname)
  || /googleusercontent\.com$|^fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$|^unpkg\.com$/.test(url.hostname) && !/script\.googleusercontent/.test(url.hostname);

async function networkFirst(req, cacheName, wait) {
  const k = key(req.url), cache = await caches.open(cacheName);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(k, r.clone()); return r; });
  const cached = cache.match(k).then(r => r || caches.match(k));
  try {
    return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), wait))]);
  } catch (err) {
    const c = await cached;
    if (c) return c;
    try { return await net; } catch (e2) {
      if (req.mode === 'navigate') { const shell = await caches.match(SCOPE); if (shell) return shell; }
      return new Response('', { status: 504, statusText: 'offline' });
    }
  }
}
async function cacheFirst(req) {
  const k = key(req.url), cache = await caches.open(FILES);
  const hit = await cache.match(k);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(k, r.clone()); return r; }).catch(() => null);
  if (hit) return hit;
  return (await net) || new Response('', { status: 504, statusText: 'offline' });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.href.startsWith(SCOPE)) {
    if (isFile(url)) return e.respondWith(cacheFirst(req));
    return e.respondWith(networkFirst(req, SHELL, req.mode === 'navigate' ? 3500 : 5000));
  }
  if (/script\.google\.com$|script\.googleusercontent\.com$|docs\.google\.com$/.test(url.hostname)) return e.respondWith(networkFirst(req, DATA, 8000));
  if (isFile(url)) return e.respondWith(cacheFirst(req));
});

// Save everything for offline use. Reports progress to the page.
let saving = false;
self.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type !== 'SAVE_ALL' || saving) return;
  saving = true;
  e.waitUntil((async () => {
    const cache = await caches.open(FILES), want = new Set(m.urls.map(key));
    const have = new Set((await cache.keys()).map(r => r.url));
    const todo = [...want].filter(u => !have.has(u) || (m.refresh || []).map(key).includes(u));
    let done = 0, failed = 0; const total = todo.length;
    const tell = async final => { for (const c of await self.clients.matchAll()) c.postMessage({ type: 'SAVE_PROGRESS', done, total, failed, final, count: want.size }); };
    await tell(false);
    const worker = async () => {
      while (todo.length) {
        const u = todo.shift();
        try {
          const cross = !u.startsWith(SCOPE);
          const r = await fetch(u, cross ? { mode: 'no-cors' } : { cache: 'no-cache' });
          if (r.ok || r.type === 'opaque') await cache.put(u, r); else failed++;
        } catch (err) { failed++; }
        done++; if (done % 5 === 0) await tell(false);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    // drop library files that are no longer in the library
    for (const r of await cache.keys()) if (/\/assets\/(f|t|p)\//.test(r.url) && !want.has(r.url)) await cache.delete(r);
    for (const c of await self.clients.matchAll()) c.postMessage({ type: 'SAVE_PROGRESS', done: total, total, failed, final: true, count: want.size });
    saving = false;
  })());
});
