const STATIC_CACHE = 'dicoding-story-static-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];
const API_CACHE = 'dicoding-story-api-v1';
const RUNTIME_CACHE = 'dicoding-story-runtime-v1';
const API_ORIGIN = 'https://story-api.dicoding.dev';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, API_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === API_ORIGIN && url.pathname.startsWith('/v1/stories')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstRuntime(request));
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {};
  const title = payload.title || 'New story published';
  const options = {
    badge: '/icons/icon-192.png',
    body: payload.options?.body || payload.body || 'A new story is available now.',
    data: payload.options?.data || payload.data || {},
    icon: payload.options?.icon || payload.icon || '/icons/icon-192.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const storyId = event.notification.data?.storyId;
  const targetUrl = storyId ? `/#/stories/${storyId}` : '/#/';

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return caches.match('/index.html');
  }
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

async function cacheFirstRuntime(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone());
  return response;
}
