// beacon — cache-first + stale-while-revalidate offline shell.
//
// Loads instantly from cache, even offline. On every navigation it serves
// the cached index.html immediately, then re-fetches in the background,
// byte-compares against the cached copy, updates the cache, and — if the
// bytes changed — messages the page so it can show a "reload to update"
// toast. No manual version bump is needed to ship an update: the byte
// comparison detects new deploys. The cache name is just a namespace.

const CACHE = 'beacon-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './fonts/barlow-400.woff2',
  './fonts/barlow-500.woff2',
  './fonts/barlow-600.woff2',
  './fonts/spacemono-400.woff2',
  './fonts/spacemono-700.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;  // leave cross-origin alone
  e.respondWith(handle(req));
});

async function handle(req) {
  const cache = await caches.open(CACHE);

  // Navigation (incl. share_target ?url=…): serve the cached shell now,
  // refresh in the background (stale-while-revalidate).
  if (req.mode === 'navigate') {
    const cached = await cache.match('./index.html', { ignoreSearch: true });
    if (cached) { revalidate('./index.html', cache, cached); return cached; }
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put('./index.html', fresh.clone()).catch(() => {});
      return fresh;
    } catch (err) {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
      throw err;
    }
  }

  // Other assets (fonts, icons, manifest): cache-first.
  const cached = await cache.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
  return fresh;
}

// Re-fetch the shell, byte-compare against the cached copy, replace the
// cache, and notify clients if it changed. Errors are swallowed — a failed
// background refresh must never break the user's session.
async function revalidate(key, cache, cached) {
  try {
    const fresh = await fetch(key, { cache: 'no-store' });
    if (!fresh || !fresh.ok) return false;
    const a = await cached.clone().arrayBuffer();
    const b = await fresh.clone().arrayBuffer();
    await cache.put(key, fresh.clone());
    if (!bytesEqual(a, b)) {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clients) client.postMessage({ type: 'beacon:update-available' });
      return true;
    }
    return false;
  } catch { return false; }  // offline / failed — treat as no change
}

function bytesEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a), vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  return true;
}

// Manual "check for updates": the page posts beacon:check-now with a reply
// port; we revalidate the shell and reply when done. If a new version is
// found, revalidate has already posted beacon:update-available separately.
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type !== 'beacon:check-now') return;
  const reply = event.ports && event.ports[0];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match('./index.html', { ignoreSearch: true });
    let updated = false;
    if (cached) {
      updated = await revalidate('./index.html', cache, cached);
    } else {
      try {
        const r = await fetch('./index.html', { cache: 'no-store' });
        if (r.ok) await cache.put('./index.html', r.clone());
      } catch {}
    }
    if (reply) reply.postMessage({ type: 'beacon:check-complete', updated, at: Date.now() });
  })());
});
