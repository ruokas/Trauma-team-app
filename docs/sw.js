importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { core, precaching, routing, strategies } = workbox;

core.skipWaiting();
core.clientsClaim();

precaching.precacheAndRoute([{"revision":"d5bf992adda29b35f8c41a223740f7ea","url":"assets/partials/topbar.html"},{"revision":"002be98c085ac7cc94b08f5a379d1f04","url":"css/main.css"},{"revision":"a1dd56bd0de3535695cea44e45bc910a","url":"index.html"},{"revision":"d2aa05681d154902021a6327f7959f11","url":"js/__fixtures__/zoneConfig.js"},{"revision":"3b16060ff8ef5d60c924ebd8e68532f7","url":"js/actions.js"},{"revision":"e468d0dcc538aac2d5fc0f736e903897","url":"js/activation.js"},{"revision":"6c2e63a9120bf3d5548e2b229e2df7b4","url":"js/alerts.js"},{"revision":"5ad6d048385fea1b0a04750ec2c6139d","url":"js/app.js"},{"revision":"2249f1fc46916c7a49af8d1420977e6b","url":"js/arrival.js"},{"revision":"1e4849b18435abff7b004eaa73959630","url":"js/autoActivate.js"},{"revision":"a00d52457dcda90549fc62e3bd4e5466","url":"js/bodyMap.js"},{"revision":"d50505005bfacc5fea0608611e868999","url":"js/BodyMapTools.js"},{"revision":"376b9ae3b18cc7738f94364643700c4b","url":"js/bodyMapZones.js"},{"revision":"422f90422e262b88b970b88b62808fce","url":"js/chipData.js"},{"revision":"bb7fae1fda446fb4cd08bb7fe43b7440","url":"js/chipGroup.js"},{"revision":"f40c8837b00f0b3d4d556b2e79d46ebb","url":"js/chips.js"},{"revision":"3fbad6c292db1641a1b76cf73820c13e","url":"js/chipState.js"},{"revision":"395b1633252878543475e5c2d6a90b9e","url":"js/circulation.js"},{"revision":"5e319bd01dd71e2c048d9b8927f34726","url":"js/components/BodyMap.js"},{"revision":"e981bd69610dbf9532758b0621c19f4c","url":"js/components/modal.js"},{"revision":"a1af21c25428a31570b0c2cd6e254790","url":"js/components/toast.js"},{"revision":"6b81bc5544982953954456f61f8d2d96","url":"js/components/topbar.js"},{"revision":"1fbbf9e4c66695658c5fd795b8d2872f","url":"js/config.js"},{"revision":"0648083d247aa9738edb53e510b0c1a1","url":"js/constants.js"},{"revision":"01086c9911497a35000ffd1dd4ce1e7b","url":"js/domToggles.js"},{"revision":"c743108409cbc1118b1f8081b72bf487","url":"js/fastGrid.js"},{"revision":"7b4d46b3529d8b66769e7f1146bcbbd5","url":"js/formSerialization.js"},{"revision":"66683b12b657c285b7ff91e8b479d69a","url":"js/gcs.js"},{"revision":"de3bf104c9f44ab608a4c19cfad25daa","url":"js/headerActions.js"},{"revision":"e6c65801ec6c703f436cb7897afcbc44","url":"js/lib/jspdf.umd.min.js"},{"revision":"be57595b4a069a4415e303d374c67044","url":"js/mechanismList.js"},{"revision":"d4fc906cbbc6d5772466a3566b08764a","url":"js/report.js"},{"revision":"013bb2edcfd9b286bbcea069a067f73b","url":"js/sections.js"},{"revision":"89a206e91ab460c019609419a4f34cdc","url":"js/sessionApi.js"},{"revision":"689d915d165af2b346befcfe36aeb49d","url":"js/sessionManager.js"},{"revision":"0efcc5ccd2a32c79b1ac7619b5bf48b5","url":"js/sessionUI.js"},{"revision":"7d1483663ec089fd84f1ee20568d5087","url":"js/tabs.js"},{"revision":"1a75fe2db04b82c5df8d61926caf4f1e","url":"js/teamGrid.js"},{"revision":"c2f413f1cb07ff27a1ecb485f34e904f","url":"js/utils.js"},{"revision":"f923543f31063064208d1575e36d0cac","url":"js/validation.js"},{"revision":"b77fe2ad17994ac4072ffbfb869f4f13","url":"js/woundEditor.js"}]);

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

