const CACHE_NAME = 'kasirme-v1.3'
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  const isNavigation = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')

  if (isNavigation) {
    // Network-first untuk HTML, agar selalu dapat referensi asset terbaru
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone))
          }
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Cache-first untuk asset lain (JS/CSS hashed, gambar, dll)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const resClone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone))
        }
        return res
      }).catch(() => cached)
    })
  )
})
