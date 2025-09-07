importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { core, precaching, routing, strategies } = workbox;

core.skipWaiting();
core.clientsClaim();

precaching.precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for API requests
routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new strategies.NetworkFirst({
    cacheName: 'api-cache'
  })
);

// Runtime caching for static resources
routing.registerRoute(
  ({ request }) => ['style', 'script', 'image'].includes(request.destination),
  new strategies.StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);

const SYNC_TAG = 'sync-sessions';
const DB_NAME = 'trauma-sync';
const STORE_NAME = 'queue';

self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg.type === 'queue-session') {
    event.waitUntil(
      queueRequest(msg.id, msg.data, msg.token).then(() => {
        return self.registration.sync.register(SYNC_TAG);
      })
    );
  }
});

self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processQueue());
  }
});

function openDb () {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function queueRequest (id, data, token) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ data, token }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll () {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const dataReq = store.getAll();
    const keyReq = store.getAllKeys();
    tx.oncomplete = () => {
      const items = keyReq.result.map((id, i) => ({ id, value: dataReq.result[i] }));
      resolve(items);
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function clear (id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function processQueue () {
  const items = await getAll();
  for (const { id, value } of items) {
    const { data, token } = value;
    try {
      const res = await fetch(`/api/sessions/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
      });
      if (res.ok) await clear(id);
    } catch (e) {
      // Leave in queue for next sync
    }
  }
}

