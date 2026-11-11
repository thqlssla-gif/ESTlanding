/* KAIA DESK static-shell offline cache. Never cache personal student data. */
const CACHE='kaia-studentdesk-shell-v3';
const BASE=new URL('./',self.location.href);
const ASSETS=['./','./index.html','./style.css','./kaia-theme.css','./desk-workflow.css',
 './student-bulk.css','./app.js','./desk-workflow.js','./student-bulk.js',
 './reminders.js','./reminders-ui.js','./kaia-liquid.js','./manifest.webmanifest',
 './kaia-app-icon.svg'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(r.ok)return c.put(u,r)}).catch(()=>null)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kaia-studentdesk-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET')return;
 const url=new URL(r.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE.pathname))return;
 e.respondWith(fetch(r).then(resp=>{
  if(resp.ok&&!url.pathname.endsWith('.json')){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}
  return resp;
 }).catch(()=>caches.match(r).then(c=>c||caches.match(new URL('./index.html',BASE).href))));
});
