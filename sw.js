/* Wrap-Up service worker.
   index.html — network-first (свежий при обновлении, кэш в офлайне).
   статика (иконка, Chart.js, шрифты) — cache-first.
   данные (script.google.com) — мимо кэша. */
const C = 'wrapup-v1';
const SHELL = ['./', './index.html', './icon.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.indexOf('script.google.com') > -1) return; // данные — всегда из сети

  const isDoc = e.request.mode === 'navigate' ||
    (u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('index.html')));

  if (isDoc) { // network-first
    e.respondWith(
      fetch(e.request).then(resp => { const cp = resp.clone(); caches.open(C).then(c => c.put(e.request, cp)); return resp; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // cache-first для остального
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const ok = resp && resp.ok &&
        (u.origin === location.origin || u.hostname.indexOf('cdnjs') > -1 || u.hostname.indexOf('gstatic') > -1 || u.hostname.indexOf('googleapis') > -1);
      if (ok) { const cp = resp.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
