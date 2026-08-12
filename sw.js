// Helper of the Day — service worker
// Caches the app shell so the app keeps working with no signal (e.g. in a classroom
// dead zone or airplane mode) after it's been opened once.

var CACHE_NAME = 'helper-of-the-day-v2';
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './logo-tiger.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);

  // Google Fonts: try network, fall back to cache, and cache a fresh copy when we can.
  // Never lets a missing font block the app from working offline.
  if(url.origin.indexOf('fonts.g') !== -1 || url.hostname.indexOf('fonts.gstatic.com') !== -1 || url.hostname.indexOf('fonts.googleapis.com') !== -1){
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache){
        return fetch(req).then(function(res){
          cache.put(req, res.clone());
          return res;
        }).catch(function(){
          return cache.match(req);
        });
      })
    );
    return;
  }

  // App shell: cache-first, fall back to network, then refresh cache in background.
  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(res){
        if(res && res.status === 200 && url.origin === self.location.origin){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
