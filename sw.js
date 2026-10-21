// ============================================================
// SERVICE WORKER SIMOP — membuat aplikasi bisa dipasang di HP & cepat dibuka
// - Berkas aplikasi sendiri (HTML/CSS/JS): ambil dari jaringan dulu, salinan cadangan bila offline.
//   Jadi setelah git push, pengguna langsung mendapat versi terbaru tanpa Ctrl+Shift+R.
// - Pustaka CDN (Bootstrap, ikon, font): pakai salinan tersimpan, diperbarui diam-diam.
// - Permintaan ke Google Apps Script (data) TIDAK PERNAH disentuh / disimpan.
// ============================================================
const VERSI = 'simop-20261022';
const SHELL = ['./', './index.html', './css/style.css', './js/api.js', './js/app.js', './js/config.js', './manifest.webmanifest', './icons/icon-192.png'];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  if (url.origin === self.location.origin) {
    // Jaringan dulu; bila sinyal lambat (> 2,5 detik) pakai salinan tersimpan sambil tetap memperbarui di latar
    const net = fetch(req).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(VERSI).then(c => c.put(req, cp)); }
      return res;
    });
    const cached = () => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : null));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const t = setTimeout(() => cached().then(r => { if (r && !done) { done = true; resolve(r); } }), 2500);
      net.then(res => { if (!done) { done = true; clearTimeout(t); resolve(res); } })
        .catch(() => cached().then(r => { if (!done) { done = true; clearTimeout(t); resolve(r || Response.error()); } }));
    }));
    e.waitUntil(net.catch(() => null));
    return;
  }
  if (CDN.test(req.url)) {
    e.respondWith(caches.open(VERSI).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
