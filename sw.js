/* DHC — Reprise de devis Vertuoza : service worker.
   Met l'application en cache pour qu'elle démarre sans connexion.
   Changez CACHE à chaque nouvelle version pour forcer la mise à jour. */
var CACHE = 'dhc-vertuoza-v19';
var COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(COQUILLE.map(function(u){
        return c.add(new Request(u, {mode:'cors'})).catch(function(){ /* une ressource absente ne bloque pas l'installation */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(cles){
      return Promise.all(cles.filter(function(k){ return k !== CACHE; })
                            .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;                       /* laisse passer les appels API */
  if(req.url.indexOf('api.anthropic.com') > -1) return;  /* jamais de cache sur l'IA */

  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(r){
        var copie = r.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copie); });
        return r;
      }).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(r){
        if(r && r.status === 200){
          var copie = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); });
        }
        return r;
      }).catch(function(){ return hit; });
    })
  );
});
