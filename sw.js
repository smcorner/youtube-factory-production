const CACHE_NAME = 'yt-factory-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/storage.js',
  './js/crypto.js',
  './js/prompts.js',
  './js/channels.js',
  './js/batch.js',
  './js/editor.js',
  './js/srt.js',
  './js/trend.js',
  './js/analytics.js',
  './js/repurpose.js',
  './js/hooks.js',
  './js/ctr.js',
  './js/seo.js',
  './js/thumbnail.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('openrouter.ai')) return;

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});