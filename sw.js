/* Prism Gauge 1 — offline service worker.
   First visit needs a connection: the worker then caches the whole app
   shell, and later visits work with no Wi-Fi or data at all.
   Web fonts are NOT cached on purpose — offline the app falls back to
   system fonts, so nothing blocks. User photos are never uploaded. */
var CACHE = 'prism-gauge1-v7';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/practice.css',
  './css/learn.css',
  './js/color-math.js',
  './js/wheel.js',
  './js/wheel.js',
  './js/mentor.js',
  './js/practice.js',
  './js/learn.js',
  './js/temp-slider.js',
  './js/wheel-drag.js',
  './js/app.js'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isAppFile = url.origin === self.location.origin &&
    (e.request.mode === 'navigate' || e.request.destination === 'script' || e.request.destination === 'style');
  if(isAppFile){
    // NETWORK-FIRST for the app itself: on Wi-Fi the user always gets the
    // newest page/scripts (this fixes repeated "update didn't work" reports
    // caused by cache-first serving old pages). Offline, fall back to cache.
    e.respondWith(fetch(e.request).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      return res;
    }).catch(function(){
      return caches.match(e.request, {ignoreSearch: true}).then(function(hit){
        if(hit) return hit;
        if(e.request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline');
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(function(hit){
    if(hit) return hit;
    return fetch(e.request).then(function(res){
      var copy = res.clone();
      if(url.origin === self.location.origin){
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      }
      return res;
    }).catch(function(){
      if(e.request.mode === 'navigate') return caches.match('./index.html');
      throw new Error('offline');
    });
  }));
});
