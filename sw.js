/* 好康复 web 2.0: keeps the app on the phone so it opens without a network; updates arrive on the next launch */
const CACHE = 'hkf-8a598e4edc';
const FILES = ['./', 'voice.mp3', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hkf-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const SCOPE = new URL(self.registration.scope);
const ASSETS = new Set(FILES.filter(f => f !== './').map(f => new URL(f, SCOPE).pathname));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), root = SCOPE.pathname;
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    if (url.pathname !== root && url.pathname !== root + 'index.html') return;   /* other addresses (like /app) go to the network */
    /* the page: straight from the phone, then a fresh copy is saved for next time */
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match('./');
      const net = fetch(req).then(r => { if (r.ok && r.type === 'basic') c.put('./', r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    }));
    return;
  }
  if (!ASSETS.has(url.pathname)) return;   /* only the app's own files are kept; the installer and other pages come from the network */
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(r => {
    if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
