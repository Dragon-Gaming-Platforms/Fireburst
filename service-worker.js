const CACHE_VERSION = 'fireburst-v1';
const CORE_ASSETS = [
  '/', '/index.html', '/css/style.css', '/js/os.js', '/js/vfs.js', '/js/puter-backend.js',
  '/js/runtime-config.js', '/apps/preinstalled/file-explorer.html', '/apps/preinstalled/terminal.html',
  '/manifest.json', '/assets/images/dragon-login.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
    return res;
  }).catch(() => caches.match('/index.html'))));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
