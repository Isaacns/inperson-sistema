/* INPERSON service worker — versionado por build. NÃO editar VER à mão: o build.js injeta. */
var VER="mruf4g2h";
var C="inperson-"+VER;

self.addEventListener("install", function(e){ self.skipWaiting(); });

self.addEventListener("activate", function(e){
  e.waitUntil((async function(){
    try{
      var keys=await caches.keys();
      await Promise.all(keys.filter(function(k){ return k!==C; }).map(function(k){ return caches.delete(k); }));
    }catch(x){}
    await self.clients.claim();
  })());
});

function fallback(req){
  return caches.match(req).then(function(c){
    if(c) return c;
    if(req.mode==="navigate") return caches.match("index.html",{ignoreSearch:true}).then(function(m){ return m || caches.match(req,{ignoreSearch:true}); });
    return caches.match(req,{ignoreSearch:true});
  });
}

/* Só gerencia o app shell (mesma origem). Chamadas ao Supabase/CDNs passam direto. */
function netFirst(req){
  return new Promise(function(resolve){
    var done=false;
    var t=setTimeout(function(){
      if(done) return; done=true;
      fallback(req).then(function(c){ resolve(c || fetch(req).catch(function(){ return new Response("",{status:504}); })); });
    }, 4000);
    fetch(req).then(function(r){
      if(done) return; done=true; clearTimeout(t);
      try{ var cp=r.clone(); caches.open(C).then(function(c){ c.put(req,cp); }).catch(function(){}); }catch(x){}
      resolve(r);
    }).catch(function(){
      if(done) return; done=true; clearTimeout(t);
      fallback(req).then(function(c){ resolve(c || new Response("offline",{status:503})); });
    });
  });
}

/* Canal canônico do push (§14.2): o app manda PULAR_ESPERA ao aceitar a atualização.
   O install já faz skipWaiting, mas manter o canal cobre o SW que ficou em waiting. */
self.addEventListener("message", function(e){
  if(e.data && e.data.type==="PULAR_ESPERA") self.skipWaiting();
});

self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  var url;
  try{ url=new URL(e.request.url); }catch(x){ return; }
  if(url.origin!==self.location.origin) return; /* deixa Supabase e CDNs passarem */
  /* A checagem de versão usa ?_v=<timestamp> único. Sem esta guarda, o netFirst criaria
     uma entrada nova no cache a cada 10 min, para sempre. */
  if(url.searchParams.has("_v")) return;
  e.respondWith(netFirst(e.request));
});
