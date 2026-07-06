// ChamCard PRO - High-Fidelity Offline-First Service Worker
const CACHE_NAME = 'chamcard-pro-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css'
];

// Open and retrieve a value from IndexedDB inside Service Worker
function getFromIndexedDB(storeName, key) {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("cham_card_pro_offline_db", 1);
      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(null);
          return;
        }
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          resolve(getReq.result);
        };
        getReq.onerror = () => {
          resolve(null);
        };
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn("Pre-caching assets warning:", err);
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Check if it's an API request we want to make Offline-First with IndexedDB fallback
  if (url.pathname === '/api/dashboard') {
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          return response;
        })
        .catch(async () => {
          console.log("[SW] Serving dashboard from IndexedDB...");
          const dbData = await getFromIndexedDB("kv", "dashboard_data");
          if (dbData) {
            return new Response(JSON.stringify(dbData), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          // Fallback static structure if DB is empty
          return new Response(JSON.stringify({ cards: [], transactions: [], user: null }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  if (url.pathname === '/api/offers') {
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          return response;
        })
        .catch(async () => {
          console.log("[SW] Serving offers from IndexedDB...");
          const dbData = await getFromIndexedDB("kv", "offers_data");
          if (dbData) {
            return new Response(JSON.stringify(dbData), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  if (url.pathname === '/api/buses/locations') {
    e.respondWith(
      fetch(e.request)
        .then(async (response) => {
          return response;
        })
        .catch(async () => {
          console.log("[SW] Serving bus locations from IndexedDB...");
          const dbData = await getFromIndexedDB("kv", "buses_locations");
          if (dbData) {
            return new Response(JSON.stringify(dbData), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Handle CSS, HTML, JS assets and CDN imports (Tailwind, Google Fonts, Leaflet, etc.)
  const isStaticAsset = 
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.includes('/assets/') ||
    e.request.url.includes('cdn.tailwindcss.com') ||
    e.request.url.includes('unpkg.com') ||
    e.request.url.includes('fonts.googleapis.com') ||
    e.request.url.includes('fonts.gstatic.com') ||
    e.request.url.includes('esm.sh');

  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch new version in background to update cache (Stale-While-Revalidate)
          fetch(e.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and request is an HTML page, fallback to root shell
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
    );
    return;
  }

  // Default network-only strategy for general resources (API writes, logins, etc.)
  e.respondWith(fetch(e.request));
});
