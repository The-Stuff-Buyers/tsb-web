const CACHE_NAME = 'tsb-v2';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'You appear to be offline.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tsb-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

async function syncSubmissions() {
  const DB_NAME = 'tsb-offline-queue';
  const STORE = 'submissions';

  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const records = await new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
  });

  const pending = records.filter(r => r.status === 'pending' || r.status === 'retrying');

  for (const record of pending) {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.payload),
      });
      if (res.ok) {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(record.id);
        await new Promise(r => { tx.oncomplete = r; });
      }
    } catch (_) {
      // Network still unavailable — SW will retry on next sync event
    }
  }
}
