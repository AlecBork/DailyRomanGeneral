// Offline support for the hosted version. Pages and images are cached; battle data is fetched fresh when online.
const V="drg-v2";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(["./","index.html","rules.js","battles/manifest.json","assets/earth.jpg","assets/earth_bump.jpg","assets/earth_water.png","assets/region.jpg","assets/icon-192.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 const fresh=u.origin===location.origin&&(u.pathname.endsWith(".json")||u.pathname.endsWith("/")||u.pathname.endsWith(".html")||u.pathname.endsWith(".js"));
 if(fresh){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(k=>k.put(r,c));return res}).catch(()=>caches.match(r)));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&(u.origin===location.origin||/cdnjs|fonts\.(googleapis|gstatic)/.test(u.hostname))){const c=res.clone();caches.open(V).then(k=>k.put(r,c))}return res})))});
