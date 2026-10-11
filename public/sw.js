const CACHE='pr-shell-v1';
const FILES=['/','/src/styles.css','/src/app.js','/src/views.js','/src/admin.js','/src/lib.js','/src/icons.js','/assets/app-icon.png','/assets/worship-purple.png','/assets/worship-gold.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Never cache account data, catalogs, cookies, private repertoires or uploaded media.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&FILES.includes(url.pathname)){const clone=response.clone();caches.open(CACHE).then(c=>c.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/'))));
});
