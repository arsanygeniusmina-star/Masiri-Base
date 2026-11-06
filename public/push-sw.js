// Loaded into the app's service worker (vite.config.ts → workbox.importScripts).
// Shows push notifications even when the app is closed, and opens the right page on tap.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const icon = '/masiri-journey-icon.jpg?v=20261010-2';
  event.waitUntil(
    self.registration.showNotification(data.title || 'THE APOSTLES', {
      body: data.body || '',
      icon,
      badge: icon,
      tag: data.tag,
      renotify: Boolean(data.tag),
      lang: 'ar',
      dir: 'rtl',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          try {
            await client.navigate(target);
          } catch (error) {
            // Some browsers block navigate(); focusing is still fine.
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
