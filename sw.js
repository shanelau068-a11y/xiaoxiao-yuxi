self.addEventListener('install',event=>event.waitUntil(caches.open('yuwen-v1').then(cache=>cache.addAll(['./','./index.html','./styles.css','./app.js','./manifest.webmanifest']))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request))));
