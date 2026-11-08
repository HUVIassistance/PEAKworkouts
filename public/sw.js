/* PEAK — service worker minimal.
 * Sert uniquement à afficher les notifications de repos quand l'app est en
 * arrière-plan (Android Chrome refuse `new Notification()` depuis une page ;
 * il faut passer par l'enregistrement du service worker).
 * Pas de cache : on laisse le réseau faire son travail.
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', () => {
  /* pass-through volontaire */
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'notify') return;

  event.waitUntil(
    self.registration.showNotification(data.title || 'PEAK', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'peak-rest',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c);
      if (client) return client.focus();
      return self.clients.openWindow('/');
    })
  );
});
