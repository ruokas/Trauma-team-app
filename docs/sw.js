const CACHE_NAME = 'trauma-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js'
];

const SYNC_TAG = 'sync-sessions';
const DB_NAME = 'trauma-sync';
const STORE_NAME = 'queue';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return res;
    }).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  const msg = event.data || {};
  if(msg.type === 'queue-session'){
    event.waitUntil(
      queueRequest(msg.id, msg.data, msg.token).then(() => {
        return self.registration.sync.register(SYNC_TAG);
      })
    );
  }
});

self.addEventListener('sync', event => {
  if(event.tag === SYNC_TAG){
    event.waitUntil(processQueue());
  }
});

function openDb(){
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function queueRequest(id, data, token){
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ data, token }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(){
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

async function clear(id){
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function processQueue(){
  const items = await getAll();
  for(const { id, value } of items){
    const { data, token } = value;
    try{
      const res = await fetch(`/api/sessions/${id}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
      });
      if(res.ok) await clear(id);
    }catch(e){
      // Leave in queue for next sync
    }
  }
}

