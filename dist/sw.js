const CACHE='nocturne-eclipse-v2.2.0';
const CORE=['./','./index.html','./style.css?v=2.2.0','./main.mjs?v=2.2.0','./model.mjs?v=2.2.0','./content.mjs?v=2.2.0','./render.mjs?v=2.2.0','./audio.mjs?v=2.2.0','./storage.mjs?v=2.2.0','./animation.mjs?v=2.2.0','./pose-data.mjs?v=2.2.0','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png','./assets/cathedral.webp','./assets/crypt.webp','./assets/belfry.webp','./assets/sanctum.webp','./assets/props.webp','./assets/hero.webp','./assets/enemies.webp','./assets/motion.webp','./assets/hunters.webp','./assets/attack.webp','./assets/atlas.json?v=2.2.0'];
// Install the complete release before taking over. A partial download never replaces a working cache.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('nocturne-eclipse-')&&k!==CACHE&&k!=='nocturne-eclipse-v2.1.0').map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  // Keep the precached HTML tied to its complete release. Never replace it with a newer shell alone.
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));return;
 }
 const url=new URL(event.request.url);
 // Release-tagged modules and local artwork are immutable within a release.
 if(url.searchParams.get('v')==='2.2.0'||/\.(webp|png|svg)$/.test(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
