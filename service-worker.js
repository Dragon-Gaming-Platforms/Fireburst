const CACHE_VERSION = 'fireburst-v3';
const CORE_ASSETS = [
  '/', '/index.html', '/css/style.css', '/js/os.js', '/js/vfs.js', '/js/puter-backend.js',
  '/js/runtime-config.js', '/apps/preinstalled/file-explorer.html', '/apps/preinstalled/terminal.html',
  '/system/cheerpj-runner.html', '/system/cheerpx-runner.html', '/manifest.json', '/assets/images/dragon-login.png'
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
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
    const needsCheerpXIsolation = url.pathname.endsWith('/system/cheerpx-runner.html') || url.pathname.includes('/vendor/cheerpx/');
    const response = needsCheerpXIsolation
      ? new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: withCheerpXHeaders(res.headers)
        })
      : res;
    const copy = response.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => {
    if (event.request.mode === 'navigate') return caches.match('/index.html');
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  })));
});

function withCheerpXHeaders(sourceHeaders) {
  const headers = new Headers(sourceHeaders);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  return headers;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
