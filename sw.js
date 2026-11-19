// Regina Color – service worker: njoftimet push + instalimi si aplikacion.
// Nuk ruan kopje offline të faqes, që përditësimet të shfaqen menjëherë.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});   // e nevojshme që Chrome ta lejojë "Add to Home screen"

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {body: event.data?.text() || ''}; }
  const title = data.title || 'Regina Color';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: {url: data.url || './'},
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    vibrate: [120, 60, 120],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of all) {
      if (client.url.startsWith(self.registration.scope)) {
        await client.focus();
        client.postMessage({type: 'open', url});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
