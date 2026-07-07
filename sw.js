const C="inperson-v2";
self.addEventListener("install",function(e){ self.skipWaiting(); });
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);})); }));
  self.clients.claim();
});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET") return;
  e.respondWith(
    fetch(e.request).then(function(r){ var cp=r.clone(); caches.open(C).then(function(c){ c.put(e.request,cp); }); return r; })
      .catch(function(){ return caches.match(e.request).then(function(m){ return m || (e.request.mode==="navigate" ? caches.match("index.html") : undefined); }); })
  );
});
