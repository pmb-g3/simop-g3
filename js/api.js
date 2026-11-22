// ============================================================
// JEMBATAN KE BACKEND (Google Apps Script REST API)
// - Semua komunikasi lewat fetch(). Tidak memakai google.script.run.
// - Antrean prioritas: maks 3 permintaan bersamaan (batas Apps Script tidak tersentuh).
// - Coba ulang otomatis untuk gangguan sementara (404/429/5xx/jaringan).
//   Permintaan TULIS hanya diulang bila server jelas belum memprosesnya -> tidak ada data dobel.
// ============================================================

/** true bila GAS_URL di js/config.js sudah diisi URL Web App yang benar */
function gasConfigured() {
  return typeof GAS_URL === 'string' && GAS_URL.indexOf('https://script.google.com/') === 0 && /\/exec$/.test(GAS_URL);
}

/** Status jaringan untuk indikator sinkron di tampilan */
const NET = { max: 3, inflight: 0, queue: [[], [], []], reads: 0, writes: 0, okCount: 0, lastOk: 0 };
function netNotify_() { try { if (typeof onNetState === 'function') onNetState(NET); } catch (e) { } }

const TRANSIENT_HTTP = [404, 408, 425, 429, 500, 502, 503, 504];
const SAFE_WRITE_HTTP = [404, 429, 503];
const TRANSIENT_MSG = /service invoked too many times|too many simultaneous|lock timeout|exceeded maximum execution|timed out waiting|server sedang sibuk/i;

/** Ubah galat teknis menjadi pesan yang dimengerti pengguna */
function gasError_(e) {
  const m = (e && e.message) || '';
  if (e && e.name === 'AbortError') return new Error('Server terlalu lama merespons. Coba lagi beberapa saat.');
  if (e && e.http) return new Error(e.http === 404 || e.http >= 500 || e.http === 429
    ? 'Server Google sedang sibuk (kode ' + e.http + '). Coba lagi beberapa saat.'
    : 'Server menjawab dengan kode ' + e.http + '.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return new Error('Koneksi ke server gagal. Periksa jaringan Anda.');
  if (/Unexpected token|JSON/i.test(m)) return new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan "Execute as: Me" dan "Who has access: Anyone".');
  return new Error(m || 'Terjadi kesalahan saat menghubungi server.');
}

const wait_ = ms => new Promise(r => setTimeout(r, ms));

/** Satu kali kirim. Melempar galat bertanda: http (kode), net (jaringan), bad (bukan JSON), busy (pesan sibuk dari server) */
async function gasOnce_(body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow', signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') { e.timeout = true; throw e; }
    const x = new Error(e && e.message || 'Failed to fetch'); x.net = true; throw x;
  }
  clearTimeout(timer);
  if (!res.ok) { const x = new Error('HTTP ' + res.status); x.http = res.status; throw x; }
  let j;
  try { j = await res.json(); } catch (e) { const x = new Error('Unexpected token'); x.bad = true; throw x; }
  if (j && j.success === false && TRANSIENT_MSG.test(j.message || '')) { const x = new Error(j.message); x.busy = true; x.res = j; throw x; }
  return j;
}

/** Kirim dengan coba ulang. idem=true: aman diulang (baca). idem=false: tulis, hanya diulang bila jelas belum diproses. */
async function gasSend_(body, idem, timeoutMs) {
  const delays = [700, 1800];
  for (let attempt = 0; ; attempt++) {
    try {
      return await gasOnce_(body, timeoutMs || (idem ? 60000 : 120000));
    } catch (e) {
      const retryable = idem
        ? (e.net || e.bad || e.busy || e.timeout || (e.http && TRANSIENT_HTTP.indexOf(e.http) >= 0))
        : (e.busy || (e.http && SAFE_WRITE_HTTP.indexOf(e.http) >= 0));
      if (!retryable || attempt >= delays.length) {
        if (e.busy && e.res) return e.res;
        throw gasError_(e);
      }
      await wait_(delays[attempt] + Math.floor(Math.random() * 400));
    }
  }
}

function netPump_() {
  while (NET.inflight < NET.max) {
    const lane = NET.queue[0].length ? 0 : NET.queue[1].length ? 1 : NET.queue[2].length ? 2 : -1;
    if (lane < 0) return;
    if (lane === 2 && NET.inflight > 0) return;
    const job = NET.queue[lane].shift();
    NET.inflight++;
    gasSend_(job.body, job.idem, job.timeout).then(job.ok, job.fail).finally(() => { NET.inflight--; netPump_(); });
  }
}

/**
 * POST {fn, args} ke Apps Script. Content-Type WAJIB text/plain agar tidak memicu CORS preflight.
 * opt.prio: 0 = aksi pengguna/halaman aktif, 1 = foto, 2 = prefetch latar.  opt.idem: aman diulang.  opt.track: dihitung di indikator sinkron.
 * opt.timeout: batas tunggu (ms) untuk aksi panjang, mis. ekspor Docs mingguan.
 */
function gasPost(fn, args, opt) {
  opt = opt || {};
  if (!gasConfigured()) return Promise.reject(new Error('GAS_URL belum diisi di js/config.js.'));
  const idem = opt.idem !== undefined ? !!opt.idem : fn !== 'api';
  const track = opt.track !== false;
  const kind = idem ? 'reads' : 'writes';
  if (track) { NET[kind]++; netNotify_(); }
  return new Promise((resolve, reject) => {
    const done = (fnc, v, okFlag) => {
      if (track) {
        NET[kind]--;
        if (okFlag) { NET.lastOk = Date.now(); if (!opt.bg) NET.okCount = (NET.okCount || 0) + 1; }
        netNotify_();
      }
      fnc(v);
    };
    NET.queue[Math.max(0, Math.min(2, opt.prio || 0))].push({
      body: JSON.stringify({ fn: fn, args: args || [] }), idem: idem, timeout: opt.timeout || 0,
      ok: v => done(resolve, v, !!(v && v.success !== false)),
      fail: e => done(reject, e, false)
    });
    netPump_();
  });
}

// ============================================================
// SUPABASE (pindah bertahap): modul yang sudah pindah dikirim ke rpc simop_api, sisanya tetap ke Apps Script.
// Jawaban sama persis: {success, data, message, code}. Alamat & kunci publik datang dari Apps Script (config.sb).
// ============================================================
const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.min.js';
const SB = { cfg: null, client: null, loading: null, gagal: '' };
/** Modul yang sudah memakai Supabase, mis. sbAktif('blangko') */
function sbAktif(modul) { return !!(SB.cfg && Array.isArray(SB.cfg.modul) && SB.cfg.modul.indexOf(modul) >= 0); }
function sbSetConfig(cfg) {
  const lama = SB.cfg;
  SB.cfg = cfg && cfg.url && cfg.key ? cfg : null;
  if (SB.client && (!SB.cfg || !lama || lama.url !== SB.cfg.url)) SB.client = null;
}
function sbLoadLib_() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  if (SB.loading) return SB.loading;
  SB.loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = SB_LIB; s.async = true;
    s.onload = () => res();
    s.onerror = () => { SB.loading = null; rej(new Error('Pustaka server data cepat gagal dimuat. Periksa jaringan.')); };
    document.head.appendChild(s);
  });
  return SB.loading;
}
/** Sesi Supabase disimpan di tempat yang sama dengan token Apps Script ("Ingat saya" = localStorage) */
const SB_STORE = {
  st_() { try { return typeof dcStore === 'function' ? dcStore() : sessionStorage; } catch (e) { return sessionStorage; } },
  getItem(k) { try { return SB_STORE.st_().getItem(k); } catch (e) { return null; } },
  setItem(k, v) { try { SB_STORE.st_().setItem(k, v); } catch (e) { } },
  removeItem(k) { [localStorage, sessionStorage].forEach(s => { try { s.removeItem(k); } catch (e) { } }); }
};
async function sbClient_() {
  if (!SB.cfg) throw new Error('Server data cepat belum diatur.');
  if (SB.client) return SB.client;
  await sbLoadLib_();
  SB.client = window.supabase.createClient(SB.cfg.url, SB.cfg.key, { auth: { storage: SB_STORE, storageKey: 'simop-sb', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return SB.client;
}
/** Masuk ke Supabase dengan username & password yang sama (dipanggil setelah login Apps Script berhasil) */
async function sbMasuk(email, password) {
  SB.gagal = '';
  try {
    const c = await sbClient_();
    const r = await c.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw new Error(r.error.message);
  } catch (e) { SB.gagal = e.message || 'gagal'; throw e; }
}
async function sbKeluar() {
  try { if (SB.client) await SB.client.auth.signOut({ scope: 'local' }); } catch (e) { }
  SB_STORE.removeItem('simop-sb');
  SB.client = null; SB.gagal = '';
}
/** Panggil simop_api. Baca diulang 2x bila jaringan putus; tulis tidak diulang kecuali blangko.save (isinya ditimpa, aman). */
async function sbCall(aksi, p, opt) {
  opt = opt || {};
  const idem = opt.idem !== undefined ? !!opt.idem : true, track = opt.track !== false, kind = idem ? 'reads' : 'writes';
  if (track) { NET[kind]++; netNotify_(); }
  let okFlag = false;
  try {
    const c = await sbClient_();
    const ses = await c.auth.getSession();
    if (!ses || !ses.data || !ses.data.session) {
      return SB.gagal ? { success: false, data: null, code: '', message: 'Belum masuk ke server data cepat (' + SB.gagal + '). Keluar lalu masuk kembali; bila tetap gagal hubungi Super Admin.' } : { success: false, data: null, code: 'AUTH', message: 'Sesi berakhir. Silakan masuk kembali.' };
    }
    const delays = [700, 1800];
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), opt.timeout || 30000);
      let r;
      try { r = await c.rpc('simop_api', { aksi: aksi, p: p || {} }).abortSignal(ctrl.signal); } catch (e) { r = { error: { message: e && e.message || 'Failed to fetch', jaringan: true } }; } finally { clearTimeout(timer); }
      if (!r.error && r.data) { okFlag = r.data.success !== false; return r.data; }
      const msg = (r.error && r.error.message) || 'Respons kosong';
      const jaringan = (r.error && r.error.jaringan) || /Failed to fetch|NetworkError|Load failed|abort|fetch/i.test(msg) || r.status >= 500 || r.status === 0;
      if (!jaringan || !(idem || opt.ulang) || attempt >= delays.length) {
        if (r.status === 401 || /JWT/i.test(msg)) return { success: false, data: null, code: 'AUTH', message: 'Sesi berakhir. Silakan masuk kembali.' };
        throw new Error(jaringan ? 'Koneksi ke server data cepat gagal. Periksa jaringan Anda.' : 'Server data cepat: ' + msg);
      }
      await wait_(delays[attempt] + Math.floor(Math.random() * 400));
    }
  } finally {
    if (track) { NET[kind]--; if (okFlag) { NET.lastOk = Date.now(); if (!opt.bg) NET.okCount = (NET.okCount || 0) + 1; } netNotify_(); }
  }
}

/** GET data publik ringan, mis. ?action=publicConfig */
async function gasGet(action) {
  if (!gasConfigured()) throw new Error('GAS_URL belum diisi di js/config.js.');
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(GAS_URL + '?action=' + encodeURIComponent(action), { redirect: 'follow' });
      if (!res.ok) { const x = new Error('HTTP ' + res.status); x.http = res.status; throw x; }
      return await res.json();
    } catch (e) {
      if (attempt >= 1) throw gasError_(e);
      await wait_(800);
    }
  }
}
