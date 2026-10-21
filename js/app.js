'use strict';
const AppState = { token: null, user: null, menu: [], config: { appName: 'SIMOP Gontor Kampus 3', logoUrl: '' }, page: null, seq: 0, pending: 0, img: {} };
const S = {};
const PAGES = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const Rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const num = n => Number(n || 0).toLocaleString('id-ID');
const pad = n => ('0' + n).slice(-2);
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ROLE_LBL = { superadmin: 'Super Admin / Pimpinan', admin: 'Admin Operasional', toko: 'Toko KUK (Mitra)' };
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const parseD = s => { const a = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
const addD = (s, n) => new Date(parseD(s) + n * 864e5).toISOString().slice(0, 10);
const dowOf = s => new Date(parseD(s)).getUTCDay();
const cycStart = s => addD(s, -((dowOf(s) - 4 + 7) % 7));
function fdate(s, long) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return '\u2013';
  const t = new Date(parseD(s));
  return (long ? HARI[t.getUTCDay()] + ', ' : '') + t.getUTCDate() + ' ' + BLN[t.getUTCMonth()] + ' ' + t.getUTCFullYear();
}
const fdt = s => (s ? fdate(s) + String(s).slice(10, 16) : '\u2013');
const initials = n => String(n || '?').replace(/^(Ust\.|Ustadz|Bpk\.|H\.)\s{0,}/i, '').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const role = () => (AppState.user ? AppState.user.role : '');
const logoImg = () => { const el = document.getElementById('appLogo'); return el ? `<img alt="Logo" src="${el.getAttribute('src')}">` : '<i class="bi bi-buildings-fill"></i>'; };
const isStaff = () => role() === 'admin' || role() === 'superadmin';
const isSuper = () => role() === 'superadmin';
const rowText = r => Object.keys(r).filter(k => typeof r[k] !== 'object').map(k => r[k]).join(' ').toLowerCase();
const BADGE = { H: ['ok', 'Hadir'], I: ['warn', 'Izin'], A: ['bad', 'Ghoib'], Proses: ['info'], Terkirim: ['ok'], Ditolak: ['bad'], 'Belum Dibayar': ['warn'], 'Telah Dibayar': ['ok'], Aktif: ['ok'], Nonaktif: ['muted'], Ada: ['ok'], 'Tidak Ada': ['warn'], Selesai: ['ok'], Berjalan: ['info', 'Proses'], Direncanakan: ['muted'], 'Tambal Sulam': ['ts'], Proyek: ['brand'], superadmin: ['brand'], admin: ['info'], toko: ['ts'] };
const badge = (t, kind) => { const b = BADGE[t] || ['muted']; return `<span class="pill pill-${kind || b[0]}">${E(b[1] || t)}</span>`; };

function loader(d) {
  AppState.pending += d;
  const el = $('#topLoader');
  if (AppState.pending > 0) el.classList.add('on');
  else { AppState.pending = 0; el.style.width = '100%'; setTimeout(() => { el.classList.remove('on'); el.style.width = ''; }, 220); }
}
function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast-x ' + (type || '');
  el.innerHTML = `<i class="bi ${type === 'ok' ? 'bi-check-circle-fill' : type === 'err' ? 'bi-exclamation-octagon-fill' : 'bi-info-circle-fill'}"></i><div>${E(msg)}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 6500 : 3600);
}
const READ_ACT = new Set(['dash.get', 'karyawan.list', 'absensi.get', 'rekap.absensi', 'rekap.bayar', 'rekap.list', 'izin.list', 'sub.list', 'program.list', 'katalog.list', 'material.list', 'piket.list', 'piket.staff', 'keu.list', 'armada.list', 'admin.users', 'admin.audit', 'admin.config', 'pilihan.list', 'minggu.info', 'mat.rekap', 'wa.config']);
const DC = { mem: {}, mode: 'net', changed: false, bg: false, user: '', ver: '', pv: {}, want: null, fresh: null };
const NOWRITE = new Set(['file.get', 'file.thumbs', 'import.check', 'batch.read', 'sync.ver', 'program.laporan', 'wa.preview', 'wa.groups']);
const DC_MISS = new Error('cache-miss');
const dcKey = (a, p) => a + '|' + JSON.stringify(p || {});
function dcStore() { try { return localStorage.getItem('simop-rt') ? localStorage : sessionStorage; } catch (e) { return sessionStorage; } }
const clone = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
function dcLoad() {
  DC.user = AppState.user ? AppState.user.username + ':' + AppState.user.role : '';
  try { DC.mem = JSON.parse(dcStore().getItem('simop-dc:' + DC.user) || '{}') || {}; } catch (e) { DC.mem = {}; }
  try { DC.pv = JSON.parse(dcStore().getItem('simop-pv:' + DC.user) || '{}') || {}; } catch (e) { DC.pv = {}; }
}
let dcTimer = null;
function dcSave() {
  clearTimeout(dcTimer);
  dcTimer = setTimeout(() => {
    if (!DC.user) return;
    for (let tries = 0; tries < 6; tries++) {
      try { dcStore().setItem('simop-dc:' + DC.user, JSON.stringify(DC.mem)); dcStore().setItem('simop-pv:' + DC.user, JSON.stringify(DC.pv)); return; }
      catch (e) {
        const ks = Object.keys(DC.mem).sort((a, b) => DC.mem[a].t - DC.mem[b].t);
        if (!ks.length) return;
        ks.slice(0, Math.ceil(ks.length / 2)).forEach(k => delete DC.mem[k]);
      }
    }
  }, 300);
}
function dcClear() {
  DC.mem = {}; DC.pv = {};
  thClear();
  [localStorage, sessionStorage].forEach(st => { try { Object.keys(st).filter(k => k.indexOf('simop-dc:') === 0 || k.indexOf('simop-pv:') === 0).forEach(k => st.removeItem(k)); } catch (e) { } });
}
function dcPatch(action, payload, fn) { const h = DC.mem[dcKey(action, payload)]; if (h) { try { fn(h.d); dcSave(); } catch (e) { } } }
function dcPeek(action, payload) { const h = DC.mem[dcKey(action, payload)]; return h ? clone(h.d) : null; }
async function serverVer() {
  try { const r = await apiM('sync.ver', {}, true, { silent: true }); DC.ver = r.data.ver; return r.data.ver; } catch (e) { return null; }
}
function dcFresh(action, payload, onChange) {
  const h = DC.mem[dcKey(action, payload)], old = h ? JSON.stringify(h.d) : null;
  return apiM(action, payload, true, { silent: true }).then(r => { if (JSON.stringify(r.data) !== old && onChange) { try { onChange(clone(r.data)); } catch (e) { } } return r.data; }).catch(() => null);
}
function apiM(action, payload, quiet, o) {
  const rd = READ_ACT.has(action), key = rd ? dcKey(action, payload) : '';
  if (rd && DC.mode === 'collect') {
    if (DC.fresh && DC.fresh.has(key) && DC.mem[key]) return Promise.resolve({ data: clone(DC.mem[key].d), message: 'OK', cached: true });
    if (DC.want && !DC.want.has(key)) DC.want.set(key, { a: action, p: payload || {} });
    return Promise.reject(DC_MISS);
  }
  if (rd && DC.mode === 'only') {
    const h = DC.mem[key];
    if (h) DC.oldest = Math.max(DC.oldest || 0, Date.now() - h.t);
    return h ? Promise.resolve({ data: clone(h.d), message: 'OK', cached: true }) : Promise.reject(DC_MISS);
  }
  const q = quiet || DC.bg;
  if (!q) loader(1);
  const optRow = !rd && /delete|Delete|\.del$/.test(action) && Date.now() - (AppState.optAt || 0) < 20000 ? AppState.optRow : null;
  if (optRow) AppState.optRow = null;
  if (optRow) optRow.classList.add('opt-out');
  const isFile = action === 'file.get' || action === 'file.thumbs';
  return gasPost('api', [AppState.token, action, payload || {}], { prio: DC.bg ? 2 : (isFile || (o && o.silent)) ? 1 : 0, idem: rd || isFile || (NOWRITE.has(action) && action !== 'wa.groups'), track: !isFile && !(o && o.silent), bg: DC.bg, timeout: o && o.timeout }).then(res => {
    if (!q) loader(-1);
    if (res && res.success) {
      if (rd) {
        const js = JSON.stringify(res.data === undefined ? null : res.data), old = DC.mem[key];
        if (!old || JSON.stringify(old.d) !== js) DC.changed = true;
        DC.mem[key] = { t: Date.now(), d: JSON.parse(js) }; dcSave();
      } else if (!NOWRITE.has(action)) { AppState.lastWrite = Date.now(); AppState.optRow = null; }
      return { data: res.data, message: res.message };
    }
    if (optRow) optRow.classList.remove('opt-out');
    if (res && res.code === 'AUTH') { forceLogout(res.message); throw new Error(res.message); }
    if (!rd && !NOWRITE.has(action) && res && res.success === false) AppState.needNet = true;
    throw new Error((res && res.message) || 'Respons kosong dari server.');
  }, err => { if (!q) loader(-1); if (optRow) optRow.classList.remove('opt-out'); throw err; });
}
const api = (a, p, q) => apiM(a, p, q).then(r => r.data);
async function act(btn, fn) {
  if (btn) { if (btn.classList.contains('busy')) return; btn.classList.add('busy'); }
  try { return await fn(); } catch (e) { toast(e.message || String(e), 'err'); } finally { if (btn) btn.classList.remove('busy'); }
}
window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.message) toast(e.reason.message, 'err'); });

const bsModal = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
function openModal(o) {
  $('#appModalTitle').textContent = o.title || '';
  $('#appModalBody').innerHTML = o.body || '';
  $('#appModalFoot').innerHTML = o.footer || '';
  $('#appModalFoot').style.display = o.footer ? '' : 'none';
  $('#appModalDlg').className = 'modal-dialog modal-dialog-centered modal-dialog-scrollable' + (o.size ? ' modal-' + o.size : '');
  bsModal('appModal').show();
}
const closeModal = () => bsModal('appModal').hide();
$('#appModal').addEventListener('shown.bs.modal', () => { const f = $('#appModalBody input:not([type=hidden]),#appModalBody select,#appModalBody textarea'); if (f && window.matchMedia('(pointer:fine)').matches) f.focus(); });
function confirmBox(msg, label) {
  const t = AppState.lastTap;
  AppState.optRow = t && t.closest ? t.closest('tr, .li, .prog, .pk-row, .day-item, .kar-row, .kb-card') : null;
  AppState.optAt = Date.now();
  return new Promise(res => {
    const el = $('#confirmModal'), ok = $('#confirmOk'), m = bsModal('confirmModal');
    let done = false;
    const finish = v => { if (done) return; done = true; ok.onclick = null; res(v); };
    $('#confirmBody').innerHTML = msg;
    ok.textContent = label || 'Ya, lanjutkan';
    el.addEventListener('hidden.bs.modal', () => finish(false), { once: true });
    ok.onclick = () => { finish(true); m.hide(); };
    m.show();
  });
}
async function previewFile(url, title) {
  $('#previewTitle').textContent = title || 'Pratinjau';
  $('#previewBody').innerHTML = '<div class="skel" style="height:320px"></div>';
  bsModal('previewModal').show();
  try {
    const r = await api('file.get', { url });
    $('#previewBody').innerHTML = `<img class="preview-img" alt="${E(title)}" src="${r.dataUrl}"><div class="tc mt2"><a class="btn-x btn-o btn-sm" download="${E((title || 'foto').replace(/\s+/g, '_'))}.jpg" href="${r.dataUrl}"><i class="bi bi-download"></i> Unduh foto</a></div>`;
  } catch (e) { $('#previewBody').innerHTML = `<div class="empty"><i class="bi bi-image"></i><b>Foto tidak dapat dimuat</b>${E(e.message)}</div>`; }
}
function showExport(r, label) {
  openModal({
    title: 'Ekspor selesai',
    body: `<div class="empty" style="padding:1rem 0"><i class="bi bi-check-circle-fill" style="color:var(--em-a)"></i><b>${E(r.nama)}</b>Berkas sudah tersimpan di Google Drive Anda.</div>`,
    footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Tutup</button><a class="btn-x btn-g" href="${E(r.url)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> ${E(label || 'Buka di Google')}</a>`
  });
}

function fieldHtml(f, val, row) {
  const t = typeof f.t === 'function' ? f.t(row) : (f.t || 'text');
  if (t === 'html') return `<div class="full">${f.html}</div>`;
  const id = 'f_' + f.k;
  let v = val == null ? '' : val;
  if (t === 'search') {
    const dlid = id + '_dl', opts = f.opts || [], cur = opts.find(o => String(o.v) === String(v));
    return `<div class="${f.full ? 'full' : ''}"><label class="lbl" for="${id}_q">${E(f.l)}${f.req ? ' <span style="color:#dc2626" aria-hidden="true">*</span>' : ''}</label>
      <input class="inp" id="${id}_q" list="${dlid}" placeholder="${E(f.ph || 'Ketik untuk mencari\u2026')}" value="${cur ? E(cur.l) : ''}" autocomplete="off" oninput="searchResolve('${id}')">
      <datalist id="${dlid}">${opts.map(o => `<option value="${E(o.l)}" data-v="${E(o.v)}">`).join('')}</datalist>
      <input type="hidden" id="${id}" name="${f.k}" value="${cur ? E(cur.v) : ''}">
      ${f.help ? `<div class="help">${E(f.help)}</div>` : ''}</div>`;
  }
  const attr = ` name="${f.k}" id="${id}"${f.list ? ` list="${id}_dl" autocomplete="off"` : ''}${f.req ? ' required' : ''}${f.ph ? ` placeholder="${E(f.ph)}"` : ''}${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}${f.step ? ` step="${f.step}"` : ''}${f.ml ? ` maxlength="${f.ml}"` : ''}${f.dis ? ' disabled' : ''}`;
  let inp;
  if (t === 'select') {
    const opts = (f.opts || []).map(o => (typeof o === 'string' ? { v: o, l: o } : o));
    inp = `<select class="inp"${attr}>${f.blank ? `<option value="">${E(f.blank)}</option>` : ''}${opts.map(o => `<option value="${E(o.v)}"${String(o.v) === String(v) ? ' selected' : ''}>${E(o.l)}</option>`).join('')}</select>`;
  } else if (t === 'textarea') inp = `<textarea class="inp" rows="3"${attr}>${E(v)}</textarea>`;
  else {
    if (t === 'datetime-local') v = String(v).replace(' ', 'T');
    inp = `<input class="inp" type="${t}"${attr} value="${E(v)}"${t === 'password' ? ' autocomplete="new-password"' : ''}>`;
    if (f.list) inp += `<datalist id="${id}_dl">${f.list.map(o => `<option value="${E(o)}">`).join('')}</datalist>`;
  }
  return `<div class="${f.full ? 'full' : ''}"><label class="lbl" for="${id}">${E(f.l)}${f.req ? ' <span style="color:#dc2626" aria-hidden="true">*</span>' : ''}</label>${inp}${f.help ? `<div class="help">${E(f.help)}</div>` : ''}</div>`;
}
const formHtml = (fields, vals, row) => `<form id="mForm" class="form-grid" novalidate onsubmit="return false">${fields.map(f => fieldHtml(f, vals ? vals[f.k] : '', row)).join('')}</form>`;
function searchResolve(id) {
  const q = $('#' + id + '_q'), dl = $('#' + id + '_dl'), hid = $('#' + id);
  if (!q || !dl || !hid) return;
  const opt = Array.from(dl.options).find(o => o.value === q.value);
  hid.value = opt ? opt.dataset.v : '';
}
function collect(fields, formEl) {
  const form = formEl || $('#mForm');
  if (!form.checkValidity()) { form.reportValidity(); return null; }
  const o = {};
  fields.forEach(f => {
    const el = form.elements[f.k]; if (!el || el.disabled) return;
    let v = el.value;
    if (el.type === 'number') v = v === '' ? '' : Number(v);
    else if (el.type === 'datetime-local') v = v.replace('T', ' ');
    else if (typeof v === 'string') v = v.trim();
    o[f.k] = v;
  });
  return o;
}
function openForm(o) {
  openModal({ title: o.title, size: o.size, body: formHtml(o.fields, o.values, o.row), footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-p" id="mSave">${E(o.submit || 'Simpan')}</button>` });
  $('#mSave').onclick = e => act(e.currentTarget, async () => { const d = collect(o.fields); if (!d) return; await o.save(d); });
  $('#mForm').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA') { ev.preventDefault(); $('#mSave').click(); } });
}

function pickImage(camera) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/' + '*'; if (camera) i.setAttribute('capture', 'environment'); i.onchange = () => res(i.files[0] || null); i.oncancel = () => res(null); i.click(); });
}
function loadImg(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Foto tidak dapat dibaca. Gunakan JPG atau PNG.')); }; im.src = u; });
}
async function decodeImage(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { try { return await createImageBitmap(file); } catch (x) { } }
  }
  return loadImg(file);
}
function drawScaled(src, max) {
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height, sc = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * sc)); c.height = Math.max(1, Math.round(h0 * sc));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
function canvasB64(c, q) {
  return new Promise(res => {
    const viaUrl = () => res(c.toDataURL('image/jpeg', q).split(',')[1]);
    if (!c.toBlob) return viaUrl();
    c.toBlob(b => { if (!b) return viaUrl(); const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = viaUrl; r.readAsDataURL(b); }, 'image/jpeg', q);
  });
}
/** Foto HP (3\u201312 MB) diperkecil ke sisi terpanjang 1280 px, JPEG \u00B1150\u2013400 KB, plus gambar kecil 480 px untuk daftar & galeri */
async function compressImage(file) {
  if (!file || String(file.type || 'image/').slice(0, 6) !== 'image/') throw new Error('Pilih berkas gambar (JPG/PNG).');
  const im = await decodeImage(file);
  let max = 1280, q = 0.72, data = '';
  for (let i = 0; i < 4; i++) {
    data = await canvasB64(drawScaled(im, max), q);
    if (data.length * 0.75 <= 420000) break;
    q = Math.max(0.5, q - 0.08); max = Math.round(max * 0.85);
  }
  const th = await canvasB64(drawScaled(im, 480), 0.7);
  if (im.close) try { im.close(); } catch (e) { }
  if (data.length > 1750000) throw new Error('Foto masih terlalu besar setelah dikompres. Coba foto lain.');
  return { data: data, mime: 'image/jpeg', kb: Math.round(data.length * 0.75 / 1024), preview: 'data:image/jpeg;base64,' + data, thumb: th, thumbUrl: 'data:image/jpeg;base64,' + th };
}
const photoCtl = (id, label) => `<span class="lbl">${E(label)}</span><div class="row-f gap2 wrap"><button type="button" class="btn-x btn-o btn-sm" onclick="choosePhoto('${id}')"><i class="bi bi-camera"></i> Pilih / ambil foto</button><span id="${id}_info" class="muted" style="font-size:12px">Belum ada foto \u00B7 dikompres otomatis ke \u2264 1 MB</span></div><img id="${id}_pv" class="preview-img mt1" style="display:none;max-height:150px" alt="Pratinjau foto">`;
async function choosePhoto(id) {
  const f = await pickImage(); if (!f) return;
  const info = $('#' + id + '_info'); info.textContent = 'Mengompres\u2026';
  try {
    const c = await compressImage(f); (S.photo = S.photo || {})[id] = c;
    info.innerHTML = `<span class="pill pill-ok"><i class="bi bi-check2"></i> \u2264 1 MB siap \u00B7 ${c.kb} KB</span>`;
    const pv = $('#' + id + '_pv'); pv.src = c.preview; pv.style.display = 'block';
  } catch (e) { toast(e.message, 'err'); info.textContent = 'Gagal memuat foto'; delete (S.photo || {})[id]; }
}

const emptyBox = (t, s) => `<div class="empty"><i class="bi bi-inbox"></i><b>${E(t)}</b>${E(s || '')}</div>`;
function tableHtml(id, cols, rows, o) {
  o = o || {};
  if (!rows.length) return emptyBox(o.empty || 'Belum ada data', o.emptySub || 'Data akan tampil di sini setelah ditambahkan.');
  return `<div class="tbl-wrap"><table class="tbl ${o.cls || ''}" id="${id}"><thead><tr>${cols.map(c => `<th class="${c.n ? 'n' : ''} ${c.c || ''}">${E(c.l)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr data-q="${E(rowText(r))}">${cols.map(c => `<td class="${c.n ? 'n' : ''} ${c.c || ''}">${c.f ? c.f(r, i) : E(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function filterTable(inputId, tableId) {
  const q = $('#' + inputId).value.trim().toLowerCase();
  $$('#' + tableId + ' tbody tr[data-q]').forEach(tr => { tr.hidden = !!q && tr.dataset.q.indexOf(q) < 0; });
}
const searchBox = (id, tid, ph) => `<div class="search"><i class="bi bi-search"></i><input class="inp" id="${id}" type="search" placeholder="${E(ph || 'Cari\u2026')}" aria-label="${E(ph || 'Cari')}" oninput="filterTable('${id}','${tid}')"></div>`;
const skeleton = () => '<div class="stack"><div class="skel" style="height:44px;width:40%"></div><div class="kpi-grid">' + '<div class="skel" style="height:110px"></div>'.repeat(5) + '</div><div class="skel" style="height:260px"></div></div>';
const errBox = m => `<div class="card-x"><div class="empty"><i class="bi bi-wifi-off"></i><b>Data belum bisa dimuat</b>${E(m)}<div class="mt2"><button class="btn-x btn-p btn-sm" onclick="navigateTo(AppState.page)"><i class="bi bi-arrow-clockwise"></i> Coba lagi</button></div></div></div>`;

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t); document.documentElement.setAttribute('data-bs-theme', t);
  const b = $('#themeBtn'); if (b) b.innerHTML = `<i class="bi ${t === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
  try { localStorage.setItem('simop-theme', t); } catch (e) { }
}
const toggleTheme = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
const openDrawer = () => document.body.classList.add('drawer-open');
const closeDrawer = () => document.body.classList.remove('drawer-open');

function renderShell() {
  const u = AppState.user, m = AppState.menu;
  $('#roleChip').textContent = (ROLE_LBL[u.role] || u.role).toUpperCase();
  $('#userAvatar').textContent = initials(u.nama); $('#userName').textContent = u.nama; $('#userSub').textContent = 'Online \u00B7 Kampus 3';
  $('#brandName').textContent = 'SIMOP'; $('#tbApp').textContent = AppState.config.appName;
  if (AppState.config.logoUrl && AppState.config.logoUrl.indexOf('https:') === 0) $('#appLogo').setAttribute('src', AppState.config.logoUrl);
  let html = '', grp = '';
  m.forEach(it => {
    if (it.group !== grp) { grp = it.group; html += `<div class="side-group">${E(grp)}</div>`; }
    html += `<button class="nav-item" data-nav="${it.id}" onclick="navigateTo('${it.id}')" title="${E(it.label)}"><i class="bi ${it.icon}"></i><span class="nav-label">${E(it.label)}</span></button>`;
  });
  $('#sidebarNav').innerHTML = html;
  const pref = ['dashboard', 'presensi', 'program', 'material', 'pembayaran'], have = new Set(m.map(x => x.id));
  const bn = pref.filter(p => have.has(p)).slice(0, 4).map(id => m.find(x => x.id === id));
  const short = l => l.replace('Pemesanan ', '').replace('Pembayaran Material', 'Bayar').replace('Presensi Harian', 'Presensi').replace('Program Kerja', 'Program');
  const navBtn = it => `<button class="bn-item" data-nav="${it.id}" onclick="navigateTo('${it.id}')"><i class="bi ${it.icon}"></i><span>${E(short(it.label))}</span></button>`;
  if (isStaff()) {
    const pick = ['dashboard', 'presensi', 'program'].filter(p => have.has(p)).map(id => m.find(x => x.id === id));
    $('#bottomNav').innerHTML = pick.slice(0, 2).map(navBtn).join('') + '<button class="bn-item bn-cam" onclick="cameraStart()" aria-label="Ambil foto program kerja"><span class="bn-cam-c"><i class="bi bi-camera-fill"></i></span><span>Foto</span></button>' + pick.slice(2).map(navBtn).join('') + '<button class="bn-item" onclick="openDrawer()"><i class="bi bi-grid"></i><span>Menu</span></button>';
  } else $('#bottomNav').innerHTML = bn.map(navBtn).join('') + `<button class="bn-item" onclick="openDrawer()"><i class="bi bi-grid"></i><span>Menu</span></button>`;
  $('#tbActions').innerHTML = isStaff() ? `<button class="btn-x btn-g btn-sm hide-m" onclick="orderForm()"><i class="bi bi-plus-lg"></i> Ajukan Material</button><button class="btn-x btn-p btn-sm hide-m" onclick="navigateTo('presensi')"><i class="bi bi-person-check"></i> Input Presensi</button>` : '';
  renderCutoff();
  applySide();
  tabsLoad(); renderTabs();
  installRefresh();
}
function renderCutoff() {
  const el = $('#cutoffCard');
  if (!isStaff()) { el.hidden = true; return; }
  const t = todayStr(), st = cycStart(t), hari = Math.round((parseD(t) - parseD(st)) / 864e5) + 1;
  el.hidden = false;
  el.innerHTML = `<b><i class="bi bi-lock"></i> TUTUP BUKU GAJI OTOMATIS</b>Perhitungan borongan dan harian dikunci otomatis setiap Rabu 16:30 WIB.<div class="cutoff-bar"><i style="width:${Math.round(hari / 7 * 100)}%"></i></div><div class="row-f between"><span>Hari ke-${hari} dari 7</span><span class="fw7">Sisa ${7 - hari} hari</span></div>`;
}
function setActiveNav(id) {
  $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
  const it = AppState.menu.find(x => x.id === id); $('#pageTitle').textContent = it ? it.label : 'SIMOP';
  tabsSync(id);
}
function applySide() { let mini = false; try { mini = localStorage.getItem('simop-side') === 'mini'; } catch (e) { } document.body.classList.toggle('side-mini', mini); }
function toggleSide() {
  const mini = !document.body.classList.contains('side-mini');
  document.body.classList.toggle('side-mini', mini);
  try { localStorage.setItem('simop-side', mini ? 'mini' : ''); } catch (e) { }
}

const TABS = { list: [], act: '' };
const tabsKey = () => 'simop-tabs:' + (AppState.user ? AppState.user.username : '');
function tabsLoad() {
  let o = null; try { o = JSON.parse(localStorage.getItem(tabsKey()) || 'null'); } catch (e) { o = null; }
  const ok = id => AppState.menu.some(x => x.id === id);
  TABS.list = o && Array.isArray(o.list) ? o.list.filter(t => t && t.id && ok(t.page)).slice(0, 8) : [];
  if (!TABS.list.length) TABS.list = [{ id: 't' + Date.now(), page: 'dashboard' }];
  TABS.act = o && TABS.list.some(t => t.id === o.act) ? o.act : TABS.list[0].id;
}
function tabsSave() { try { localStorage.setItem(tabsKey(), JSON.stringify(TABS)); } catch (e) { } }
const tabCur = () => TABS.list.find(t => t.id === TABS.act) || TABS.list[0];
function tabsSync(page) { const t = tabCur(); if (!t) return; if (t.page !== page) { t.page = page; tabsSave(); } renderTabs(); }
function renderTabs() {
  const bar = $('#tabBar'); if (!bar || !AppState.user) return;
  const one = TABS.list.length === 1;
  bar.innerHTML = TABS.list.map(t => {
    const m = AppState.menu.find(x => x.id === t.page) || { label: 'Halaman', icon: 'bi-window' }, on = t.id === TABS.act;
    return `<div class="tab${on ? ' on' : ''}" role="tab" tabindex="${on ? 0 : -1}" aria-selected="${on}" data-tab="${t.id}" title="${E(m.label)}"><i class="bi ${m.icon} ti" aria-hidden="true"></i><span class="tl">${E(m.label)}</span>${one ? '' : `<button type="button" class="tx" data-tclose="${t.id}" aria-label="Tutup tab ${E(m.label)}" tabindex="-1"><i class="bi bi-x-lg"></i></button>`}</div>`;
  }).join('') + (TABS.list.length < 8 ? '<button type="button" class="tab-add" id="tabAdd" aria-label="Buka tab baru" title="Tab baru (tekan lama / klik kanan untuk pilih halaman)"><i class="bi bi-plus-lg"></i></button>' : '');
  const pg = $('#app-container'); if (pg) pg.classList.toggle('first-tab', !!TABS.list[0] && TABS.list[0].id === TABS.act);
  const on = bar.querySelector('.tab.on');
  if (on && (on.offsetLeft < bar.scrollLeft || on.offsetLeft + on.offsetWidth > bar.scrollLeft + bar.clientWidth)) bar.scrollLeft = Math.max(0, on.offsetLeft - 40);
}
function tabSelect(id) {
  if (id === TABS.act) return;
  TABS.act = id; tabsSave();
  navigateTo(tabCur().page);
}
function tabOpen(page) {
  if (TABS.list.length >= 8) return toast('Maksimal 8 tab. Tutup salah satu tab dulu.', '');
  const t = { id: 't' + Date.now() + Math.floor(Math.random() * 99), page: page || 'dashboard' };
  const i = TABS.list.findIndex(x => x.id === TABS.act);
  TABS.list.splice(i + 1, 0, t); TABS.act = t.id; tabsSave();
  navigateTo(t.page);
}
function tabClose(id) {
  if (TABS.list.length <= 1) return;
  const i = TABS.list.findIndex(t => t.id === id); if (i < 0) return;
  TABS.list.splice(i, 1);
  if (TABS.act === id) { TABS.act = (TABS.list[i] || TABS.list[i - 1]).id; tabsSave(); navigateTo(tabCur().page); }
  else { tabsSave(); renderTabs(); }
}
function tabKeep(fn) {
  const keep = TABS.list.filter(fn);
  if (!keep.length) return;
  TABS.list = keep;
  if (!keep.some(t => t.id === TABS.act)) { TABS.act = keep[0].id; tabsSave(); navigateTo(tabCur().page); } else { tabsSave(); renderTabs(); }
}
function tabMenuClose() { const m = $('#tabMenu'); if (m) m.remove(); }
function tabMenuShow(html, x, y) {
  tabMenuClose();
  const m = document.createElement('div'); m.className = 'tab-menu'; m.id = 'tabMenu'; m.setAttribute('role', 'menu'); m.innerHTML = html;
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px'; m.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
  const b = m.querySelector('button'); if (b) b.focus();
  setTimeout(() => { document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { tabMenuClose(); document.removeEventListener('pointerdown', off, true); } }, true); }, 0);
}
function tabQuickMenu(btn) {
  const r = btn.getBoundingClientRect();
  tabMenuShow('<div class="tm-h">Buka di tab baru</div>' + AppState.menu.map(m => `<button type="button" role="menuitem" onclick="tabMenuClose();tabOpen('${m.id}')"><i class="bi ${m.icon}"></i>${E(m.label)}</button>`).join(''), r.left, r.bottom + 6);
}
function tabCtx(id, x, y) {
  const i = TABS.list.findIndex(t => t.id === id), n = TABS.list.length;
  tabMenuShow(`<button type="button" role="menuitem" onclick="tabMenuClose();tabOpen((TABS.list.find(t=>t.id==='${id}')||{}).page)"><i class="bi bi-copy"></i>Duplikat tab</button>` +
    (n > 1 ? `<button type="button" role="menuitem" onclick="tabMenuClose();tabClose('${id}')"><i class="bi bi-x-lg"></i>Tutup tab</button><button type="button" role="menuitem" onclick="tabMenuClose();tabKeep(t=>t.id==='${id}')"><i class="bi bi-x-square"></i>Tutup tab lain</button>` : '') +
    (i < n - 1 ? `<button type="button" role="menuitem" onclick="tabMenuClose();tabKeep((t,k)=>k<=${i})"><i class="bi bi-chevron-bar-right"></i>Tutup tab di kanan</button>` : '') +
    (i > 0 ? `<button type="button" role="menuitem" onclick="tabMenuClose();tabKeep((t,k)=>k>=${i})"><i class="bi bi-chevron-bar-left"></i>Tutup tab di kiri</button>` : ''), x, y);
}
(function tabEvents() {
  const bar = document.getElementById('tabBar'); if (!bar) return;
  let drag = null, swallow = 0, holdT = 0;
  bar.addEventListener('click', e => {
    if (Date.now() < swallow) return;
    const x = e.target.closest('[data-tclose]'); if (x) { e.stopPropagation(); tabClose(x.dataset.tclose); return; }
    const add = e.target.closest('#tabAdd'); if (add) { tabOpen('dashboard'); return; }
    const t = e.target.closest('[data-tab]'); if (t) tabSelect(t.dataset.tab);
  });
  bar.addEventListener('contextmenu', e => {
    const add = e.target.closest('#tabAdd'); if (add) { e.preventDefault(); tabQuickMenu(add); return; }
    const t = e.target.closest('[data-tab]'); if (!t) return; e.preventDefault(); tabCtx(t.dataset.tab, e.clientX, e.clientY);
  });
  bar.addEventListener('auxclick', e => { const t = e.target.closest('[data-tab]'); if (e.button === 1 && t) { e.preventDefault(); tabClose(t.dataset.tab); } });
  bar.addEventListener('keydown', e => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tabSelect(t.dataset.tab); }
    else if (e.key === 'Delete') { e.preventDefault(); tabClose(t.dataset.tab); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = e.key === 'ArrowRight' ? t.nextElementSibling : t.previousElementSibling; if (n && n.dataset.tab) n.focus(); }
  });
  bar.addEventListener('pointerdown', e => {
    const add = e.target.closest('#tabAdd');
    if (add && e.pointerType === 'touch') { holdT = setTimeout(() => { swallow = Date.now() + 600; tabQuickMenu(add); }, 480); return; }
    const t = e.target.closest('[data-tab]');
    if (!t || e.button !== 0 || e.target.closest('[data-tclose]') || e.pointerType === 'touch') return;
    drag = { id: t.dataset.tab, x: e.clientX, on: false };
  });
  window.addEventListener('pointerup', () => { clearTimeout(holdT); if (drag && drag.on) { swallow = Date.now() + 250; tabsSave(); renderTabs(); } drag = null; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.on && Math.abs(e.clientX - drag.x) < 8) return;
    drag.on = true;
    const tabs = $$('.tab', bar), from = TABS.list.findIndex(t => t.id === drag.id);
    let to = tabs.findIndex(el => { const r = el.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
    if (to < 0) to = tabs.length - 1; else if (to > from) to--;
    if (to !== from && to >= 0) { const [it] = TABS.list.splice(from, 1); TABS.list.splice(to, 0, it); renderTabs(); }
    const el = bar.querySelector(`[data-tab="${drag.id}"]`); if (el) el.classList.add('drag');
  });
})();

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; installRefresh(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; installRefresh(); toast('SIMOP sudah terpasang. Buka dari ikon di layar utama.', 'ok'); });
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installRefresh() {
  const b = document.getElementById('installBtn'); if (!b) return;
  let coarse = false; try { coarse = matchMedia('(pointer:coarse)').matches; } catch (e) { }
  b.hidden = isStandalone() || !(deferredInstall || coarse);
}
async function installApp() {
  if (deferredInstall) {
    const ev = deferredInstall; deferredInstall = null;
    ev.prompt();
    try { const r = await ev.userChoice; if (r && r.outcome === 'accepted') toast('Memasang SIMOP\u2026', 'ok'); } catch (e) { }
    installRefresh(); return;
  }
  const step = (n, t) => `<div class="ios-step"><b class="n">${n}</b><div>${t}</div></div>`;
  openModal({
    title: 'Pasang SIMOP di layar utama HP',
    body: isIOS()
      ? step(1, 'Buka alamat SIMOP di <b>Safari</b>.') + step(2, 'Ketuk tombol <b>Bagikan</b> <i class="bi bi-box-arrow-up"></i> di bagian bawah layar.') + step(3, 'Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.') + step(4, 'Buka SIMOP dari ikon baru di layar utama. Tampilannya penuh seperti aplikasi.')
      : step(1, 'Buka alamat SIMOP di <b>Google Chrome</b>.') + step(2, 'Ketuk menu <b>\u22EE</b> (titik tiga) di kanan atas.') + step(3, 'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.') + step(4, 'Buka SIMOP dari ikon baru di layar utama.'),
    footer: '<button class="btn-x btn-p" data-bs-dismiss="modal">Mengerti</button>'
  });
}
const PAGE_KEYS = {};
function pageKeys(id) {
  if (!PAGE_KEYS[id]) {
    const set = new Set([id]);
    (String(PAGES[id] || '').match(/S\.(\w+)\s*=(?!=)/g) || []).forEach(m => set.add(m.slice(2).replace(/\s*=$/, '')));
    PAGE_KEYS[id] = Array.from(set);
  }
  return PAGE_KEYS[id];
}
function restoreS(id, snap) { pageKeys(id).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } }); }
function isTyping() {
  const c = document.getElementById('app-container'), a = document.activeElement;
  if (c && a && c.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  return !!(c && [...c.querySelectorAll('input[type="search"]')].some(i => i.value));
}
function uiBusy() {
  return (AppState.uiDirty && Date.now() - (AppState.lastAct || 0) < 1500) || isTyping() || document.body.classList.contains('modal-open') || document.body.classList.contains('drawer-open') ||
    document.body.classList.contains('vw-open') || !!KB.drag || !!document.querySelector('.kb-new') || (AppState.page === 'dashboard' && S.wg && S.wg.edit) ||
    (AppState.page === 'presensi' && S.pres && S.pres.changed && Object.keys(S.pres.changed).length > 0);
}
async function repaintFromCache() {
  if (!AppState.token || !AppState.page || uiBusy()) return;
  const id = AppState.page, seq = AppState.seq; let r = null;
  DC.mode = 'only';
  try { r = await PAGES[id](AppState.pageOpts || {}); } catch (e) { r = null; } finally { DC.mode = 'net'; }
  if (r && seq === AppState.seq && !uiBusy()) { paintPage(r, true); AppState.pending = false; }
}
setInterval(() => {
  if (!AppState.token || uiBusy()) return;
  if (AppState.needNet && NET.inflight === 0) { AppState.needNet = false; AppState.pending = false; navigateTo(AppState.page, { force: true }); }
  else if (AppState.pending) repaintFromCache();
}, 1200);
new MutationObserver(() => { if (!document.body.classList.contains('modal-open') && (AppState.pending || AppState.needNet)) setTimeout(() => { if (AppState.needNet && !uiBusy() && NET.inflight === 0) { AppState.needNet = false; AppState.pending = false; navigateTo(AppState.page, { force: true }); } else if (AppState.pending) repaintFromCache(); }, 120); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
function paintPage(r, keepScroll) {
  AppState.pending = false;
  const c = $('#app-container'), y = window.scrollY;
  c.innerHTML = typeof r === 'string' ? r : r.html;
  if (r && r.init) r.init(c);
  AppState.uiDirty = false;
  window.scrollTo(0, keepScroll ? y : 0);
}
async function navigateTo(id, opts) {
  if (!AppState.token) { showLogin(); return false; }
  if (!AppState.menu.some(m => m.id === id)) id = 'dashboard';
  opts = opts || {};
  const same = AppState.page === id, seq = ++AppState.seq, c = $('#app-container');
  const afterWrite = Date.now() - (AppState.lastWrite || 0) < 4000;
  const keep = !!opts.force || (same && afterWrite);
  AppState.page = id; AppState.pageOpts = opts.force ? (AppState.pageOpts || {}) : opts; setActiveNav(id); closeDrawer();
  let shown = keep && same && c.children.length > 0;
  if (!keep && !afterWrite) {
    DC.mode = 'only'; DC.oldest = 0;
    let r = null;
    try { r = await PAGES[id](opts); } catch (e) { r = null; } finally { DC.mode = 'net'; }
    if (r && seq === AppState.seq) { paintPage(r, false); shown = true; }
    if (shown && DC.oldest < 4000) { serverVer(); return true; }
    if (shown && DC.pv[id]) {
      const v = await serverVer();
      if (seq !== AppState.seq) return true;
      if (v && v === DC.pv[id]) return true;
    }
  }
  const onScreen = shown;
  if (!onScreen) c.innerHTML = skeleton();
  const snap = Object.assign({}, S);
  DC.changed = false;
  const vBefore = DC.ver;
  try {
    const r = await PAGES[id](opts.force ? (AppState.pageOpts || {}) : opts);
    if (vBefore) { DC.pv[id] = vBefore; dcSave(); }
    if (seq !== AppState.seq) return true;
    if (!onScreen || keep) paintPage(r, onScreen);
    else if (DC.changed && !uiBusy()) paintPage(r, true);
    else { if (DC.changed) AppState.pending = true; restoreS(id, snap); }
    return true;
  } catch (e) {
    if (seq !== AppState.seq || !AppState.token) return false;
    if (onScreen) { restoreS(id, snap); setSyncError(e.message); }
    else c.innerHTML = errBox(e.message);
    AppState.lastNavError = e.message;
    return false;
  }
}
/** Periksa data terbaru diam-diam (dipanggil berkala & saat aplikasi kembali dibuka) */
async function refreshQuiet() {
  if (!AppState.token || !AppState.page || uiBusy() || NET.inflight > 0 || DC.bg) return;
  if (Date.now() - (AppState.lastWrite || 0) < 4000) return;
  const id0 = AppState.page, v = await serverVer();
  if (!v || AppState.page !== id0) return;
  if (DC.pv[id0] === v) return;
  if (uiBusy() || NET.inflight > 0) return;
  const id = AppState.page, seq = AppState.seq, snap = Object.assign({}, S);
  DC.changed = false;
  try {
    const r = await PAGES[id](AppState.pageOpts || {});
    DC.pv[id] = v; dcSave();
    if (seq !== AppState.seq) return;
    if (DC.changed && !uiBusy()) paintPage(r, true);
    else { if (DC.changed) AppState.pending = true; restoreS(id, snap); }
  } catch (e) {
    if (seq === AppState.seq) { restoreS(id, snap); setSyncError(e.message); }
  }
}
setInterval(() => { if (document.visibilityState === 'visible') refreshQuiet(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - (NET.lastOk || 0) > 20000) refreshQuiet(); });

/** Indikator sinkron di bilah atas */
let syncErrMsg = '', syncErrOk = 0;
function setSyncError(m) { syncErrMsg = m || 'Gagal terhubung ke server.'; syncErrOk = NET.okCount || 0; onNetState(NET); }
function onNetState(n) {
  const b = document.getElementById('syncBadge'); if (!b) return;
  if (syncErrMsg && (n.okCount || 0) > syncErrOk) syncErrMsg = '';
  const st = n.writes > 0 ? 'save' : n.reads > 0 ? 'busy' : syncErrMsg ? 'err' : 'ok';
  const T = { ok: ['Sheets & Drive tersinkron', 'Tersinkron'], busy: ['Menyinkronkan data\u2026', 'Sinkron\u2026'], save: ['Menyimpan ke server\u2026', 'Menyimpan\u2026'], err: ['Gagal sinkron \u00B7 ketuk untuk ulang', 'Gagal \u00B7 ulang'] };
  if (b.dataset.st === st) return;
  b.dataset.st = st;
  b.querySelector('.sync-t').textContent = T[st][0]; b.querySelector('.sync-s').textContent = T[st][1];
  b.title = st === 'err' ? syncErrMsg : T[st][0];
  b.setAttribute('aria-label', b.title);
}
function syncTap() {
  if (document.getElementById('syncBadge').dataset.st !== 'err') return;
  syncErrMsg = ''; onNetState(NET);
  navigateTo(AppState.page, { force: true }).then(ok => { if (ok) toast('Data diperbarui.', 'ok'); else toast('Masih gagal: ' + (AppState.lastNavError || 'server tidak merespons') + '', 'err'); });
}
const PREFETCH_ORDER = ['presensi', 'material', 'program', 'pembayaran', 'rekapmat', 'karyawan', 'izin', 'rekap', 'piket', 'armada', 'keuangan', 'dashboard', 'akun'];
async function prefetchMenus() {
  const have = AppState.menu.map(m => m.id).filter(id => PAGES[id]);
  const ids = PREFETCH_ORDER.filter(id => have.indexOf(id) >= 0).concat(have.filter(id => PREFETCH_ORDER.indexOf(id) < 0));
  DC.fresh = new Set();
  const firstVer = {};
  for (let round = 0; round < 4 && AppState.token; round++) {
    for (let w = 0; w < 40 && (NET.queue[0].length || NET.inflight > 0 || Date.now() - (AppState.lastAct || 0) < 1500); w++) await new Promise(r => setTimeout(r, 300));
    DC.want = new Map();
    for (const id of ids) {
      if (id === AppState.page) continue;
      const snap = Object.assign({}, S), exp = S.expRange ? Object.assign({}, S.expRange) : null;
      DC.mode = 'collect';
      try { await PAGES[id]({}); } catch (e) { } finally { DC.mode = 'net'; }
      if (AppState.page !== id) { restoreS(id, snap); if (exp) S.expRange = exp; else delete S.expRange; }
    }
    const want = Array.from(DC.want.entries()); DC.want = null;
    if (!want.length) break;
    for (let i = 0; i < want.length; i += 40) {
      const part = want.slice(i, i + 40);
      DC.bg = true;
      let res = null;
      try { res = await apiM('batch.read', { calls: part.map(x => ({ a: x[1].a, p: x[1].p })) }, true); } catch (e) { res = null; } finally { DC.bg = false; }
      if (!res) continue;
      const ver = res.data.ver, now = Date.now();
      part.forEach((x, j) => {
        const o = res.data.results[j];
        if (o && o.ok) { DC.mem[x[0]] = { t: now, d: o.data === undefined ? null : o.data }; DC.fresh.add(x[0]); }
      });
      if (ver) { ids.forEach(id => { if (!(id in firstVer)) firstVer[id] = ver; }); }
      dcSave();
    }
  }
  DC.fresh = null;
  Object.keys(firstVer).forEach(id => { if (id !== AppState.page) DC.pv[id] = firstVer[id]; });
  dcSave();
}

function showLogin(msg) {
  document.body.classList.add('auth-mode'); closeDrawer();
  const name = AppState.config.appName;
  $('#app-container').innerHTML = `
  <div class="login">
    <section class="login-brand" aria-hidden="true">
      <div class="brand"><div class="brand-logo">${logoImg()}</div><div class="brand-name" style="color:#fff">SIMOP <span class="chip">Gontor 3</span></div></div>
      <div><h1>Operasional pembangunan, satu tempat.</h1><p>Presensi tukang, program kerja, pemesanan material, dan pembayaran Toko KUK \u2014 tercatat rapi dan bisa dipertanggungjawabkan.</p></div>
      <ul><li><i class="bi bi-check-circle-fill"></i> Presensi shift pagi &amp; siang, siklus Kamis\u2013Rabu</li><li><i class="bi bi-check-circle-fill"></i> Dokumentasi foto Before \u00B7 During \u00B7 After</li><li><i class="bi bi-check-circle-fill"></i> Nota material &amp; verifikasi pembayaran</li></ul>
    </section>
    <section class="login-form">
      <button class="icon-btn login-theme" onclick="toggleTheme()" aria-label="Ganti tema"><i class="bi bi-moon-stars"></i></button>
      <form class="login-card" id="loginForm" onsubmit="return false" novalidate>
        <div class="mobile-brand"><div class="brand-logo">${logoImg()}</div><div><div class="brand-name">SIMOP <span class="chip">Gontor 3</span></div><div class="brand-sub">Operasional Pembangunan</div></div></div>
        <h2 id="lgTitle">Masuk ke ${E(name)}</h2>
        <p class="muted mb2">Gunakan akun yang diberikan Super Admin.</p>
        ${msg ? `<div class="err-box" role="alert" id="loginErr">${E(msg)}</div>` : '<div id="loginErr" role="alert"></div>'}
        <div class="mb2"><label class="lbl" for="lgUser">Username</label><input class="inp" id="lgUser" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="mb2"><label class="lbl" for="lgPass">Password</label><div class="pw-wrap"><input class="inp" id="lgPass" type="password" autocomplete="current-password" required style="padding-right:2.75rem"><button type="button" onclick="togglePw()" aria-label="Tampilkan atau sembunyikan password"><i class="bi bi-eye" id="pwEye"></i></button></div></div>
        <label class="row-f gap1 mb2" style="cursor:pointer;font-size:14px"><input type="checkbox" class="check" id="lgRemember" checked> Ingat saya di perangkat ini (30 hari)</label>
        <button class="btn-x btn-p" style="width:100%" id="lgBtn" onclick="doLoginUI(this)">Masuk</button>
      </form>
    </section>
  </div>`;
  $('#loginForm').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#lgBtn').click(); } });
}
function togglePw() { const i = $('#lgPass'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#pwEye').className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye'); }
const TK_LOCAL = 'simop-rt', TK_SESSION = 'simop-st';
function saveToken(t, remember) {
  try { if (remember) localStorage.setItem(TK_LOCAL, t); else sessionStorage.setItem(TK_SESSION, t); } catch (e) { }
}
function saveSessInfo(d) { try { dcStore().setItem('simop-ss', JSON.stringify({ user: d.user, menu: d.menu, config: d.config })); } catch (e) { } }
function readSessInfo() { try { return JSON.parse(dcStore().getItem('simop-ss') || 'null'); } catch (e) { return null; } }
function readToken() {
  try { return localStorage.getItem(TK_LOCAL) || sessionStorage.getItem(TK_SESSION) || ''; } catch (e) { return ''; }
}
function clearToken() {
  try { localStorage.removeItem(TK_LOCAL); sessionStorage.removeItem(TK_SESSION); } catch (e) { }
}
function bootHtml() {
  const arcs = [1, 2, 3, 4, 5, 6].map(i => `<span class="arc a${i}"></span>`).join('');
  return `<div class="boot" role="status" aria-live="polite" aria-label="Memuat aplikasi"><div class="boot-stage">${arcs}<div class="boot-logo">${logoImg()}</div></div></div>`;
}
const NEED_BUILD = 20261022;
function buildCheck(cfg) {
  const b = Number(cfg && cfg.build || 0), old = $('#buildWarn');
  if (b >= NEED_BUILD) { if (old) old.remove(); return; }
  if (old || !document.body) return;
  const el = document.createElement('div'); el.id = 'buildWarn'; el.className = 'build-warn'; el.setAttribute('role', 'alert');
  el.innerHTML = '<b>Backend (Apps Script) belum diperbarui.</b> Beberapa fitur akan menampilkan "Aksi/Jenis tidak dikenal". Buka editor Apps Script \u2192 pastikan isi file Kode sudah versi terbaru \u2192 <b>Deploy \u2192 Manage deployments \u2192 ikon pensil \u2192 Version: New version \u2192 Deploy</b>. <button type="button" onclick="this.parentElement.remove()" aria-label="Tutup">\u00D7</button>';
  document.body.appendChild(el);
}
function applySession(d) {
  AppState.token = d.token; AppState.user = d.user; AppState.menu = d.menu; AppState.config = d.config;
  saveSessInfo(d); dcLoad(); buildCheck(d.config);
  if (d.boot) { Object.keys(d.boot).forEach(k => { DC.mem[k] = { t: Date.now(), d: d.boot[k] }; }); dcSave(); }
  document.body.classList.remove('auth-mode'); renderShell();
  let go = ''; try { go = new URLSearchParams(location.search).get('go') || ''; } catch (e) { }
  const first = go && AppState.menu.some(m => m.id === go) ? go : (tabCur() ? tabCur().page : 'dashboard');
  if (go) try { history.replaceState(null, '', location.pathname); } catch (e) { }
  navigateTo(first).then(() => setTimeout(() => { prefetchMenus().catch(() => { }); }, 700));
}
function storeBrowserPassword(u, p) {
  try { if (window.PasswordCredential && navigator.credentials) navigator.credentials.store(new PasswordCredential({ id: u, password: p, name: u })).catch(() => { }); } catch (e) { }
}
function doLoginUI(btn) {
  const u = $('#lgUser').value.trim(), p = $('#lgPass').value, err = $('#loginErr'), rem = $('#lgRemember').checked;
  if (!u || !p) { err.className = 'err-box'; err.textContent = 'Isi username dan password.'; return; }
  btn.classList.add('busy'); err.className = ''; err.textContent = '';
  loader(1);
  gasPost('doLogin', [u, p, rem]).then(res => {
      loader(-1); btn.classList.remove('busy');
      if (!res || !res.success) { err.className = 'err-box'; err.textContent = (res && res.message) || 'Login gagal.'; $('#lgPass').value = ''; $('#lgPass').focus(); return; }
      saveToken(res.data.token, rem);
      if (rem) storeBrowserPassword(u, p);
      applySession(res.data);
    }, e => { loader(-1); btn.classList.remove('busy'); err.className = 'err-box'; err.textContent = e.message || 'Koneksi gagal. Periksa jaringan lalu coba lagi.'; });
}
function resetState() {
  UPQ.jobs = []; upPaint(); AppState.full = {}; viewerClose(); tabMenuClose();
  clearToken(); dcClear(); DC.user = ''; [localStorage, sessionStorage].forEach(st => { try { st.removeItem('simop-ss'); } catch (e) { } }); AppState.token = null; AppState.user = null; AppState.menu = []; AppState.img = {}; Object.keys(S).forEach(k => delete S[k]); }
function forceLogout(msg) { if (!AppState.token) return; resetState(); showLogin(msg || 'Sesi berakhir. Silakan masuk kembali.'); }
function logout() {
  const t = AppState.token; resetState(); showLogin();
  gasPost('doLogout', [t]).catch(() => { });
}
function openPwModal() {
  openForm({
    title: 'Ganti password', submit: 'Simpan password',
    fields: [{ k: 'lama', l: 'Password lama', t: 'password', req: true, full: true }, { k: 'baru', l: 'Password baru', t: 'password', req: true, full: true, help: 'Minimal 8 karakter.', ml: 60 }, { k: 'ulang', l: 'Ulangi password baru', t: 'password', req: true, full: true }],
    save: async d => { if (d.baru !== d.ulang) throw new Error('Ulangi password baru tidak sama.'); const r = await apiM('me.changePw', { lama: d.lama, baru: d.baru }); toast(r.message, 'ok'); closeModal(); }
  });
}

document.addEventListener('click', e => {
  const pv = e.target.closest('[data-preview]');
  if (pv) previewFile(pv.dataset.preview, pv.dataset.title);
});
const TH = { db: null, ok: true };
function thOpen() {
  if (TH.db || !TH.ok || !window.indexedDB) return Promise.resolve(TH.db);
  return new Promise(res => {
    try {
      const rq = indexedDB.open('simop-foto', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('th');
      rq.onsuccess = () => { TH.db = rq.result; res(TH.db); };
      rq.onerror = () => { TH.ok = false; res(null); };
    } catch (e) { TH.ok = false; res(null); }
  });
}
function thPersist() { try { return dcStore() === localStorage; } catch (e) { return false; } }
async function thGetMany(urls) {
  const out = {}, db = thPersist() ? await thOpen() : null; if (!db) return out;
  await new Promise(res => { try { const st = db.transaction('th').objectStore('th'); let n = urls.length; if (!n) return res(); urls.forEach(u => { const g = st.get(u); g.onsuccess = () => { if (g.result) out[u] = g.result; if (!--n) res(); }; g.onerror = () => { if (!--n) res(); }; }); } catch (e) { res(); } });
  return out;
}
async function thPutMany(map) {
  const db = thPersist() ? await thOpen() : null; if (!db) return;
  try { const tx = db.transaction('th', 'readwrite'), st = tx.objectStore('th'); Object.keys(map).forEach(u => { if (map[u]) st.put(map[u], u); }); } catch (e) { }
}
function thClear() { try { if (window.indexedDB) indexedDB.deleteDatabase('simop-foto'); } catch (e) { } TH.db = null; AppState.img = {}; }
function thShow(el, d) {
  if (el.dataset.shown) return; el.dataset.shown = 1;
  if (d) el.insertAdjacentHTML('afterbegin', `<img alt="${E(el.dataset.title || 'Foto')}" src="${d}">`);
  else el.insertAdjacentHTML('afterbegin', '<div class="empty" style="padding:.5rem"><i class="bi bi-image-alt" style="font-size:20px"></i></div>');
  el.classList.remove('loading');
}
async function loadThumbs(root) {
  const els = $$('[data-thumb]', root || document).filter(x => !x.dataset.done);
  if (!els.length) return;
  els.forEach(x => { x.dataset.done = 1; });
  const byUrl = {}; els.forEach(el => { (byUrl[el.dataset.thumb] = byUrl[el.dataset.thumb] || []).push(el); });
  const fill = (u, d) => { if (d) AppState.img[u] = d; (byUrl[u] || []).forEach(el => thShow(el, d)); delete byUrl[u]; };
  Object.keys(byUrl).forEach(u => { if (AppState.img[u]) fill(u, AppState.img[u]); });
  const fromDev = await thGetMany(Object.keys(byUrl));
  Object.keys(fromDev).forEach(u => fill(u, fromDev[u]));
  const need = Object.keys(byUrl), parts = [];
  for (let i = 0; i < need.length; i += 6) parts.push(need.slice(i, i + 6));
  const run = async () => {
    while (parts.length) {
      const part = parts.shift();
      try {
        const r = await apiM('file.thumbs', { urls: part }, true);
        const skip = r.data.skip || [], got = {};
        part.forEach(u => { if (skip.indexOf(u) >= 0) return; const d = r.data.map[u] || null; if (d) got[u] = d; fill(u, d); });
        for (const u of skip) {
          try { const d = (await apiM('file.get', { url: u, thumb: 1 }, true)).data.dataUrl; if (d && d.length < 400000) got[u] = d; fill(u, d); } catch (e) { fill(u, null); }
        }
        thPutMany(got);
      } catch (e) { part.forEach(u => fill(u, null)); }
    }
  };
  await Promise.all([run(), run()]);
}

const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam'; };
const hk = x => String(x).replace('.', ',');

PAGES.dashboard = async function () {
  const d = await api('dash.get');
  S.dash = { d: d };
  if (d.role === 'toko') return dashToko(d);
  return { html: dashStaff(d), init: dashInit };
};

function exportRekap(jenis, start, btn) {
  return act(btn, async () => {
    toast('Membuat berkas di Google Drive\u2026');
    const r = await apiM(jenis === 'bayar' ? 'rekap.exportBayar' : 'rekap.exportAbsensi', { start: start });
    showExport(r.data, 'Buka Spreadsheet');
  });
}

function kpi(cls, label, icon, num, sub, extra) {
  return `<div class="kpi ${cls || ''}"><div class="kpi-l"><span>${label}</span><i class="bi ${icon}"></i></div><div class="kpi-num">${num}</div><div class="kpi-s">${sub || ''}</div>${extra || ''}</div>`;
}

const KOL_LBL = { Direncanakan: 'Program Kerja', Berjalan: 'Proses', Selesai: 'Hasil Usaha' };
const WG_DEF = {
  hadir: { t: 'Kehadiran pekerja', i: 'bi-people-fill', c: 'g', size: 'lg', sizes: ['lg', 'tall', 'wide', 'sm'] },
  keuangan: { t: 'Keuangan TS & Proyek', i: 'bi-wallet2', c: 'w', size: 'wide', sizes: ['wide', 'lg', 'tall', 'sm'] },
  piket: { t: 'Piket hari ini', i: 'bi-clipboard-check', c: '', size: 'sm', sizes: ['sm', 'tall', 'wide'] },
  armada: { t: 'Armada', i: 'bi-truck', c: '', size: 'sm', sizes: ['sm', 'tall', 'wide'] },
  material: { t: 'Material hari ini', i: 'bi-box-seam', c: 'w', size: 'full', sizes: ['full', 'lg', 'wide', 'tall'] },
  galeri: { t: 'Galeri program kerja', i: 'bi-images', c: 'v', size: 'xl', sizes: ['xl', 'full', 'lg'] },
  aktivitas: { t: 'Log aktivitas', i: 'bi-activity', c: '', size: 'tall', sizes: ['tall', 'lg', 'wide'], hide: true }
};
const WG_ORDER = ['hadir', 'keuangan', 'piket', 'armada', 'material', 'galeri', 'aktivitas'];
const SIZE_LBL = { sm: 'kecil', wide: 'lebar', tall: 'tinggi', lg: 'besar', full: 'selebar layar', xl: 'selebar layar (tinggi)' };
const wgKey = () => 'simop-wg:' + (AppState.user ? AppState.user.username : '');
function wgLayout() {
  let o = null; try { o = JSON.parse(localStorage.getItem(wgKey()) || 'null'); } catch (e) { o = null; }
  const list = [], seen = {};
  (o && Array.isArray(o.list) ? o.list : []).forEach(x => { const f = x && WG_DEF[x.id]; if (f && !seen[x.id]) { seen[x.id] = 1; list.push({ id: x.id, size: f.sizes.indexOf(x.size) >= 0 ? x.size : f.size, hide: !!x.hide }); } });
  WG_ORDER.forEach(id => { if (!seen[id]) list.push({ id: id, size: WG_DEF[id].size, hide: !!WG_DEF[id].hide }); });
  return list;
}
function wgSave(list) { try { localStorage.setItem(wgKey(), JSON.stringify({ list: list })); } catch (e) { } }
const emptyMini = t => `<div class="muted" style="font-size:12.5px;padding:.35rem 0">${E(t)}</div>`;
const fdShort = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return ''; const t = new Date(parseD(s)); return t.getUTCDate() + ' ' + BLN[t.getUTCMonth()]; };

function dashStaff(d) {
  S.wg = S.wg || { edit: false };
  const lay = wgLayout(), m = d.minggu || { ts: {}, pr: {} }, nama = String(AppState.user.nama || '');
  return `<div class="dh fade-in"><div><h1>Ahlan wa Sahlan, <span>${E(nama)}</span></h1><p>${fdate(d.tanggal, 1)} \u00B7 Tambal Sulam minggu ke-${m.ts.no || '\u2013'} \u00B7 Proyek minggu ke-${m.pr.no || '\u2013'} \u00B7 siklus ${fdate(d.periode.start)} \u2013 ${fdate(d.periode.end)}</p></div>
    <div class="dh-acts"><button class="btn-x btn-o btn-sm hide-m" onclick="navigateTo('presensi')"><i class="bi bi-person-check"></i> Presensi</button><button class="btn-x btn-o btn-sm" onclick="orderForm()"><i class="bi bi-cart-plus"></i> Pesan material</button><button class="btn-x btn-o btn-sm" onclick="programForm()"><i class="bi bi-plus-lg"></i> Program</button><button class="btn-x ${S.wg.edit ? 'btn-p' : 'btn-o'} btn-sm" id="wgEditBtn" onclick="wgToggleEdit()" aria-pressed="${S.wg.edit}"><i class="bi ${S.wg.edit ? 'bi-check2' : 'bi-grid-3x3-gap'}"></i> ${S.wg.edit ? 'Selesai mengatur' : 'Atur widget'}</button></div></div>
  <div id="wgBar">${S.wg.edit ? wgBarHtml(lay) : ''}</div>
  <div class="wg-grid${S.wg.edit ? ' edit' : ''}" id="wgGrid">${lay.filter(w => !w.hide).map(w => wgHtml(w, d)).join('')}</div>`;
}
function wgBarHtml(lay) {
  const hid = lay.filter(w => w.hide);
  return `<div class="wg-bar"><i class="bi bi-arrows-move" style="color:var(--primary)"></i><span>Seret widget untuk memindah (di HP: tekan lama, lalu geser). <i class="bi bi-arrows-angle-expand"></i> mengubah ukuran, <i class="bi bi-eye-slash"></i> menyembunyikan.</span>${hid.length ? '<span class="muted">Tampilkan:</span>' + hid.map(w => `<button type="button" class="chip-add" onclick="wgShow('${w.id}')"><i class="bi bi-plus"></i> ${E(WG_DEF[w.id].t)}</button>`).join('') : ''}<span class="grow"></span><button type="button" class="chip-add" onclick="wgReset()"><i class="bi bi-arrow-counterclockwise"></i> Susunan bawaan</button></div>`;
}
function wgHtml(w, d) {
  const f = WG_DEF[w.id];
  return `<section class="wg" data-wg="${w.id}" data-size="${w.size}" aria-label="${E(f.t)}"><div class="wg-tools"><button type="button" data-wsize title="Ubah ukuran (sekarang ${E(SIZE_LBL[w.size])})" aria-label="Ubah ukuran widget ${E(f.t)}"><i class="bi bi-arrows-angle-expand"></i></button><button type="button" data-whide title="Sembunyikan" aria-label="Sembunyikan widget ${E(f.t)}"><i class="bi bi-eye-slash"></i></button></div><div class="wg-h"><span class="wi ${f.c}"><i class="bi ${f.i}"></i></span><h3>${E(f.t)}</h3>${wgHead(w.id, d)}</div><div class="wg-b" id="wgb_${w.id}">${wgBody(w.id, d)}</div></section>`;
}
function wgHead(id, d) {
  const go = (pg, t) => `<button type="button" class="wa" onclick="navigateTo('${pg}')" title="${E(t)}" aria-label="${E(t)}"><i class="bi bi-arrow-up-right"></i></button>`;
  if (id === 'hadir') return `<span class="wl">${fdShort(d.tanggal)}</span>` + go('presensi', 'Buka presensi');
  if (id === 'keuangan') return go('keuangan', 'Buka laporan keuangan');
  if (id === 'piket') return go('piket', 'Buka jadwal piket');
  if (id === 'armada') return `<span class="wl">${d.armada.filter(a => a.Status === 'Ada').length}/${d.armada.length} siap</span>` + go('armada', 'Buka status armada');
  if (id === 'material') return `<button type="button" class="wa" onclick="orderForm()" title="Pesan material" aria-label="Pesan material"><i class="bi bi-cart-plus"></i></button>` + go('material', 'Buka pemesanan');
  if (id === 'galeri') return `<span class="wl hide-xs">${d.galeri.auto ? 'Foto terbaru' : d.galeri.items.length + ' program pilihan'}</span><button type="button" class="wa" onclick="galPick()" title="Pilih program untuk galeri" aria-label="Pilih program untuk galeri"><i class="bi bi-sliders"></i></button>`;
  return '';
}
function wgBody(id, d) {
  try { return ({ hadir: wHadir, keuangan: wKeu, piket: wPiket, armada: wArmada, material: wMat, galeri: wGaleri, aktivitas: wAkt })[id](d); }
  catch (e) { return emptyMini('Data widget belum tersedia.'); }
}
function wHadir(d) {
  const p = d.presensi, sh = p.shiftAktif === 'pagi' ? 'pagi' : 'siang', pct = p.total ? Math.round(p.hadir / p.total * 100) : 0;
  const nm = (arr, extra) => arr.length ? arr.slice(0, 14).map(x => `<span>${E(x.nama)}${extra ? ` <em>${E(extra(x))}</em>` : ''}</span>`).join('') + (arr.length > 14 ? `<span class="muted">+${arr.length - 14} lainnya</span>` : '') : '<span class="muted">\u2013</span>';
  return `<div class="hd-top"><div><div class="wg-sub">Shift ${sh} sedang berjalan</div><div class="wg-big">${p.hadir}<small> / ${p.total} hadir</small></div><div class="wg-sub">Pagi ${p.pagi} \u00B7 Siang ${p.siang}</div></div><div class="ring" style="--p:${pct}" role="img" aria-label="${pct} persen hadir"><b>${pct}%</b></div></div>
    <div class="bars">${p.perBagian.map(b => `<div class="bar-r ${b.bagian === 'Tambal Sulam' ? 'ts' : ''}"><span>${E(b.bagian)}</span><span class="bt"><i style="width:${b.total ? Math.round(b.hadir / b.total * 100) : 0}%"></i></span><b class="num">${b.hadir}/${b.total}</b></div>`).join('')}</div>
    <div class="absen"><div class="absen-r"><span class="pill pill-bad">Ghoib ${p.ghoib.length}</span><div class="nm">${nm(p.ghoib)}</div></div><div class="absen-r"><span class="pill pill-warn">Izin ${p.izin.length}</span><div class="nm">${nm(p.izin, x => x.jenis)}</div></div>${p.belum.length ? `<div class="absen-r"><span class="pill pill-muted">Belum ${p.belum.length}</span><div class="nm">${nm(p.belum)}</div></div>` : ''}</div>`;
}
function wPiket(d) {
  if (!d.piket.length) return emptyMini('Belum ada jadwal piket hari ' + d.hari + '.');
  return `<div class="wg-sub" style="margin-bottom:.45rem">Hari ${E(d.hari)}</div><div class="mini-l">${d.piket.map(n => `<div class="mini-i"><span class="av">${E(initials(n))}</span><span class="tx">${E(n)}</span></div>`).join('')}</div>`;
}
function wArmada(d) {
  if (!d.armada.length) return emptyMini('Belum ada data armada.');
  return d.armada.map(a => a.Status === 'Ada'
    ? `<div class="car"><i class="bi bi-truck ci"></i><div class="tx">${E(a.Kendaraan)}<small>Ada di garasi</small></div><span class="pill pill-ok">Ada</span></div>`
    : `<div class="car out"><i class="bi bi-truck ci"></i><div class="tx">${E(a.Kendaraan)}<small>Dipinjam ${E(a.Pengguna || '\u2013')}${a.Tujuan ? ' \u00B7 ' + E(a.Tujuan) : ''}${a.WaktuKeluar ? ' \u00B7 sejak ' + E(String(a.WaktuKeluar).slice(11, 16)) : ''}</small></div><span class="pill pill-warn">Keluar</span></div>`).join('');
}
function wKeu(d) {
  return `<div class="keu-g">${d.keuangan.map(k => {
    const pr = k.bagian === 'Proyek', mx = Math.max(1, ...k.riwayat.map(x => x.n));
    return `<div class="keu-c ${pr ? 'pr' : ''}" title="Total Minggu ke-${k.dari || 0} s.d. ke-${k.ke || 0}"><small>${E(k.bagian.toUpperCase())} \u00B7 TOTAL</small><div class="v num">${Rp(k.total)}</div><div class="k"><span>Minggu lalu${k.lalu ? ' (M-' + k.lalu.no + ')' : ''}</span><b>${k.lalu ? Rp(k.lalu.n) : '\u2013'}</b></div><div class="k"><span>Minggu ini (M-${k.mingguIni})</span><b>${k.ini ? Rp(k.ini.n) : 'belum'}</b></div><div class="spark" aria-hidden="true">${k.riwayat.map(x => `<i style="height:${Math.max(14, Math.round(x.n / mx * 100))}%" title="M-${x.no}: ${Rp(x.n)}"></i>`).join('')}</div></div>`;
  }).join('')}</div>`;
}
function wMat(d) {
  const m = d.material;
  const it = (x, ok) => `<div class="mat-i ${ok ? 'ok' : ''}"><span class="dot"></span><div class="tx"><b>${E(x.Material)}</b><small><span class="tag-b ${x.Bagian === 'Proyek' ? 'pr' : ''}">${x.Bagian === 'Proyek' ? 'PR' : 'TS'}</span>${E(x.Tujuan)}${ok ? (x.NamaPengirim ? ' \u00B7 dikirim ' + E(x.NamaPengirim) : '') : (x.DiinputOleh ? ' \u00B7 ' + E(x.DiinputOleh) : '') + (x.Tanggal !== d.tanggal ? ' \u00B7 ' + fdShort(x.Tanggal) : '')}</small></div><span class="q">${num(x.Jumlah)} ${E(x.Satuan || '')}</span></div>`;
  return `<div class="mat-g"><div class="mat-col"><h4><i class="bi bi-hourglass-split" style="color:var(--warn-tx)"></i> Sedang dipesan <span class="pill pill-warn">${m.nDipesan}</span></h4><div class="ml">${m.dipesan.length ? m.dipesan.map(x => it(x, false)).join('') : emptyMini('Tidak ada pesanan yang menunggu.')}</div></div>
    <div class="mat-col"><h4><i class="bi bi-check2-circle" style="color:var(--em-a)"></i> Sudah datang hari ini <span class="pill pill-ok">${m.nDatang}</span></h4><div class="ml">${m.datang.length ? m.datang.map(x => it(x, true)).join('') : emptyMini('Belum ada barang datang hari ini.')}</div></div></div>`;
}
const BT_PAT = ['b-a', 'b-b', 'b-c', 'b-d', 'b-a', 'b-b', 'b-c', 'b-b', 'b-a', 'b-d', 'b-c', 'b-b'];
const galCover = p => p.foto.find(x => x.slot === 'After') || p.foto.find(x => x.slot === 'During') || p.foto[0];
function wGaleri(d) {
  const g = d.galeri;
  if (!g.items.length) return `<div class="gal-empty"><div><i class="bi bi-images" style="font-size:32px;color:var(--primary);opacity:.5"></i><div class="mt1"><b>Belum ada foto program</b></div><div>Foto Before \u00B7 During \u00B7 After yang diunggah akan tampil di sini.</div></div></div>`;
  return `<div class="bento">${g.items.map((p, i) => {
    const c = galCover(p), u = c.th || c.url;
    return `<button type="button" class="bt-i loading ${BT_PAT[i % BT_PAT.length]}" data-gal="${i}" data-thumb="${E(u)}" data-title="${E(p.Uraian)}" aria-label="Lihat foto ${E(p.Uraian)}"><span class="cnt" aria-hidden="true">${['Before', 'During', 'After'].map(s => `<span class="${p.foto.some(f => f.slot === s) ? 'on' : ''}">${s[0]}</span>`).join('')}</span><span class="ov"><b>${E(p.Uraian)}</b><small>${E(p.SubBagian)} \u00B7 ${E(KOL_LBL[p.Status] || p.Status)}</small></span></button>`;
  }).join('')}</div>`;
}
function wAkt(d) { return aktivitasHtml(d.aktivitas); }
function dashInit(c) {
  loadThumbs(c);
  const grid = $('#wgGrid', c); if (!grid) return;
  grid.addEventListener('click', e => {
    const tool = e.target.closest('[data-wsize],[data-whide]');
    if (tool) { const id = tool.closest('.wg').dataset.wg; if (tool.hasAttribute('data-wsize')) wgCycle(id); else wgHide(id); return; }
    if (S.wg && S.wg.edit) return;
    const g = e.target.closest('[data-gal]'); if (g) galOpen(Number(g.dataset.gal));
  });
  wgDragBind(grid);
}
function wgRepaint() { if (AppState.page === 'dashboard' && S.dash && S.dash.d.role !== 'toko') paintPage({ html: dashStaff(S.dash.d), init: dashInit }, true); }
function wgToggleEdit() { S.wg.edit = !S.wg.edit; wgRepaint(); if (!S.wg.edit) toast('Susunan widget disimpan di perangkat ini.', 'ok'); }
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function flip(container, sel, mutate) {
  if (reduceMotion() || !Element.prototype.animate) { mutate(); return; }
  const first = new Map($$(sel, container).map(el => [el, el.getBoundingClientRect()]));
  mutate();
  $$(sel, container).forEach(el => {
    const a = first.get(el), b = el.getBoundingClientRect();
    if (!a) { el.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1) return;
    el.animate([{ transformOrigin: 'top left', transform: `translate(${dx}px,${dy}px) scale(${a.width / (b.width || 1)},${a.height / (b.height || 1)})` }, { transformOrigin: 'top left', transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}
function wgCycle(id) {
  const lay = wgLayout(), w = lay.find(x => x.id === id), s = WG_DEF[id].sizes;
  w.size = s[(s.indexOf(w.size) + 1) % s.length]; wgSave(lay);
  const el = $(`.wg[data-wg="${id}"]`);
  flip($('#wgGrid'), '.wg', () => { if (el) el.dataset.size = w.size; });
  if (el) { const b = el.querySelector('[data-wsize]'); if (b) b.title = 'Ubah ukuran (sekarang ' + SIZE_LBL[w.size] + ')'; }
}
function wgHide(id) {
  const lay = wgLayout(); lay.find(x => x.id === id).hide = true; wgSave(lay);
  flip($('#wgGrid'), '.wg', () => { const el = $(`.wg[data-wg="${id}"]`); if (el) el.remove(); });
  $('#wgBar').innerHTML = wgBarHtml(lay);
}
function wgShow(id) { const lay = wgLayout(); lay.find(x => x.id === id).hide = false; wgSave(lay); wgRepaint(); }
function wgReset() { try { localStorage.removeItem(wgKey()); } catch (e) { } wgRepaint(); toast('Susunan widget dikembalikan ke bawaan.', 'ok'); }
function wgSaveOrder(grid) {
  const lay = wgLayout(), vis = $$('.wg', grid).map(el => el.dataset.wg);
  wgSave(vis.map(id => lay.find(x => x.id === id)).concat(lay.filter(x => vis.indexOf(x.id) < 0)));
}
function wgDragBind(grid) {
  let lifted = null;
  grid.addEventListener('touchmove', e => { if (lifted) e.preventDefault(); }, { passive: false });
  grid.addEventListener('contextmenu', e => { if (S.wg && S.wg.edit) e.preventDefault(); });
  grid.addEventListener('pointerdown', e => {
    if (!S.wg || !S.wg.edit || e.button !== 0 || e.target.closest('.wg-tools')) return;
    const el = e.target.closest('.wg'); if (!el) return;
    const touch = e.pointerType !== 'mouse', sx = e.clientX, sy = e.clientY;
    let timer = 0, grab = null, last = 0;
    const natural = () => { const t = el.style.transform; el.style.transform = 'none'; const r = el.getBoundingClientRect(); el.style.transform = t; return r; };
    const lift = () => { const r = el.getBoundingClientRect(); grab = { x: sx - r.left, y: sy - r.top }; lifted = el; el.classList.remove('press'); el.classList.add('lift'); if (navigator.vibrate) try { navigator.vibrate(10); } catch (x) { } };
    const place = ev => { const r = natural(); el.style.transform = `translate(${ev.clientX - grab.x - r.left}px,${ev.clientY - grab.y - r.top}px)`; };
    const move = ev => {
      if (!lifted) { const dd = Math.hypot(ev.clientX - sx, ev.clientY - sy); if (touch) { if (dd > 8) stop(); return; } if (dd < 5) return; lift(); }
      ev.preventDefault();
      place(ev);
      if (Date.now() - last > 110) {
        const tgt = $$('.wg', grid).find(o => { if (o === el) return false; const q = o.getBoundingClientRect(); return ev.clientX > q.left && ev.clientX < q.right && ev.clientY > q.top && ev.clientY < q.bottom; });
        if (tgt) {
          last = Date.now();
          const all = $$('.wg', grid), after = all.indexOf(el) < all.indexOf(tgt);
          flip(grid, '.wg:not(.lift)', () => grid.insertBefore(el, after ? tgt.nextSibling : tgt));
          place(ev);
        }
      }
      if (ev.clientY < 80) scrollBy(0, -14); else if (ev.clientY > innerHeight - 80) scrollBy(0, 14);
    };
    const stop = () => { clearTimeout(timer); el.classList.remove('press'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    const up = () => {
      stop();
      if (lifted !== el) return;
      lifted = null;
      const cur = el.style.transform; el.style.transform = '';
      if (cur && el.animate && !reduceMotion()) el.animate([{ transform: cur }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
      el.classList.remove('lift');
      wgSaveOrder(grid);
    };
    if (touch) { el.classList.add('press'); timer = setTimeout(lift, 330); }
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  });
  grid.addEventListener('keydown', e => {
    if (!S.wg || !S.wg.edit || !e.altKey) return;
    const el = e.target.closest('.wg'); if (!el) return;
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
    e.preventDefault();
    flip(grid, '.wg', () => { if (d > 0 && el.nextElementSibling) grid.insertBefore(el.nextElementSibling, el); else if (d < 0 && el.previousElementSibling) grid.insertBefore(el, el.previousElementSibling); });
    wgSaveOrder(grid); el.focus();
  });
  $$('.wg', grid).forEach(el => { el.tabIndex = S.wg.edit ? 0 : -1; });
}
function galImgs() {
  const out = [];
  ((S.dash && S.dash.d.galeri && S.dash.d.galeri.items) || []).forEach((p, pi) => p.foto.forEach(f => out.push({ url: f.url, th: f.th, slot: f.slot, title: p.Uraian, sub: p.SubBagian + ' \u00B7 ' + (KOL_LBL[p.Status] || p.Status), pid: p.ID, gi: pi })));
  return out;
}
function galOpen(i) {
  const imgs = galImgs(), p = S.dash.d.galeri.items[i]; if (!p) return;
  const c = galCover(p), start = Math.max(0, imgs.findIndex(x => x.gi === i && x.slot === c.slot));
  viewerOpen(imgs, start, { kicker: 'Galeri program kerja', dock: true, foot: 'Ketuk gambar kecil untuk berpindah foto' });
}
async function galPick() {
  const pc = dcPeek('program.list', {});
  let rows = pc ? pc.rows : null;
  if (!rows) { toast('Memuat daftar program\u2026'); rows = (await api('program.list')).rows; }
  const ber = rows.filter(p => p.FotoBefore || p.FotoDuring || p.FotoAfter);
  const sel = new Set((S.dash.d.galeri && S.dash.d.galeri.ids) || []);
  if (!ber.length) return toast('Belum ada program yang punya foto.', '');
  openModal({
    title: 'Pilih program untuk galeri', size: 'lg',
    body: `<p class="help" style="margin-top:0">Centang maksimal 12 program. Bila tidak ada yang dicentang, galeri otomatis menampilkan foto terbaru.</p><input class="inp mb2" type="search" id="gpQ" placeholder="Cari program\u2026" oninput="$$('.gal-pick label').forEach(l=>{l.hidden=!!this.value&&l.dataset.q.indexOf(this.value.toLowerCase())<0})" aria-label="Cari program"><div class="gal-pick">${ber.map(p => `<label data-q="${E(((p.Uraian || '') + ' ' + p.SubBagian).toLowerCase())}"><input type="checkbox" class="check" value="${p.ID}"${sel.has(p.ID) ? ' checked' : ''}><span><b>${E(p.Uraian || p.SubBagian)}</b><small>${E(p.Bagian + ' \u00B7 ' + p.SubBagian + ' \u00B7 ' + (KOL_LBL[p.Status] || p.Status))} \u00B7 ${FT.filter(f => p['Foto' + f[0]]).length}/3 foto</small></span></label>`).join('')}</div>`,
    footer: `<button class="btn-x btn-o" onclick="galSave([],this)">Kembali otomatis</button><button class="btn-x btn-p" onclick="galSave(null,this)"><i class="bi bi-check2"></i> Simpan pilihan</button>`
  });
}
function galSave(ids, btn) {
  return act(btn, async () => {
    const list = ids || $$('.gal-pick input:checked').map(x => x.value);
    if (list.length > 12) throw new Error('Maksimal 12 program. Kurangi centangnya.');
    const r = await apiM('dash.galeriSave', { ids: list });
    toast(r.message, 'ok'); closeModal(); navigateTo('dashboard', { force: true });
  });
}
function aktivitasHtml(list) {
  if (!list || !list.length) return '<div class="muted tc" style="padding:.75rem;font-size:12px">Belum ada perubahan data pada rentang ini.</div>';
  return `<ul class="act-log">${list.map(a => `<li title="${E(a.ringkas)}"><time>${E(String(a.waktu).slice(8, 10) + '/' + String(a.waktu).slice(5, 7) + ' ' + String(a.waktu).slice(11, 16))}</time><div class="trunc"><b>${E(a.oleh)}</b> ${E(a.aksi.toLowerCase())} ${E(a.data)}<span class="s trunc">${E(a.ringkas)}</span></div></li>`).join('')}</ul>`;
}

function dashToko(d) {
  const nota = d.latest.map(m => `<div class="li"><span class="ico ${m.StatusKirim === 'Proses' ? '' : 'g'}"><i class="bi bi-box-seam"></i></span><div class="grow"><div class="t">${E(m.Material)} <span class="muted fw6" style="font-size:12px">${num(m.Jumlah)} ${E(m.Satuan)}</span></div><div class="s">#${E(m.NoNota)} \u00B7 ${E(m.Tujuan)} \u00B7 ${fdate(m.Tanggal)}</div></div><div class="tr"><b>${Rp(m.Total)}</b><div>${badge(m.StatusKirim)}</div></div></div>`).join('');
  return `
  <div class="page-head"><div><h1>Ahlan wa Sahlan, ${E(AppState.user.nama)}</h1><p>Ringkasan pesanan masuk dan tagihan Pembangunan Gontor Kampus 3 untuk toko Anda.</p></div><div class="row-f gap1 wrap"><button class="btn-x btn-p" onclick="navigateTo('material')"><i class="bi bi-box-seam"></i> Kelola pesanan</button></div></div>
  <div class="kpi-grid k4">
    ${kpi(d.masuk ? 'warn' : '', 'Pesanan perlu diproses', 'bi-inbox', d.masuk, d.masuk ? 'Segera siapkan &amp; kirim' : 'Tidak ada pesanan tertunda')}
    ${kpi('', 'Tagihan belum dibayar', 'bi-receipt', `<span style="font-size:22px">${Rp(d.tagihan.total)}</span>`, `${d.tagihan.nota} nota terkirim`)}
    ${kpi('', 'Terkirim siklus ini', 'bi-truck', d.terkirimSiklus, `${fdate(d.periode.start)} \u2013 ${fdate(d.periode.end)}`)}
    ${kpi('green', 'Sudah dibayar siklus ini', 'bi-patch-check', `<span style="font-size:22px">${Rp(d.lunasSiklus)}</span>`, 'Terverifikasi pengurus')}
  </div>
  <section class="card-x"><div class="card-h"><div class="row-f gap2"><div class="ico w"><i class="bi bi-cart3"></i></div><div><h2>Pesanan terbaru</h2><p>Enam pesanan terakhir dari pengurus pembangunan</p></div></div><div class="row-f gap1"><button class="btn-x btn-o btn-sm" onclick="navigateTo('pembayaran')">Lihat tagihan</button></div></div>${nota || emptyBox('Belum ada pesanan', 'Pesanan dari pengurus akan tampil di sini.')}</section>`;
}

PAGES.presensi = async function (o) {
  const tgl = (o && o.tgl) || todayStr();
  const r = await api('absensi.get', { tanggal: tgl });
  S.pres = { tgl: r.tanggal, rows: r.rows, changed: {}, weekNo: r.weekNo, patokanTS: r.patokanTS };
  return { html: presHtml(), init: presInit };
};
function presRow(r) {
  const lock = !!r.izin, L = { H: 'Hadir', I: 'Izin', A: 'Ghoib' }, T = { H: 'H', I: 'I', A: 'G' };
  const seg = (sh, v) => ['H', 'I', 'A'].map(k => `<button type="button" class="seg ${k}${v === k ? ' on' : ''}" data-id="${r.id}" data-sh="${sh}" data-v="${k}"${lock ? ' disabled' : ''} aria-pressed="${v === k}" aria-label="${sh === 'pagi' ? 'Shift pagi' : 'Shift siang'}: ${L[k]}" title="${L[k]}">${T[k]}</button>`).join('');
  return `<div class="pres-row" id="pr_${r.id}" data-q="${E((r.nama + ' ' + r.jabatan + ' ' + r.bagian + ' ' + (r.sub || '')).toLowerCase())}" data-b="${E(r.bagian)}">
    <div class="pres-name"><b>${E(r.nama)}</b><span>${lock ? `<em class="pres-izin">Izin: ${E(r.izin.jenis)}</em>` : E(r.jabatan || '\u2013') + ' \u00B7 ' + E(r.sub || r.bagian)}</span></div>
    <div class="shift-grp" aria-label="Shift pagi">${seg('pagi', r.pagi)}</div><div class="shift-grp" aria-label="Shift siang">${seg('siang', r.siang)}</div></div>`;
}
function presHtml() {
  const s = S.pres, bag = [...new Set(s.rows.map(r => r.bagian))];
  return `
  <div class="page-head"><div><h1>Presensi harian</h1><p>Catat kehadiran dua shift per pekerja. Setiap shift bernilai 0,5 hari kerja. Pekerja yang sedang berizin otomatis berstatus Izin.</p></div></div>
  <section class="card-x">
    <div class="tools">
      <button class="icon-btn" onclick="presGoto(addD(S.pres.tgl,-1))" aria-label="Hari sebelumnya"><i class="bi bi-chevron-left"></i></button>
      <input type="date" class="inp" style="width:auto" id="presDate" value="${s.tgl}" onchange="presGoto(this.value)" aria-label="Tanggal presensi">
      <button class="icon-btn" onclick="presGoto(addD(S.pres.tgl,1))" aria-label="Hari berikutnya"><i class="bi bi-chevron-right"></i></button>
      <button class="btn-x btn-o btn-sm" onclick="presGoto(todayStr())">Hari ini</button>
      <span class="muted hide-m">${fdate(s.tgl, 1)}</span>
    </div>
    ${weekSetHtml('Tambal Sulam', s.patokanTS, s.weekNo)}
    <div class="tools">
      <div class="search"><i class="bi bi-search"></i><input class="inp" id="presQ" type="search" placeholder="Cari pekerja\u2026" aria-label="Cari pekerja" oninput="presFilter()"></div>
      <select class="inp" id="presB" style="width:auto" onchange="presFilter()" aria-label="Filter bagian"><option value="">Semua bagian</option>${bag.map(b => `<option>${E(b)}</option>`).join('')}</select>
    </div>
    <div class="tools"><span class="muted">Atur semua yang tampil:</span>
      <button class="btn-x btn-g btn-sm" onclick="presSetAll('H')"><i class="bi bi-check2-all"></i> Set semua hadir</button>
      <button class="btn-x btn-w btn-sm" onclick="presSetAll('I')">Set semua izin</button>
      <button class="btn-x btn-d btn-sm" onclick="presSetAll('A')">Set semua ghoib (G)</button>
    </div>
    <div class="shifts" id="presSum"></div>
    ${s.rows.length ? '<div class="pres-head"><span class="pres-name">Pekerja</span><span class="shift-grp">Pagi</span><span class="shift-grp">Siang</span></div>' : ''}
    <div id="presList">${s.rows.length ? s.rows.map(presRow).join('') : emptyBox('Belum ada karyawan aktif', 'Tambahkan pekerja di menu Data Karyawan.')}</div>
    <div class="savebar"><span id="presDirty" class="muted">Belum ada perubahan</span><button class="btn-x btn-p" id="presSave" onclick="act(this,savePres)" disabled><i class="bi bi-save"></i> Simpan presensi</button></div>
  </section>`;
}
function presInit() {
  $('#presList').addEventListener('click', e => {
    const b = e.target.closest('.seg'); if (!b || b.disabled) return;
    const r = S.pres.rows.find(x => x.id === b.dataset.id), sh = b.dataset.sh;
    presApply(r, sh, r[sh] === b.dataset.v ? '' : b.dataset.v); presSummary();
  });
  presSummary();
}
function presApply(r, sh, v) {
  if (r.izin || r[sh] === v) return;
  r[sh] = v; S.pres.changed[r.id] = 1;
  const row = $('#pr_' + r.id);
  $$('.seg[data-sh="' + sh + '"]', row).forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
function presSummary() {
  const rows = S.pres.rows, t = rows.length, c = (sh, v) => rows.filter(r => r[sh] === v).length, n = Object.keys(S.pres.changed).length;
  $('#presSum').innerHTML = `<div class="shift g"><small>SHIFT PAGI</small><b>${c('pagi', 'H')} / ${t} Hadir</b></div><div class="shift g"><small>SHIFT SIANG</small><b>${c('siang', 'H')} / ${t} Hadir</b></div><div class="shift w"><small>IZIN \u00B7 GHOIB</small><b>${rows.filter(r => r.izin).length} izin \u00B7 ${rows.filter(r => r.pagi === 'A' || r.siang === 'A').length} ghoib</b></div>`;
  $('#presDirty').textContent = n ? n + ' pekerja diubah, belum disimpan' : 'Belum ada perubahan';
  $('#presDirty').style.color = n ? 'var(--warn-tx)' : ''; $('#presDirty').style.fontWeight = n ? 600 : '';
  $('#presSave').disabled = !n;
  $$('.pres-row').forEach(el => el.classList.toggle('chg', !!S.pres.changed[el.id.slice(3)]));
}
function presFilter() {
  const q = $('#presQ').value.trim().toLowerCase(), b = $('#presB').value;
  $$('#presList .pres-row').forEach(el => { el.hidden = (q && el.dataset.q.indexOf(q) < 0) || (b && el.dataset.b !== b); });
}
function presSetAll(v) {
  const vis = $$('#presList .pres-row').filter(el => !el.hidden).map(el => el.id.slice(3));
  S.pres.rows.filter(r => vis.indexOf(r.id) >= 0).forEach(r => { presApply(r, 'pagi', v); presApply(r, 'siang', v); });
  presSummary();
}
async function presGoto(t) {
  if (!t) return;
  if (Object.keys(S.pres.changed).length && !(await confirmBox('Ada perubahan presensi yang belum disimpan. Pindah tanggal dan buang perubahan?', 'Buang & pindah'))) { $('#presDate').value = S.pres.tgl; return; }
  navigateTo('presensi', { tgl: t });
}
async function savePres() {
  const P = S.pres, ent = P.rows.filter(r => P.changed[r.id]).map(r => ({ kid: r.id, pagi: r.pagi, siang: r.siang }));
  if (!ent.length) return;
  const was = P.changed, tgl = P.tgl;
  P.changed = {}; presSummary();
  toast('Presensi ' + ent.length + ' pekerja disimpan.', 'ok');
  dcPatch('absensi.get', { tanggal: tgl }, d => { ent.forEach(e => { const r = d.rows.find(x => x.id === e.kid); if (r) { r.pagi = e.pagi; r.siang = e.siang; } }); });
  apiM('absensi.save', { tanggal: tgl, entries: ent }, true).catch(e => {
    if (S.pres === P) { Object.keys(was).forEach(k => { P.changed[k] = 1; }); presSummary(); }
    toast('Presensi BELUM tersimpan: ' + e.message + ' Tekan Simpan lagi.', 'err');
  });
}

PAGES.rekap = async function (o) {
  const start = (o && o.start) || (S.rekap && S.rekap.start) || cycStart(todayStr());
  const [d, hist] = await Promise.all([api('rekap.absensi', { start: start }), api('rekap.list')]);
  S.rekap = { start: d.start, d: d };
  return `
  <div class="page-head"><div><h1>Rekap mingguan absensi</h1><p>Siklus Kamis\u2013Rabu. Ekspor menghasilkan Google Spreadsheet di Drive dengan format siap laporan.</p></div></div>
  <section class="card-x">
    <div class="tools">
      <button class="icon-btn" onclick="navigateTo('rekap',{start:addD(S.rekap.start,-7)})" aria-label="Siklus sebelumnya"><i class="bi bi-chevron-left"></i></button>
      <div class="li" style="padding:.5rem .875rem"><b>Minggu ke-${d.weekNo} \u00B7 ${fdate(d.start)} \u2013 ${fdate(d.end)}</b></div>
      <button class="icon-btn" onclick="navigateTo('rekap',{start:addD(S.rekap.start,7)})" aria-label="Siklus berikutnya"><i class="bi bi-chevron-right"></i></button>
      <span class="grow"></span>
      <button class="btn-x btn-g" onclick="exportRekap('absensi',S.rekap.start,this)"><i class="bi bi-file-earmark-spreadsheet"></i> Ekspor ke Google Spreadsheet</button>
    </div>
    ${weekSetHtml('Tambal Sulam', d.patokanTS, d.weekNo)}
    ${rekapAbsHtml(d)}
  </section>
  <section class="card-x"><div class="card-h"><div><h2>Riwayat ekspor</h2><p>30 berkas terakhir yang dibuat dari aplikasi</p></div></div>${tableHtml('tbHist', [
    { l: 'Periode', k: 'Periode' }, { l: 'Jenis', f: r => badge(r.Jenis, r.Jenis === 'Absensi' ? 'ts' : 'brand') }, { l: 'Dibuat', f: r => fdt(r.DibuatPada) },
    { l: 'Berkas', f: r => `<a href="${E(r.LinkSpreadsheet)}" target="_blank" rel="noopener">Buka Spreadsheet <i class="bi bi-box-arrow-up-right"></i></a>` }
  ], hist, { empty: 'Belum ada ekspor', emptySub: 'Klik "Ekspor ke Google Spreadsheet" untuk membuat yang pertama.' })}</section>`;
};
function mxLbl(v) { return v === 'A' ? 'G' : v; }
function rekapAbsHtml(d) {
  if (!d.rows.length) return emptyBox('Belum ada karyawan aktif');
  const mx = v => `<span class="mx ${v}">${mxLbl(v) || '\u2013'}</span>`;
  const h1 = d.days.map(x => `<th colspan="2" class="mx-day">${HARI[dowOf(x)].slice(0, 3)} ${x.slice(8)}</th>`).join('');
  const h2 = d.days.map(() => '<th class="mx-day">P</th><th>S</th>').join('');
  const body = d.rows.map(r => `<tr><td class="mx-name"><b>${E(r.nama)}</b><span class="sub">${E(r.bagian + (r.sub ? ' \u00B7 ' + r.sub : ''))}</span></td>${r.cells.map(c => `<td class="mx-day">${mx(c[0])}</td><td>${mx(c[1])}</td>`).join('')}<td class="n mx-sum"><b>${hk(r.hadir)}</b></td><td class="n">${hk(r.izin)}</td><td class="n">${hk(r.alpa)}</td></tr>`).join('');
  return `<div class="tbl-wrap"><table class="tbl mxt"><thead><tr><th rowspan="2" class="mx-name">Pekerja</th>${h1}<th rowspan="2" class="mx-sum">Hadir</th><th rowspan="2">Izin</th><th rowspan="2">Ghoib</th></tr><tr>${h2}</tr></thead><tbody>${body}<tr class="tot-grand"><td class="mx-name">TOTAL (hari kerja)</td><td colspan="14"></td><td class="n mx-sum">${hk(d.total.hadir)}</td><td class="n">${hk(d.total.izin)}</td><td class="n">${hk(d.total.alpa)}</td></tr></tbody></table></div>
  <p class="help mt1"><span class="mx H">H</span> Hadir \u00B7 <span class="mx I">I</span> Izin \u00B7 <span class="mx A">G</span> Ghoib \u00B7 <span class="mx">\u2013</span> belum diinput. P = shift pagi, S = shift siang; tiap shift bernilai 0,5 hari kerja.</p>`;
}
function weekSetHtml(bagian, patokan, weekNo) {
  return `<div class="week-set"><span class="pill pill-${bagian === 'Proyek' ? 'brand' : 'ts'}">Minggu ke-${weekNo}</span><label class="lbl" for="wk_${bagian.replace(/\s/g, '')}" style="margin:0">Awal Minggu ke-1 ${E(bagian)}</label><input type="date" class="inp" style="width:auto" id="wk_${bagian.replace(/\s/g, '')}" value="${E(patokan)}" onchange="saveWeekStart('${bagian}',this.value)"></div>`;
}
async function saveWeekStart(bagian, tgl) {
  if (!tgl) return;
  await act(null, async () => { const r = await apiM('keu.patokan', { Bagian: bagian, Tanggal: tgl }); toast(r.message + ' Berlaku untuk presensi, program kerja, rekapan, dan keuangan.', 'ok'); navigateTo(AppState.page); });
}
function rekapBayarHtml(d) {
  const cols = [
    { l: 'No. nota', f: r => `<b>${E(r.NoNota)}</b>` }, { l: 'Tanggal', f: r => fdate(r.Tanggal) }, { l: 'Tujuan', k: 'Tujuan' },
    { l: 'Material', f: r => `${E(r.Material)}<span class="sub">${num(r.Jumlah)} ${E(r.Satuan)}</span>` }, { l: 'Harga satuan', n: 1, f: r => Rp(r.HargaSatuan) }, { l: 'Total', n: 1, f: r => `<b>${Rp(r.Total)}</b>` },
    { l: 'Kirim', f: r => badge(r.StatusKirim) }, { l: 'Bayar', f: r => badge(r.StatusBayar) }
  ];
  const sec = g => `<div class="tbl-wrap" style="margin-bottom:1rem"><table class="tbl"><thead class="h-${g.key.toLowerCase()}"><tr><th colspan="8">Bagian ${E(g.bagian)}</th></tr><tr>${cols.map(c => `<th class="${c.n ? 'n' : ''}" style="background:var(--surface-2);color:var(--text-2)">${c.l}</th>`).join('')}</tr></thead><tbody>${g.items.length ? g.items.map(r => `<tr>${cols.map(c => `<td class="${c.n ? 'n' : ''}">${c.f(r)}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="8" class="muted tc">Tidak ada nota pada siklus ini</td></tr>'}<tr class="tot-${g.key.toLowerCase()}"><td colspan="5">TOTAL ${E(g.bagian.toUpperCase())}</td><td class="n">${Rp(g.total)}</td><td colspan="2"></td></tr></tbody></table></div>`;
  return d.groups.map(sec).join('') + `<div class="tbl-wrap"><table class="tbl"><tbody><tr class="tot-grand"><td>GRAND TOTAL</td><td class="n">${Rp(d.grand)}</td></tr></tbody></table></div>
  <div class="row-f gap1 wrap mt2"><span class="pill pill-ok">Lunas ${Rp(d.lunas)}</span><span class="pill pill-warn">Belum dibayar ${Rp(d.belum)}</span><span class="muted" style="font-size:12px">Nota berstatus Ditolak tidak dihitung.</span></div>`;
}

const CRUD = {};
function crud(cfg) {
  CRUD[cfg.id] = cfg;
  PAGES[cfg.id] = async function () {
    const both = await Promise.all([cfg.prep ? cfg.prep() : {}, api(cfg.list, cfg.args ? cfg.args() : {})]);
    const ctx = both[0], res = both[1];
    S[cfg.id] = { rows: cfg.rows ? cfg.rows(res) : res, ctx: ctx, res: res };
    return crudHtml(cfg);
  };
}
function crudHtml(cfg) {
  const st = S[cfg.id], canDel = !cfg.delRoles || cfg.delRoles.indexOf(role()) >= 0;
  const cols = cfg.cols.concat([{ l: '', f: r => `<div class="actions">${cfg.rowActions ? cfg.rowActions(r) : ''}<button class="btn-x btn-o btn-sm" onclick="crudEdit('${cfg.id}','${r.ID}')"><i class="bi bi-pencil"></i><span class="hide-m">Ubah</span></button>${canDel ? `<button class="btn-x btn-d btn-sm" onclick="crudDel('${cfg.id}','${r.ID}')" aria-label="Hapus"><i class="bi bi-trash"></i></button>` : ''}</div>` }]);
  return `<div class="page-head"><div><h1>${E(cfg.title)}</h1><p>${E(cfg.sub)}</p></div><div class="row-f gap1 wrap">${cfg.headBtn || ''}${cfg.importType ? `<button class="btn-x btn-o" onclick="importOpen('${cfg.importType}')"><i class="bi bi-file-earmark-spreadsheet"></i> Impor Excel</button>` : ''}<button class="btn-x btn-p" onclick="crudAdd('${cfg.id}')"><i class="bi bi-plus-lg"></i> ${E(cfg.add)}</button></div></div>
  ${cfg.header ? cfg.header(st) : ''}
  <section class="card-x"><div class="tools">${searchBox('q_' + cfg.id, 'tb_' + cfg.id, 'Cari\u2026')}</div>${tableHtml('tb_' + cfg.id, cols, st.rows, { cls: cfg.cls || '', empty: cfg.empty || 'Belum ada data', emptySub: cfg.emptySub || 'Klik "' + cfg.add + '" untuk menambah.' })}</section>`;
}
function openCrudForm(cfg, row) {
  const st = S[cfg.id], fields = typeof cfg.fields === 'function' ? cfg.fields(st.ctx, row) : cfg.fields;
  openForm({
    title: (row ? 'Ubah ' : 'Tambah ') + cfg.noun, fields: fields, row: row, values: row || (cfg.defaults ? cfg.defaults() : {}),
    save: async d => { if (row) d.ID = row.ID; if (cfg.validate) cfg.validate(d, st.ctx); const r = await apiM(cfg.save, d); toast(r.message, 'ok'); closeModal(); navigateTo(cfg.id); }
  });
  if (cfg.afterOpen) cfg.afterOpen(st.ctx, row);
}
const crudAdd = id => openCrudForm(CRUD[id], null);
const crudEdit = (id, rid) => openCrudForm(CRUD[id], S[id].rows.find(r => r.ID === rid));
async function crudDel(id, rid) {
  const cfg = CRUD[id];
  if (!(await confirmBox('Hapus data ini? Tindakan ini tercatat di audit dan tidak dapat dibatalkan.', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM(cfg.del, { id: rid }); toast(r.message, 'ok'); navigateTo(id); });
}
const BAG_KARY = ['Tambal Sulam', 'Proyek'];
function karSubMode() {
  const ts = ($('#f_Bagian') || {}).value === 'Tambal Sulam', el = $('#f_SubBagian'); if (!el) return;
  if (ts) { el.setAttribute('list', 'f_SubBagian_dl'); el.placeholder = 'Ketik untuk mencari, mis. Perairan'; }
  else { el.removeAttribute('list'); el.placeholder = 'Mis. Rusunawa Asatidz Lt. 2'; }
  const h = el.parentElement.querySelector('.help'); if (h) h.textContent = ts ? 'Tambal Sulam: wajib salah satu dari daftar resmi.' : 'Isi bebas sesuai lokasi kerja.';
}

crud({
  id: 'karyawan', title: 'Data karyawan', sub: 'Master pekerja lapangan. Hanya karyawan aktif yang muncul di presensi.', add: 'Tambah karyawan', noun: 'karyawan',
  list: 'karyawan.list', save: 'karyawan.save', del: 'karyawan.delete', importType: 'karyawan', headBtn: '<button class="btn-x btn-o" onclick="urutOpen()"><i class="bi bi-arrow-down-up"></i> Atur urutan</button>',
  prep: async () => ({ pil: await api('pilihan.list') }),
  cls: 'nostk tbl-slim tbl-kar',
  cols: [{ l: 'Nama', f: r => `<b>${E(r.Nama)}</b><span class="sub">${E([r.Jabatan, r.Bagian, r.SubBagian].filter(Boolean).join(' \u00B7 '))}</span>${BAG_KARY.indexOf(r.Bagian) < 0 ? '<span class="pill pill-warn" style="margin-top:2px">Bagian lama \u2014 ubah ke Tambal Sulam / Proyek</span>' : ''}` }, { l: 'Status', c: 'c-st', f: r => r.Status === 'Aktif' ? '<span class="dot-ok" title="Aktif" aria-label="Aktif"></span>' : badge(r.Status) }],
  fields: (ctx, row) => {
    const jb = ctx.pil.jabatan.slice(); if (row && row.Jabatan && jb.indexOf(row.Jabatan) < 0) jb.push(row.Jabatan);
    return [{ k: 'Nama', l: 'Nama lengkap', req: true, full: true, ml: 80 }, { k: 'Bagian', l: 'Bagian', t: 'select', blank: 'Pilih bagian\u2026', opts: BAG_KARY, req: true }, { k: 'Status', l: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'] },
      { k: 'SubBagian', l: 'Sub-bagian / lokasi kerja', list: ctx.pil.subTS, help: ' ' }, { k: 'Jabatan', l: 'Jabatan', t: 'select', blank: 'Pilih jabatan\u2026', opts: jb }];
  },
  afterOpen: () => { const b = $('#f_Bagian'); if (b) { b.addEventListener('change', karSubMode); karSubMode(); } },
  validate: (d, ctx) => { if (d.Bagian === 'Tambal Sulam' && ctx.pil.subTS.indexOf(d.SubBagian) < 0) { $('#f_SubBagian').focus(); throw new Error('Pilih sub-bagian Tambal Sulam dari daftar: ketik lalu pilih salah satu.'); } },
  defaults: () => ({ Bagian: 'Proyek', Status: 'Aktif' })
});
crud({
  id: 'izin', title: 'Perizinan pekerja', sub: 'Izin yang disimpan otomatis mengubah presensi pada rentang tanggalnya menjadi Izin (tidak dihitung ghoib).', add: 'Catat izin', noun: 'izin',
  prep: async () => ({ kar: (await api('karyawan.list')).filter(k => k.Status === 'Aktif') }),
  list: 'izin.list', save: 'izin.save', del: 'izin.delete', empty: 'Belum ada catatan izin',
  cols: [
    { l: 'Pekerja', f: r => `<b>${E(r.Nama)}</b>` },
    { l: 'Rentang tanggal', f: r => { const now = todayStr(), aktif = r.TglMulai <= now && r.TglSelesai >= now; return `${fdate(r.TglMulai)} \u2013 ${fdate(r.TglSelesai)}${aktif ? ' <span class="pill pill-warn">Berlaku hari ini</span>' : ''}`; } },
    { l: 'Jenis', f: r => `<span class="pill pill-warn">${E(r.JenisIzin)}</span>` }, { l: 'Keterangan', k: 'Alasan' }
  ],
  fields: ctx => [
    { k: 'KaryawanID', l: 'Pekerja', t: 'search', req: true, full: true, ph: 'Ketik nama pekerja\u2026', opts: ctx.kar.map(k => ({ v: k.ID, l: k.Nama + ' \u00B7 ' + k.Bagian + (k.SubBagian ? ' \u00B7 ' + k.SubBagian : '') })) },
    { k: 'TglMulai', l: 'Mulai', t: 'date', req: true }, { k: 'TglSelesai', l: 'Selesai', t: 'date', req: true },
    { k: 'JenisIzin', l: 'Jenis izin', t: 'select', opts: ['Sakit', 'Izin Keluarga', 'Izin Lainnya', 'Cuti'] },
    { k: 'Alasan', l: 'Alasan / keterangan', t: 'textarea', req: true, full: true }
  ],
  defaults: () => ({ TglMulai: todayStr(), TglSelesai: todayStr(), JenisIzin: 'Sakit' })
});
PAGES.piket = async function () {
  const days = await api('piket.list');
  S.piket = { days: days };
  return { html: piketHtml(), init: () => { } };
};
function piketHtml() {
  const cards = S.piket.days.map(d => `<div class="day-card">
    <div class="day-h"><b><i class="bi bi-calendar-event"></i> ${E(d.hari.toUpperCase())}</b><span class="pill">${d.items.length} Petugas</span></div>
    <div style="padding:.75rem;display:grid;gap:.5rem">${d.items.length ? d.items.map((x, i) => `<div class="li"><span class="avatar sm">${i + 1}</span><div class="grow fw6">${E(x.StaffNama)}</div><button class="btn-x btn-o btn-sm" onclick="piketEdit('${x.ID}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button><button class="btn-x btn-d btn-sm" onclick="piketDel('${x.ID}')" aria-label="Hapus"><i class="bi bi-trash"></i></button></div>`).join('') : '<div class="muted tc" style="padding:.75rem">Belum ada petugas</div>'}</div>
    <div class="tc" style="border-top:1px solid var(--border);padding:.625rem"><button class="link-btn" onclick="piketAdd('${E(d.hari)}')"><i class="bi bi-plus-lg"></i> Tambah di hari ${E(d.hari)}</button></div>
  </div>`).join('');
  return `<div class="page-head"><div><h1>Jadwal piket staff</h1><p>Petugas penanggung jawab harian (Sabtu \u2013 Kamis), berulang setiap minggu.</p></div><button class="btn-x btn-g" onclick="piketAdd()"><i class="bi bi-plus-lg"></i> Tambah petugas piket</button></div>
  <div class="grid3">${cards}</div>`;
}
const pkOpts = names => names.map(n => `<label class="pk-opt" data-q="${E(n.toLowerCase())}"><input type="checkbox" class="check pk-chk" value="${E(n)}"> ${E(n)}</label>`).join('');
async function piketAdd(hari) {
  const names = dcPeek('piket.staff', {}) || [];
  const list = pkOpts(names);
  dcFresh('piket.staff', {}, d => {
    const box = $('.pk-list'); if (!box) return;
    const on = $$('.pk-chk:checked').map(x => x.value);
    box.innerHTML = pkOpts(d) || '<div class="muted" style="padding:.5rem">Belum ada akun Admin aktif.</div>';
    $$('.pk-chk').forEach(x => { if (on.indexOf(x.value) >= 0) x.checked = true; });
    const q = $('#pkQ'); if (q && q.value) pkFilter();
  });
  openForm({
    title: 'Tambah petugas piket', submit: 'Simpan',
    fields: [
      { k: 'Hari', l: 'Hari', t: 'select', req: true, full: true, opts: ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'] },
      { k: 'pk', t: 'html', html: `<span class="lbl">Pilih dari akun Admin</span>${names.length > 6 ? '<input class="inp mb2" id="pkQ" type="search" placeholder="Cari nama\u2026" oninput="pkFilter()" aria-label="Cari nama">' : ''}<div class="pk-list">${list || '<div class="muted" style="padding:.5rem">Belum ada akun Admin aktif.</div>'}</div>` },
      { k: 'StaffNama', l: 'Nama lain (opsional, satu per baris)', t: 'textarea', full: true, help: 'Untuk petugas yang tidak punya akun.' }
    ],
    values: { Hari: hari || 'Sabtu' },
    save: async d => {
      const pilih = $$('.pk-chk:checked').map(x => x.value), lain = String(d.StaffNama || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
      const semua = pilih.concat(lain.filter(n => pilih.indexOf(n) < 0));
      if (!semua.length) throw new Error('Pilih minimal satu nama, atau isi nama lain.');
      const r = await apiM('piket.save', { Hari: d.Hari, StaffNama: semua.join('\n') }); toast(r.message, 'ok'); closeModal(); navigateTo('piket');
    }
  });
}
function pkFilter() { const q = $('#pkQ').value.trim().toLowerCase(); $$('.pk-opt').forEach(el => { el.hidden = !!q && el.dataset.q.indexOf(q) < 0; }); }
async function piketEdit(id) {
  const item = S.piket.days.flatMap(d => d.items).find(x => x.ID === id);
  const names = dcPeek('piket.staff', {}) || [];
  dcFresh('piket.staff', {}, d => { const dl = $('#f_StaffNama_dl'); if (dl) dl.innerHTML = d.map(n => `<option value="${E(n)}">`).join(''); });
  openForm({
    title: 'Ubah petugas piket', submit: 'Simpan',
    fields: [{ k: 'Hari', l: 'Hari', t: 'select', req: true, opts: ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'] }, { k: 'StaffNama', l: 'Nama staf', req: true, list: names, help: 'Ketik untuk memilih dari akun Admin, atau isi nama lain.' }],
    values: item,
    save: async d => { d.ID = id; const r = await apiM('piket.save', d); toast(r.message, 'ok'); closeModal(); navigateTo('piket'); }
  });
}
async function piketDel(id) {
  if (!(await confirmBox('Hapus petugas piket ini?', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('piket.delete', { id: id }); toast(r.message, 'ok'); navigateTo('piket'); });
}
crud({
  id: 'armada', title: 'Status armada', sub: 'Ketersediaan kendaraan operasional. Tandai keluar/kembali agar dashboard selalu akurat.', add: 'Tambah armada', noun: 'armada',
  list: 'armada.list', save: 'armada.save', del: 'armada.delete',
  prep: async () => ({ pil: await api('pilihan.list') }),
  cols: [{ l: 'Kendaraan', f: r => `<b>${E(r.Kendaraan)}</b>` }, { l: 'Status', f: r => badge(r.Status) }, { l: 'Pengguna / keperluan', f: r => (r.Status === 'Ada' ? '<span class="muted">Siaga di garasi</span>' : `${E(r.Pengguna || '\u2013')}<span class="sub">${E([r.Keperluan, r.Tujuan].filter(Boolean).join(' \u00B7 '))}</span>`) }, { l: 'Keluar', f: r => fdt(r.WaktuKeluar) }, { l: 'Kembali', f: r => fdt(r.WaktuKembali) }],
  rowActions: r => (r.Status === 'Ada' ? `<button class="btn-x btn-w btn-sm" onclick="armadaOut('${r.ID}')"><i class="bi bi-box-arrow-right"></i> Keluar</button>` : `<button class="btn-x btn-g btn-sm" onclick="armadaBack('${r.ID}')"><i class="bi bi-box-arrow-in-left"></i> Kembali</button>`),
  fields: (ctx, row) => {
    const kd = ctx.pil.kendaraan.slice(); if (row && row.Kendaraan && kd.indexOf(row.Kendaraan) < 0) kd.push(row.Kendaraan);
    return [{ k: 'Kendaraan', l: 'Nama kendaraan', t: 'select', req: true, opts: kd }, { k: 'Status', l: 'Status', t: 'select', opts: ['Ada', 'Tidak Ada'] }, { k: 'Pengguna', l: 'Pengguna / driver' }, { k: 'Keperluan', l: 'Keperluan', t: 'select', blank: 'Pilih keperluan\u2026', opts: ctx.pil.keperluan }, { k: 'Tujuan', l: 'Tujuan', full: true, ph: 'Ketik tujuan, mis. Ambil material di Toko KUK' }, { k: 'WaktuKeluar', l: 'Waktu keluar', t: 'datetime-local' }, { k: 'WaktuKembali', l: 'Waktu kembali', t: 'datetime-local' }];
  },
  defaults: () => ({ Status: 'Ada' })
});
function armadaOut(id) {
  openForm({ title: 'Tandai armada keluar', submit: 'Tandai keluar', fields: [{ k: 'pengguna', l: 'Pengguna / driver', req: true, full: true }, { k: 'keperluan', l: 'Keperluan', t: 'select', req: true, full: true, blank: 'Pilih keperluan\u2026', opts: ((S.armada && S.armada.ctx.pil) || { keperluan: ['Bagian', 'Sektor', 'Pribadi'] }).keperluan }, { k: 'tujuan', l: 'Tujuan', req: true, full: true, ph: 'Ketik tujuan, mis. Ambil material di Toko KUK' }], save: async d => { d.id = id; d.aksi = 'keluar'; const r = await apiM('armada.toggle', d); toast(r.message, 'ok'); closeModal(); navigateTo('armada'); } });
}
async function armadaBack(id) { await act(null, async () => { const r = await apiM('armada.toggle', { id: id, aksi: 'kembali' }); toast(r.message, 'ok'); navigateTo('armada'); }); }
PAGES.keuangan = async function () {
  const data = await api('keu.list');
  S.keu = { data: data };
  return { html: keuHtml(), init: () => { } };
};
function keuPanel(k) {
  const g = k.bagian === 'Tambal Sulam' ? 'ts' : 'pr';
  const rows = k.items.map(x => `<tr><td><b>M-${x.MingguKe}</b></td><td>${fdate(x.TglMulai)}</td><td>${fdate(addD(x.TglMulai, 6))}</td><td class="n"><b class="num" style="color:var(--${g === 'ts' ? 'em' : 'primary-deep'})">${Rp(x.Nominal)}</b></td><td><div class="actions"><button class="btn-x btn-w btn-sm" onclick="keuEdit('${x.ID}','${E(k.bagian)}')" aria-label="Ubah"><i class="bi bi-pencil"></i></button>${isSuper() ? `<button class="btn-x btn-d btn-sm" onclick="keuDel('${x.ID}')" aria-label="Hapus"><i class="bi bi-trash"></i></button>` : ''}</div></td></tr>`).join('');
  return `<div class="grp grp-${g}"><div class="grp-h">${E(k.bagian.toUpperCase())}<span class="pill">${k.items.length} Minggu</span></div>
    <div class="grp-b" style="padding:0">
      <div class="row-f between wrap gap1" style="padding:.75rem 1rem;border-bottom:1px solid var(--border)"><div><div class="fw7" style="font-size:12px">PATOKAN AWAL ${E(k.bagian.toUpperCase())} (MINGGU KE-1)</div><div class="muted" style="font-size:12px">Patokan kalkulasi otomatis periode Kamis s/d Rabu</div></div><input type="date" class="inp" style="width:auto" value="${E(k.patokanAwal)}" onchange="keuPatokan('${E(k.bagian)}',this.value)" aria-label="Patokan awal ${E(k.bagian)}"></div>
      <div class="tbl-wrap" style="border:0;border-radius:0;max-height:620px;overflow-y:auto"><table class="tbl"><thead><tr><th>Minggu</th><th>Mulai</th><th>Selesai</th><th class="n">Nominal anggaran</th><th class="n">Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted tc">Belum ada data</td></tr>'}</tbody></table></div>
    </div></div>`;
}
function keuHtml() {
  const tot = b => (S.keu.data.find(k => k.bagian === b) || { total: 0 }).total;
  return `<div class="page-head"><div><h1>Laporan keuangan</h1><p>Rekapitulasi anggaran mingguan per bagian, dengan penomoran minggu masing-masing.</p></div><div class="row-f gap1 wrap"><button class="btn-x btn-o" onclick="importOpen('keuangan')"><i class="bi bi-file-earmark-spreadsheet"></i> Impor Excel</button><button class="btn-x btn-g" onclick="keuAdd()"><i class="bi bi-plus-lg"></i> Input laporan keuangan</button></div></div>
  <div class="two mb2">
    <div class="sum-card ts"><small>TOTAL KEUANGAN TAMBAL SULAM</small><b class="num">${Rp(tot('Tambal Sulam'))}</b></div>
    <div class="sum-card pr"><small>TOTAL KEUANGAN PROYEK</small><b class="num">${Rp(tot('Proyek'))}</b></div>
  </div>
  <div class="two">${S.keu.data.map(keuPanel).join('')}</div>`;
}
function keuPat(bagian) { const g = (S.keu && S.keu.data || []).find(x => x.bagian === bagian); return g && g.patokanAwal ? cycStart(g.patokanAwal) : ''; }
function keuWeekOf(bagian, tgl) { const p = keuPat(bagian); if (!p || !tgl) return 0; const n = Math.floor((parseD(cycStart(tgl)) - parseD(p)) / (7 * 864e5)) + 1; return n < 1 ? 1 : n; }
function keuWeekOpts(bagian, selN, selfId) {
  const p = keuPat(bagian); if (!p) return '';
  const ada = {}; ((S.keu.data.find(x => x.bagian === bagian) || {}).items || []).forEach(x => { if (x.ID !== selfId) ada[cycStart(x.TglMulai)] = 1; });
  const cur = keuWeekOf(bagian, todayStr()), max = Math.max(cur + 4, selN || 0);
  let h = '';
  for (let n = max; n >= 1; n--) { const st = addD(p, (n - 1) * 7); h += `<option value="${n}"${n === selN ? ' selected' : ''}>Minggu ke-${n} \u00B7 ${fdate(st)} \u2013 ${fdate(addD(st, 6))}${ada[st] ? ' \u00B7 sudah ada' : ''}${n === cur ? ' \u00B7 minggu ini' : ''}</option>`; }
  return h;
}
const rpFmt = v => { const d = String(v === undefined || v === null ? '' : v).replace(/\D/g, ''); return d ? Number(d).toLocaleString('id-ID') : ''; };
const rpNum = v => { const d = String(v || '').replace(/^rp\.?\s*/i, '').replace(/\./g, '').replace(/\s/g, '').replace(',', '.'); return d === '' ? NaN : Number(d); };
function keuFormBind(selfId) {
  const B = $('#f_Bagian'), W = $('#f_MingguKe'), T = $('#f_TglMulai'), N = $('#f_Nominal'), info = $('#keuInfo');
  const bag = () => B ? B.value : S.keuBag;
  const sync = from => {
    const p = keuPat(bag());
    if (!p) { if (W) { W.innerHTML = '<option value="">Atur patokan Minggu ke-1 dulu</option>'; W.disabled = true; } if (info) info.textContent = 'Patokan awal Minggu ke-1 ' + bag() + ' belum diatur. Isi tanggal secara manual.'; return; }
    if (W) W.disabled = false;
    if (from === 'tgl' || from === 'bag') { const n = keuWeekOf(bag(), T.value || todayStr()); if (W) W.innerHTML = keuWeekOpts(bag(), n, selfId); }
    if (from === 'mg' && W && W.value) T.value = addD(p, (Number(W.value) - 1) * 7);
    const n = keuWeekOf(bag(), T.value), st = cycStart(T.value);
    if (info) info.textContent = 'Minggu ke-' + n + ' ' + bag() + ': ' + fdate(st) + ' \u2013 ' + fdate(addD(st, 6));
  };
  if (B) B.addEventListener('change', () => sync('bag'));
  if (W) W.addEventListener('change', () => sync('mg'));
  if (T) T.addEventListener('change', () => sync('tgl'));
  if (N) { N.setAttribute('inputmode', 'numeric'); N.value = rpFmt(N.value); N.addEventListener('input', () => { const pos = N.value.length - N.selectionStart; N.value = rpFmt(N.value); const np = Math.max(0, N.value.length - pos); try { N.setSelectionRange(np, np); } catch (e) { } }); }
  sync('bag');
}
function keuNominal(d) { const n = rpNum(d.Nominal); if (!(n >= 0)) throw new Error('Nominal harus berupa angka, mis. 16.620.800'); d.Nominal = n; delete d.MingguKe; return d; }
function keuAdd(bagian) {
  S.keuBag = bagian || 'Tambal Sulam';
  openForm({ title: 'Input laporan keuangan', submit: 'Simpan',
    fields: [{ k: 'Bagian', l: 'Bagian', t: 'select', opts: ['Tambal Sulam', 'Proyek'], req: true, full: true },
      { k: 'MingguKe', l: 'Minggu ke-', t: 'select', opts: [], full: true },
      { k: 'TglMulai', l: 'Tanggal (otomatis dari Minggu ke-)', t: 'date', req: true },
      { k: 'Nominal', l: 'Nominal anggaran (Rp)', req: true, ph: 'mis. 16.620.800' },
      { k: 'info', t: 'html', html: '<p class="help" id="keuInfo" style="margin:0"></p>' }],
    values: { Bagian: S.keuBag, TglMulai: todayStr() },
    save: async d => { const r = await apiM('keu.save', keuNominal(d)); toast(r.message, 'ok'); closeModal(); navigateTo('keuangan'); }
  });
  keuFormBind('');
}
function keuEdit(id, bagian) {
  const item = S.keu.data.flatMap(k => k.items).find(x => x.ID === id);
  S.keuBag = bagian;
  openForm({ title: 'Ubah laporan keuangan \u00B7 ' + bagian, submit: 'Simpan',
    fields: [{ k: 'MingguKe', l: 'Minggu ke-', t: 'select', opts: [], full: true },
      { k: 'TglMulai', l: 'Tanggal (otomatis dari Minggu ke-)', t: 'date', req: true },
      { k: 'Nominal', l: 'Nominal anggaran (Rp)', req: true, ph: 'mis. 16.620.800' },
      { k: 'info', t: 'html', html: '<p class="help" id="keuInfo" style="margin:0"></p>' }],
    values: { TglMulai: item.TglMulai, Nominal: item.Nominal },
    save: async d => { d.ID = id; d.Bagian = bagian; const r = await apiM('keu.save', keuNominal(d)); toast(r.message, 'ok'); closeModal(); navigateTo('keuangan'); }
  });
  keuFormBind(id);
}
async function keuDel(id) {
  if (!(await confirmBox('Hapus data laporan keuangan ini?', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('keu.delete', { id: id }); toast(r.message, 'ok'); navigateTo('keuangan'); });
}
async function keuPatokan(bagian, tanggal) {
  if (!tanggal) return;
  await act(null, async () => { const r = await apiM('keu.patokan', { Bagian: bagian, Tanggal: tanggal }); toast(r.message, 'ok'); navigateTo('keuangan'); });
}
function progRange(key, bagian, mg) {
  const t = todayStr(), st = cycStart(t);
  const wk = s0 => { if (!mg) return ''; const pat = bagian === 'Proyek' ? mg.pr.patokan : mg.ts.patokan; if (!pat) return ''; const n = Math.floor((parseD(s0) - parseD(cycStart(pat))) / (7 * 864e5)) + 1; return 'Minggu ke-' + (n < 1 ? 1 : n) + ' '; };
  if (key === 'ini') return { from: st, to: addD(st, 6), label: wk(st) + '(' + fdate(st) + ' \u2013 ' + fdate(addD(st, 6)) + ')' };
  if (key === 'lalu') { const a = addD(st, -7); return { from: a, to: addD(a, 6), label: wk(a) + '(' + fdate(a) + ' \u2013 ' + fdate(addD(a, 6)) + ')' }; }
  if (key === 'bulan') { const a = t.slice(0, 8) + '01', d = new Date(parseD(a)); d.setUTCMonth(d.getUTCMonth() + 1); const b = addD(d.toISOString().slice(0, 10), -1); return { from: a, to: b, label: 'Bulan ' + BLN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4) }; }
  if (key === 'rentang') { const a = S.progFrom || '', b = S.progTo || ''; return { from: a, to: b, label: (a ? fdate(a) : 'awal') + ' \u2013 ' + (b ? fdate(b) : 'akhir') }; }
  return { from: '', to: '', label: 'Semua periode' };
}
/** Program Kerja & Proses: tampil bila dimulai sebelum akhir periode. Hasil Usaha: tampil bila selesai di dalam periode. */
function progInRange(p, rg) {
  if (!rg.from && !rg.to) return true;
  if (p.Status === 'Selesai') { const d = p.TglRealisasi || p.Tanggal; return (!rg.from || d >= rg.from) && (!rg.to || d <= rg.to); }
  return !rg.to || p.Tanggal <= rg.to;
}
async function deleteSlot(pid, slot) {
  if (!(await confirmBox('Hapus foto <b>' + E(slot) + '</b>? File foto di Google Drive juga ikut dihapus.', 'Ya, hapus foto'))) return;
  try {
    const r = await apiM('program.fotoDel', { id: pid, slot: slot });
    toast(r.message, 'ok'); programUpdated(r.data);
  } catch (e) { toast(e.message, 'err'); }
}
const KOL = [['Direncanakan', 'Program Kerja'], ['Berjalan', 'Proses'], ['Selesai', 'Hasil Usaha']];
const FT = [['Before', 'Before'], ['During', 'During'], ['After', 'After']];
const fotoMetaOf = p => { try { const o = JSON.parse(p.FotoMeta || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
PAGES.program = async function () {
  const r = await api('program.list');
  S.prog = { rows: r.rows, sub: r.sub, minggu: r.minggu, urut: r.urutSub || [] }; S.progKey = S.progKey || 'ini'; S.progBag = S.progBag || 'Semua';
  const bagBtn = b => `<button type="button" class="${S.progBag === b ? 'on' : ''}" data-pbag="${b}" onclick="progBagSet('${b}')">${b === 'Semua' ? 'Semua bagian' : E(b)}</button>`;
  return {
    html: `<div class="page-head"><div><h1>Program kerja</h1><p>Papan per sub-bagian: <b>Program Kerja \u2192 Proses \u2192 Hasil Usaha</b>. Seret kartu untuk memindah (di HP: tekan lama kartunya). Ikon kamera menunjukkan kelengkapan foto Before \u00B7 During \u00B7 After.</p></div><div class="row-f gap1 wrap ph-acts"><button class="btn-x btn-o" onclick="subManage()"><i class="bi bi-diagram-3"></i> Kelola sub-bagian</button><button class="btn-x btn-o" onclick="importOpen('program')"><i class="bi bi-file-earmark-spreadsheet"></i> Impor Excel</button><button class="btn-x btn-g" onclick="lapOpen()"><i class="bi bi-file-earmark-word"></i> Export Docs mingguan</button><button class="btn-x btn-p" onclick="programForm()"><i class="bi bi-plus-lg"></i> Tambah program</button></div></div>
    <section class="card-x"><div class="kb-tools">
      <div class="seg-b" role="group" aria-label="Pilih bagian">${['Semua', 'Tambal Sulam', 'Proyek'].map(bagBtn).join('')}</div>
      <div class="search"><i class="bi bi-search"></i><input class="inp" id="progQ" type="search" placeholder="Cari program, lokasi, pekerja\u2026" aria-label="Cari program" oninput="clearTimeout(S.progT);S.progT=setTimeout(paintPrograms,180)"></div>
      <select class="inp" id="progSub" style="width:auto;max-width:240px" onchange="S.progSub=this.value;paintPrograms()" aria-label="Filter sub-bagian"><option value="">Semua sub-bagian</option></select>
      <select class="inp" id="progK" style="width:auto" onchange="S.progKey=this.value;paintPrograms()" aria-label="Filter periode">${[['ini', 'Minggu ini'], ['lalu', 'Minggu lalu'], ['bulan', 'Bulan ini'], ['semua', 'Semua'], ['rentang', 'Pilih tanggal\u2026']].map(o => `<option value="${o[0]}"${S.progKey === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>
      <span id="progRg" class="row-f gap1 wrap"${S.progKey === 'rentang' ? '' : ' hidden'}><input type="date" class="inp" style="width:auto" id="progFrom" value="${E(S.progFrom || '')}" onchange="S.progFrom=this.value;paintPrograms()" aria-label="Dari tanggal"><span class="muted">s.d.</span><input type="date" class="inp" style="width:auto" id="progTo" value="${E(S.progTo || '')}" onchange="S.progTo=this.value;paintPrograms()" aria-label="Sampai tanggal"></span>
      <span class="grow"></span><button type="button" class="btn-x btn-o btn-sm" onclick="kbAll(true)"><i class="bi bi-arrows-expand"></i><span class="hide-xs"> Buka semua</span></button><button type="button" class="btn-x btn-o btn-sm" onclick="kbAll(false)"><i class="bi bi-arrows-collapse"></i><span class="hide-xs"> Tutup semua</span></button>
    </div><p class="help" style="margin:-.4rem 0 1rem">Periode: Program Kerja &amp; Proses tampil selama belum selesai; Hasil Usaha tampil bila selesai pada periode yang dipilih.</p><div id="progList"></div></section>`,
    init: () => { paintPrograms(); kbBind($('#progList')); }
  };
};
function progBagSet(b) { S.progBag = b; $$('[data-pbag]').forEach(x => x.classList.toggle('on', x.dataset.pbag === b)); paintPrograms(); }
function progSubOptions() {
  const sel = $('#progSub'); if (!sel || !S.prog) return;
  const by = { 'Tambal Sulam': {}, 'Proyek': {} };
  S.prog.rows.forEach(p => { if (by[p.Bagian]) { const k = p.SubBagian || ''; by[p.Bagian][k] = (by[p.Bagian][k] || 0) + 1; } });
  const cur = S.progSub || '';
  const html = '<option value="">Semua sub-bagian</option>' + Object.keys(by).map(b => { const ks = Object.keys(by[b]).sort(b === 'Tambal Sulam' ? subCmp : (x, y) => x.localeCompare(y)); return ks.length ? `<optgroup label="${E(b)}">${ks.map(k => `<option value="${E(b + '|' + k)}"${cur === b + '|' + k ? ' selected' : ''}>${E(k || '(Tanpa sub-bagian)')} (${by[b][k]})</option>`).join('')}</optgroup>` : ''; }).join('');
  if (sel.dataset.h !== html) { sel.innerHTML = html; sel.dataset.h = html; }
  if (cur && !sel.querySelector(`option[value="${cur.replace(/"/g, '')}"]`)) { S.progSub = ''; sel.value = ''; }
}
function subCmp(a, b) {
  const u = (S.prog && S.prog.urut) || [], i = u.indexOf(a), j = u.indexOf(b);
  return (i < 0 ? 999 : i) - (j < 0 ? 999 : j) || String(a).localeCompare(String(b));
}
const upPending = (pid, slot) => UPQ.jobs.some(j => j.pid === pid && j.slot === slot && !j.err);
function kbCard(p) {
  const n = FT.filter(f => p['Foto' + f[0]] || upPending(p.ID, f[0])).length, up = FT.some(f => upPending(p.ID, f[0])), tmp = String(p.ID).indexOf('tmp_') === 0;
  const fc = n === 0 ? 'f0' : n === 3 ? 'f3' : 'f1', ic = up ? 'bi-arrow-repeat' : n === 0 ? 'bi-camera' : n === 3 ? 'bi-patch-check-fill' : 'bi-images';
  const info = [p.PenanggungJawab, p.Durasi].filter(Boolean).join(' \u00B7 ');
  const tg = p.Status === 'Selesai' && p.TglRealisasi ? 'Selesai ' + fdShort(p.TglRealisasi) : fdShort(p.Tanggal);
  const tip = n === 0 ? 'Belum ada foto' : n === 3 ? 'Foto lengkap: Before, During, After' : 'Foto sebagian: ' + n + ' dari 3';
  return `<article class="kb-card${tmp ? ' saving' : ''}" data-id="${E(p.ID)}" tabindex="0" aria-label="${E(p.Uraian || p.SubBagian)}"><div class="kb-t">${E(p.Uraian || p.SubBagian || '-')}</div>${info ? `<div class="kb-m">${E(info)}</div>` : ''}<div class="kb-f"><span class="kb-date">${E(tg)}</span>${tmp ? '' : `<button type="button" class="kb-ic ${fc}${up ? ' up' : ''}" data-kfoto title="${E(tip)}" aria-label="${E(tip)}"><i class="bi ${ic}"></i><b>${n}/3</b></button>${isStaff() ? `<button type="button" class="kb-ic" data-kedit title="Ubah program" aria-label="Ubah program"><i class="bi bi-pencil"></i></button><button type="button" class="kb-ic del" data-kdel title="Hapus program" aria-label="Hapus program"><i class="bi bi-trash"></i></button>` : ''}`}</div></article>`;
}
function kbColHtml(c, list) {
  const sorted = list.slice().sort((a, b) => c[0] === 'Selesai' ? String(b.TglRealisasi || b.Tanggal).localeCompare(String(a.TglRealisasi || a.Tanggal)) : String(b.Tanggal).localeCompare(String(a.Tanggal)));
  return `<div class="kb-col" data-col="${c[0]}"><div class="kb-ch"><span class="d"></span>${c[1]}<span class="n">${list.length}</span></div><div class="kb-list">${sorted.length ? sorted.map(kbCard).join('') : `<div class="kb-empty">${isStaff() ? 'Seret kartu ke sini' : 'Kosong'}</div>`}</div>${isStaff() ? `<button type="button" class="kb-add" data-kadd><i class="bi bi-plus-lg"></i> Tambah ${E(c[1].toLowerCase())}</button>` : ''}</div>`;
}
function kbGrpHtml(b, k, list, autoOpen) {
  const id = b + '|' + k, open = autoOpen || (S.progOpen || {})[id];
  const cnt = {}; KOL.forEach(c => { cnt[c[0]] = list.filter(p => (p.Status || 'Direncanakan') === c[0]).length; });
  const foto = list.reduce((a, p) => a + FT.filter(f => p['Foto' + f[0]]).length, 0);
  const tab = (S.kbTab || {})[id] || (cnt.Berjalan ? 'Berjalan' : cnt.Direncanakan ? 'Direncanakan' : 'Selesai');
  return `<div class="kb-grp${open ? '' : ' col'}" data-g="${E(id)}"><button type="button" class="kb-gh" data-gtog aria-expanded="${open ? 'true' : 'false'}"><i class="bi bi-chevron-down"></i><b>${E(k || '(Tanpa sub-bagian)')}</b><span class="kb-cnt"><span>${cnt.Direncanakan} program</span><span class="c1">${cnt.Berjalan} proses</span><span class="c2">${cnt.Selesai} hasil</span><span class="cf" title="Foto terisi dari ${list.length * 3}"><i class="bi bi-camera"></i> ${foto}/${list.length * 3}</span></span></button>
    <div class="kb-tabs" role="tablist" aria-label="Kolom">${KOL.map(c => `<button type="button" role="tab" aria-selected="${tab === c[0]}" class="${tab === c[0] ? 'on' : ''}" data-col="${c[0]}" data-ktab="${c[0]}"><b>${cnt[c[0]]}</b>${c[1]}</button>`).join('')}</div>
    <div class="kb-board" data-tab="${tab}">${KOL.map(c => kbColHtml(c, list.filter(p => (p.Status || 'Direncanakan') === c[0]))).join('')}</div></div>`;
}
function paintPrograms() {
  if (!S.prog || !Array.isArray(S.prog.rows)) { const el0 = $('#progList'); if (el0) el0.innerHTML = skeleton(); if (AppState.page === 'program') setTimeout(() => navigateTo('program', { force: true }), 50); return; }
  const el = $('#progList'); if (!el) return;
  const q = (($('#progQ') || {}).value || '').trim().toLowerCase(), key = S.progKey || 'ini';
  const rgBox = $('#progRg'); if (rgBox) rgBox.hidden = key !== 'rentang';
  progSubOptions();
  const sub = S.progSub || '', focus = S.progFocus || '';
  const html = ['Tambal Sulam', 'Proyek'].filter(b => (S.progBag || 'Semua') === 'Semua' || S.progBag === b).filter(b => !sub || sub.split('|')[0] === b).map(b => {
    const rg = progRange(key, b, S.prog.minggu);
    const rows = S.prog.rows.filter(p => p.Bagian === b && progInRange(p, rg) && (!q || rowText(p).indexOf(q) >= 0) && (!sub || (p.Bagian + '|' + (p.SubBagian || '')) === sub));
    const groups = {}; rows.forEach(p => { const k = p.SubBagian || ''; (groups[k] = groups[k] || []).push(p); });
    const keys = Object.keys(groups).sort(b === 'Tambal Sulam' ? subCmp : (x, y) => x.localeCompare(y));
    const auto = !!q || !!sub;
    return `<div class="kb-bag"><div class="kb-bag-h ${b === 'Proyek' ? 'pr' : ''}"><div><b>${E(b.toUpperCase())}</b><small>${E(rg.label)}</small></div><div class="row-f gap1 wrap"><span class="pill">${rows.length} program</span>${isStaff() ? `<button type="button" class="btn-x btn-sm" onclick="programForm(null,{Bagian:'${b}'})"><i class="bi bi-plus-lg"></i> Tambah</button>` : ''}</div></div>${keys.length ? keys.map(k => kbGrpHtml(b, k, groups[k], auto || groups[k].some(p => p.ID === focus))).join('') : emptyBox('Belum ada program ' + b + ' pada filter ini', isStaff() ? 'Klik "Tambah program" untuk membuat yang pertama.' : '')}</div>`;
  }).join('');
  el.innerHTML = html || emptyBox('Tidak ada program pada filter ini');
  if (focus) { S.progFocus = ''; const c = el.querySelector(`.kb-card[data-id="${CSS.escape(focus)}"]`); if (c) { const g = c.closest('.kb-grp'), bd = c.closest('.kb-board'), col = c.closest('.kb-col'); if (bd && col) { bd.dataset.tab = col.dataset.col; } c.classList.add('flash'); setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); } }
}
function kbAll(open) {
  S.progOpen = S.progOpen || {};
  $$('#progList .kb-grp').forEach(g => { g.classList.toggle('col', !open); S.progOpen[g.dataset.g] = open; const h = g.querySelector('[data-gtog]'); if (h) h.setAttribute('aria-expanded', open ? 'true' : 'false'); });
}
const KB = { drag: null, swallow: 0 };
function kbBind(root) {
  if (!root) return;
  root.addEventListener('click', e => {
    if (Date.now() < KB.swallow) { e.preventDefault(); return; }
    const t = e.target;
    const gt = t.closest('[data-gtog]');
    if (gt) { const g = gt.closest('.kb-grp'); g.classList.toggle('col'); const op = !g.classList.contains('col'); (S.progOpen = S.progOpen || {})[g.dataset.g] = op; gt.setAttribute('aria-expanded', op ? 'true' : 'false'); return; }
    const tb = t.closest('[data-ktab]');
    if (tb) { const g = tb.closest('.kb-grp'); (S.kbTab = S.kbTab || {})[g.dataset.g] = tb.dataset.ktab; g.querySelector('.kb-board').dataset.tab = tb.dataset.ktab; $$('[data-ktab]', g).forEach(x => { const on = x === tb; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); return; }
    if (t.closest('[data-kadd]')) return kbNew(t.closest('.kb-col'));
    if (t.closest('[data-kncancel]')) return kbNewClose(t.closest('.kb-col'));
    if (t.closest('[data-knsave]')) return kbNewSave(t.closest('.kb-col'));
    if (t.closest('[data-knfull]')) return kbNewFull(t.closest('.kb-col'));
    const card = t.closest('.kb-card'), id = card && card.dataset.id;
    if (!id || id.indexOf('tmp_') === 0) return;
    if (t.closest('[data-kfoto]')) return viewerProg(id);
    if (t.closest('[data-kedit]')) return programEdit(id);
    if (t.closest('[data-kdel]')) return programDel(id);
  });
  root.addEventListener('dblclick', e => { const c = e.target.closest('.kb-card'); if (c && !e.target.closest('button') && c.dataset.id.indexOf('tmp_') < 0) viewerProg(c.dataset.id); });
  root.addEventListener('keydown', e => {
    const ta = e.target.closest('.kb-new textarea');
    if (ta) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kbNewSave(ta.closest('.kb-col')); } else if (e.key === 'Escape') kbNewClose(ta.closest('.kb-col')); return; }
    const c = e.target.closest('.kb-card'); if (!c || e.target !== c) return;
    if (e.key === 'Enter') { e.preventDefault(); viewerProg(c.dataset.id); return; }
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && isStaff()) {
      e.preventDefault();
      const cur = c.closest('.kb-col').dataset.col, i = KOL.findIndex(k => k[0] === cur) + (e.key === 'ArrowRight' ? 1 : -1);
      if (KOL[i]) kbMoveTo(c.dataset.id, KOL[i][0], true);
    }
  });
  root.addEventListener('touchmove', e => { if (KB.drag) e.preventDefault(); }, { passive: false });
  root.addEventListener('contextmenu', e => { if (e.target.closest('.kb-card') && e.pointerType !== 'mouse') e.preventDefault(); });
  root.addEventListener('pointerdown', kbDown);
}
function kbTrash(show) {
  let el = $('#kbTrash');
  if (!el) { el = document.createElement('div'); el.id = 'kbTrash'; el.className = 'kb-trash'; el.innerHTML = '<i class="bi bi-trash3"></i> Lepas di sini untuk menghapus'; document.body.appendChild(el); }
  el.classList.toggle('show', !!show); el.classList.remove('over');
}
function kbDown(e) {
  if (!isStaff() || e.button !== 0) return;
  const card = e.target.closest('.kb-card');
  if (!card || e.target.closest('button,textarea,input,a') || card.dataset.id.indexOf('tmp_') === 0) return;
  const touch = e.pointerType !== 'mouse', sx = e.clientX, sy = e.clientY;
  let timer = 0, started = false;
  const begin = ev => {
    started = true;
    const r = card.getBoundingClientRect(), g = card.cloneNode(true);
    g.classList.add('kb-drag'); g.classList.remove('hold', 'flash'); g.style.width = r.width + 'px'; g.style.left = '0'; g.style.top = '0';
    document.body.appendChild(g);
    KB.drag = { card: card, ghost: g, id: card.dataset.id, grp: card.closest('.kb-grp').dataset.g, from: card.closest('.kb-col').dataset.col, ox: sx - r.left, oy: sy - r.top, over: null, trash: false };
    card.classList.remove('hold'); card.classList.add('ghosted'); document.body.classList.add('kb-dragging'); kbTrash(true);
    if (navigator.vibrate) try { navigator.vibrate(10); } catch (x) { }
    kbMove(ev);
  };
  const move = ev => {
    if (!started) { const dd = Math.hypot(ev.clientX - sx, ev.clientY - sy); if (touch) { if (dd > 8) stop(); return; } if (dd > 5) begin(ev); return; }
    ev.preventDefault(); kbMove(ev);
  };
  const stop = () => { clearTimeout(timer); card.classList.remove('hold'); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  const up = ev => { stop(); if (started) kbDrop(ev); };
  if (touch) { card.classList.add('hold'); timer = setTimeout(() => begin({ clientX: sx, clientY: sy }), 300); }
  addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
function kbMove(ev) {
  const D = KB.drag; if (!D) return;
  D.ghost.style.transform = `translate(${Math.round(ev.clientX - D.ox)}px,${Math.round(ev.clientY - D.oy)}px) rotate(2.5deg) scale(1.03)`;
  const el = document.elementFromPoint(ev.clientX, ev.clientY), tr = el && el.closest('#kbTrash');
  let col = !tr && el ? el.closest('[data-col]') : null;
  if (col && (!col.closest('.kb-grp') || col.closest('.kb-grp').dataset.g !== D.grp)) col = null;
  if (D.over !== col) { if (D.over) D.over.classList.remove('over'); if (col) col.classList.add('over'); D.over = col; }
  D.trash = !!tr; const t = $('#kbTrash'); if (t) t.classList.toggle('over', D.trash);
  clearTimeout(D.tabT);
  if (col && col.hasAttribute('data-ktab') && !col.classList.contains('on')) D.tabT = setTimeout(() => { if (KB.drag && KB.drag.over === col) col.click(); }, 550);
  if (ev.clientY < 90) scrollBy(0, -12); else if (ev.clientY > innerHeight - 90) scrollBy(0, 12);
}
function kbDrop() {
  const D = KB.drag; if (!D) return;
  KB.drag = null; KB.swallow = Date.now() + 350; clearTimeout(D.tabT);
  D.ghost.remove(); D.card.classList.remove('ghosted'); document.body.classList.remove('kb-dragging'); kbTrash(false);
  if (D.over) D.over.classList.remove('over');
  if (D.trash) return programDel(D.id);
  const to = D.over && D.over.dataset.col;
  if (to && to !== D.from) kbMoveTo(D.id, to, false);
}
function kbMoveTo(id, to, keepFocus) {
  const p = S.prog && S.prog.rows.find(x => x.ID === id); if (!p || p.Status === to) return;
  const prev = { Status: p.Status, TglRealisasi: p.TglRealisasi };
  p.Status = to; p.TglRealisasi = to === 'Selesai' ? todayStr() : '';
  const g = (p.Bagian + '|' + (p.SubBagian || ''));
  (S.kbTab = S.kbTab || {})[g] = to;
  const patch = d => { const r = d.rows.find(x => x.ID === id); if (r) { r.Status = p.Status; r.TglRealisasi = p.TglRealisasi; } };
  dcPatch('program.list', {}, patch);
  paintPrograms();
  const card = () => $(`#progList .kb-card[data-id="${CSS.escape(id)}"]`);
  const c = card(); if (c) { c.classList.add('saving', 'flash'); if (keepFocus) c.focus(); }
  toast('Dipindah ke ' + KOL_LBL[to] + (to === 'Selesai' ? ' \u00B7 tanggal selesai: hari ini' : '') + '.', 'ok');
  apiM('program.status', { id: id, status: to }, true).then(r => { programUpdated(r.data); const c2 = card(); if (c2 && keepFocus) c2.focus(); }).catch(e => {
    Object.assign(p, prev); dcPatch('program.list', {}, patch); paintPrograms();
    toast('Gagal memindah program: ' + e.message, 'err');
  });
}
function kbNew(col) {
  if (!col || col.querySelector('.kb-new')) return;
  const add = col.querySelector('[data-kadd]'); if (add) add.hidden = true;
  col.insertAdjacentHTML('beforeend', `<div class="kb-new"><textarea placeholder="Tulis nama program\u2026 (Enter untuk simpan)" aria-label="Nama program baru" maxlength="200"></textarea><div class="row-f"><button type="button" class="btn-x btn-o btn-sm" data-kncancel>Batal</button><button type="button" class="btn-x btn-o btn-sm" data-knfull title="Isi form lengkap">Form lengkap</button><button type="button" class="btn-x btn-p btn-sm" data-knsave><i class="bi bi-plus-lg"></i> Tambah</button></div></div>`);
  const ta = col.querySelector('.kb-new textarea'); ta.focus();
  AppState.uiDirty = true;
}
function kbNewClose(col) { const n = col && col.querySelector('.kb-new'); if (n) n.remove(); const a = col && col.querySelector('[data-kadd]'); if (a) a.hidden = false; }
function kbNewCtx(col) {
  const g = col.closest('.kb-grp').dataset.g, i = g.indexOf('|'), b = g.slice(0, i), k = g.slice(i + 1), st = col.dataset.col;
  const sb = ((S.prog && S.prog.sub) || []).find(x => x.Bagian === b && x.Nama === k && x.Status === 'Aktif');
  return { Bagian: b, SubBagianID: sb ? sb.ID : '', SubBagian: sb ? '' : k, Status: st, Tanggal: todayStr() };
}
function kbNewFull(col) { const ctx = kbNewCtx(col), ta = col.querySelector('.kb-new textarea'); ctx.Uraian = ta ? ta.value.trim() : ''; kbNewClose(col); programForm(null, ctx); }
function kbNewSave(col) {
  const ta = col.querySelector('.kb-new textarea'), text = ta ? ta.value.trim() : '';
  if (!text) { if (ta) ta.focus(); return; }
  const ctx = kbNewCtx(col);
  if (!ctx.SubBagianID && !ctx.SubBagian) return kbNewFull(col);
  ctx.Uraian = text;
  const tmp = Object.assign({ ID: 'tmp_' + Date.now(), SubBagian: ctx.SubBagian || col.closest('.kb-grp').dataset.g.split('|').slice(1).join('|'), PenanggungJawab: '', Durasi: '', FotoBefore: '', FotoDuring: '', FotoAfter: '', TglRealisasi: ctx.Status === 'Selesai' ? todayStr() : '' }, ctx);
  tmp.SubBagian = tmp.SubBagian || ctx.SubBagian;
  S.prog.rows.unshift(tmp); paintPrograms();
  apiM('program.save', ctx, true).then(r => {
    const i = S.prog.rows.indexOf(tmp); if (i >= 0) S.prog.rows.splice(i, 1);
    programUpdated(r.data); toast('Program "' + text + '" ditambahkan.', 'ok');
  }).catch(e => {
    const i = S.prog.rows.indexOf(tmp); if (i >= 0) S.prog.rows.splice(i, 1); paintPrograms();
    toast('Program belum tersimpan: ' + e.message, 'err');
  });
}
function findProg(id) {
  return (S.prog && S.prog.rows.find(x => x.ID === id)) || ((dcPeek('program.list', {}) || { rows: [] }).rows.find(x => x.ID === id)) || null;
}
function programUpdated(rec) {
  if (!rec || !rec.ID) return;
  if (S.prog) { const i = S.prog.rows.findIndex(x => x.ID === rec.ID); if (i >= 0) S.prog.rows[i] = rec; else S.prog.rows.unshift(rec); }
  dcPatch('program.list', {}, d => { const i = d.rows.findIndex(x => x.ID === rec.ID); if (i >= 0) d.rows[i] = rec; else d.rows.unshift(rec); });
  if (AppState.page === 'program' && $('#progList')) paintPrograms();
  vwRefreshProg(rec.ID, rec);
}

/* \u2500\u2500 antrean unggah foto di latar: pengguna tidak perlu menunggu \u2500\u2500 */
const UPQ = { jobs: [], run: false };
AppState.full = {};
function fullPut(u, d) { if (!u || !d) return; AppState.full[u] = d; const ks = Object.keys(AppState.full); if (ks.length > 8) delete AppState.full[ks[0]]; }
function upEnqueue(pid, slot, c, label) {
  UPQ.jobs = UPQ.jobs.filter(j => !(j.pid === pid && j.slot === slot));
  UPQ.jobs.push({ pid: pid, slot: slot, c: c, label: label || '', err: '' });
  upPaint(); upTouched(pid); upRun();
}
function upTouched(pid) { if (AppState.page === 'program' && $('#progList')) paintPrograms(); vwRefreshProg(pid); }
async function upRun() {
  if (UPQ.run) return; UPQ.run = true;
  try {
    for (;;) {
      const j = UPQ.jobs.find(x => !x.err); if (!j) break;
      try {
        const r = await apiM('program.foto', { id: j.pid, slot: j.slot, data: j.c.data, mime: j.c.mime, thumb: j.c.thumb }, true);
        const rec = r.data, url = rec['Foto' + j.slot], m = fotoMetaOf(rec)[j.slot], th = m && m.th;
        const seed = {}; if (url) seed[url] = j.c.thumbUrl; if (th) seed[th] = j.c.thumbUrl;
        Object.keys(seed).forEach(u => { AppState.img[u] = seed[u]; }); thPutMany(seed); fullPut(url, j.c.preview);
        const k = UPQ.jobs.indexOf(j); if (k >= 0) UPQ.jobs.splice(k, 1);
        programUpdated(rec);
        toast('Foto ' + j.slot + ' tersimpan' + (j.label ? ' \u00B7 ' + j.label : '') + ' (' + j.c.kb + ' KB)', 'ok');
      } catch (e) { j.err = e.message || 'Gagal'; toast('Foto ' + j.slot + ' belum terunggah: ' + j.err, 'err'); upTouched(j.pid); }
      upPaint();
    }
  } finally { UPQ.run = false; upPaint(); }
}
function upRetry() { UPQ.jobs.forEach(j => { j.err = ''; }); upPaint(); upRun(); }
function upDrop() { const ids = UPQ.jobs.filter(j => j.err).map(j => j.pid); UPQ.jobs = UPQ.jobs.filter(j => !j.err); upPaint(); ids.forEach(upTouched); }
function upPaint() {
  let el = $('#upq'); const n = UPQ.jobs.length, bad = UPQ.jobs.filter(j => j.err).length;
  if (!n) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'upq'; el.className = 'upq'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.classList.toggle('err', bad === n);
  el.innerHTML = bad === n ? `<i class="bi bi-exclamation-triangle-fill"></i><span>${bad} foto gagal diunggah</span><button type="button" onclick="upRetry()">Ulangi</button><button type="button" onclick="upDrop()">Buang</button>`
    : `<span class="spin-sm"></span><span>Mengunggah ${n - bad} foto di latar\u2026 boleh lanjut bekerja</span>${bad ? `<button type="button" onclick="upRetry()">Ulangi ${bad} gagal</button>` : ''}`;
}
window.addEventListener('beforeunload', e => { if (UPQ.jobs.length) { e.preventDefault(); e.returnValue = ''; } });
async function uploadSlot(pid, slot, camera) {
  const f = await pickImage(camera); if (!f) return;
  try {
    const c = await compressImage(f), p = findProg(pid);
    upEnqueue(pid, slot, c, p ? (p.Uraian || p.SubBagian) : '');
  } catch (e) { toast(e.message, 'err'); }
}

/* \u2500\u2500 penampil foto (gaya thumbnail viewer) \u2500\u2500 */
const VW = { imgs: [], i: 0, opt: {} };
async function imgThumb(u) {
  if (!u) return null;
  if (AppState.img[u]) return AppState.img[u];
  const m = await thGetMany([u]); if (m[u]) { AppState.img[u] = m[u]; return m[u]; }
  const d = (await apiM('file.get', { url: u, thumb: 1 }, true)).data.dataUrl;
  if (d) { AppState.img[u] = d; if (d.length < 400000) thPutMany({ [u]: d }); }
  return d;
}
async function imgFull(u) {
  if (AppState.full[u]) return AppState.full[u];
  const d = (await apiM('file.get', { url: u }, true)).data.dataUrl;
  fullPut(u, d); return d;
}
function viewerOpen(imgs, i, opt) {
  VW.imgs = imgs; VW.i = Math.max(0, Math.min(i || 0, imgs.length - 1)); VW.opt = opt || {}; VW.back = document.activeElement;
  let el = $('#vw');
  if (!el) {
    el = document.createElement('div'); el.id = 'vw'; el.className = 'vw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'vwT');
    el.addEventListener('click', vwClick); el.addEventListener('keydown', vwKey);
    el.addEventListener('pointerdown', e => { const st = e.target.closest('.vw-stage'); VW.sw = st ? { x: e.clientX, y: e.clientY } : null; });
    el.addEventListener('pointerup', e => { if (!VW.sw) return; const dx = e.clientX - VW.sw.x, dy = e.clientY - VW.sw.y; VW.sw = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) vwGo(VW.i + (dx < 0 ? 1 : -1)); });
    document.body.appendChild(el);
  }
  document.body.classList.add('vw-open');
  vwRender();
  const x = el.querySelector('[data-vx]'); if (x) x.focus();
}
function viewerClose() { const el = $('#vw'); if (el) el.remove(); document.body.classList.remove('vw-open'); const b = VW.back; VW.imgs = []; if (b && b.focus && document.body.contains(b)) b.focus(); }
function vwGo(i) { const n = VW.imgs.length; if (!n) return; VW.i = (i + n) % n; vwRender(); }
function vwKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); viewerClose(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); vwGo(VW.i + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); vwGo(VW.i - 1); }
  else if (e.key === 'Tab') { const f = $$('#vw button,#vw a').filter(x => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
}
function vwClick(e) {
  if (e.target.id === 'vw' || e.target.closest('[data-vx]')) return viewerClose();
  if (e.target.closest('[data-vp]')) return vwGo(VW.i - 1);
  if (e.target.closest('[data-vn]')) return vwGo(VW.i + 1);
  const th = e.target.closest('[data-vi]'); if (th) return vwGo(Number(th.dataset.vi));
  const it = VW.imgs[VW.i]; if (!it) return;
  const up = e.target.closest('[data-vup]'); if (up) return uploadSlot(it.pid, it.slot, up.dataset.vup === 'cam');
  if (e.target.closest('[data-vdel]')) return deleteSlot(it.pid, it.slot);
  if (e.target.closest('[data-vdl]')) return vwDownload(it);
  if (e.target.closest('[data-vprog]')) { S.progFocus = it.pid; viewerClose(); navigateTo('program'); }
}
async function vwDownload(it) {
  try { const d = await imgFull(it.url); const a = document.createElement('a'); a.href = d; a.download = String(it.title + ' ' + it.slot).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { toast('Foto belum bisa diunduh: ' + e.message, 'err'); }
}
function vwRender() {
  const el = $('#vw'); if (!el) return;
  const n = VW.imgs.length, it = VW.imgs[VW.i], o = VW.opt, p2 = x => ('0' + x).slice(-2);
  if (!it) return viewerClose();
  const can = !!o.canEdit && isStaff(), pend = it.pending;
  const stage = it.url || pend
    ? `<img id="vwImg" alt="${E(it.title + ' \u2014 ' + (it.slot || ''))}" draggable="false" ${pend ? `src="${pend}"` : AppState.full[it.url] ? `src="${AppState.full[it.url]}"` : AppState.img[it.th || it.url] ? `src="${AppState.img[it.th || it.url]}"` : ''}><span class="vg"></span>${pend ? '<span class="vw-spin pill pill-info"><span class="spin-sm"></span> Mengunggah\u2026</span>' : ''}`
    : `<div class="vw-none"><i class="bi bi-camera"></i><b>Foto ${E(it.slot)} belum ada</b>${can ? `<div class="row-f gap1 wrap" style="justify-content:center"><button type="button" class="btn-x btn-p btn-sm" data-vup="cam"><i class="bi bi-camera-fill"></i> Kamera</button><button type="button" class="btn-x btn-o btn-sm" data-vup="file"><i class="bi bi-image"></i> Pilih dari galeri</button></div>` : ''}</div>`;
  const acts = [];
  if (it.url && !pend) acts.push(`<button type="button" class="btn-x btn-o btn-sm" data-vdl><i class="bi bi-download"></i> Unduh</button>`);
  if (can && it.url && !pend) acts.push(`<button type="button" class="btn-x btn-o btn-sm" data-vup="cam"><i class="bi bi-camera"></i> Ganti</button><button type="button" class="btn-x btn-o btn-sm" data-vup="file" aria-label="Ganti dari galeri"><i class="bi bi-image"></i></button><button type="button" class="btn-x btn-d btn-sm" data-vdel><i class="bi bi-trash"></i> Hapus</button>`);
  if (o.dock && it.pid && isStaff()) acts.push(`<button type="button" class="btn-x btn-o btn-sm" data-vprog><i class="bi bi-kanban"></i> Lihat programnya</button>`);
  el.innerHTML = `<div class="vw-card"><div class="vw-h"><div style="min-width:0"><small>${E(o.kicker || 'Dokumentasi foto')}</small><h2 id="vwT">${E(o.title || it.title)}</h2><p>${E(o.sub || it.sub || '')}</p></div><div class="row-f gap1"><span class="vw-ct">${p2(VW.i + 1)}<span> / ${p2(n)}</span></span><button type="button" class="vw-x" data-vx aria-label="Tutup penampil foto"><i class="bi bi-x-lg"></i></button></div></div>
    <div class="vw-stage" role="tabpanel">${stage}<div class="vw-loc">${it.slot ? `<span class="pill">${E(it.slot)}</span>` : ''}<span>${E(o.title ? (it.loc || '') : (it.sub || ''))}</span></div><div class="vw-nav"><button type="button" data-vp aria-label="Foto sebelumnya"${n < 2 ? ' disabled' : ''}><i class="bi bi-chevron-left"></i></button><button type="button" data-vn aria-label="Foto berikutnya"${n < 2 ? ' disabled' : ''}><i class="bi bi-chevron-right"></i></button></div></div>
    <div class="vw-cap" aria-live="polite"><h3>${E(it.slot ? it.slot + ' \u00B7 ' + it.title : it.title)}</h3><div class="acts">${acts.join('')}</div></div>
    <div class="vw-th" role="tablist" aria-label="Pilih foto">${VW.imgs.map((x, k) => { const src = x.pending || AppState.img[x.th || x.url] || ''; return `<button type="button" role="tab" aria-selected="${k === VW.i}" class="${k === VW.i ? 'on' : ''}" data-vi="${k}" aria-label="${E((x.slot || '') + ' ' + x.title)}"${src ? '' : ` data-vneed="${k}"`}>${src ? `<img alt="" src="${src}">` : x.url ? '<span class="e"><span class="spin-sm"></span></span>' : '<span class="e"><i class="bi bi-plus-lg"></i></span>'}<span>${p2(k + 1)}${x.slot ? ' ' + x.slot[0] : ''}</span></button>`; }).join('')}</div>
    <div class="vw-f"><span>${E(o.foot || 'Geser foto atau pakai tombol panah untuk berpindah')}</span><span>${E(it.meta || '')}</span></div></div>`;
  vwLoad();
}
async function vwLoad() {
  const it = VW.imgs[VW.i], idx = VW.i;
  $$('#vw [data-vneed]').forEach(async b => { const x = VW.imgs[Number(b.dataset.vneed)]; if (!x || !x.url) return; try { const d = await imgThumb(x.th || x.url); if (d && document.body.contains(b)) b.innerHTML = `<img alt="" src="${d}"><span>${('0' + (Number(b.dataset.vneed) + 1)).slice(-2)}${x.slot ? ' ' + x.slot[0] : ''}</span>`; } catch (e) { } });
  if (!it || !it.url || it.pending) return;
  const img = $('#vwImg'); if (!img) return;
  try {
    if (!img.getAttribute('src')) { const t = await imgThumb(it.th || it.url); if (VW.i === idx && img.isConnected && t && !img.getAttribute('src')) img.src = t; }
    if (!AppState.full[it.url]) { const f = await imgFull(it.url); if (VW.i === idx && img.isConnected && f) img.src = f; }
  } catch (e) { if (VW.i === idx && img.isConnected && !img.getAttribute('src')) img.replaceWith(Object.assign(document.createElement('div'), { className: 'vw-none', innerHTML: `<i class="bi bi-wifi-off"></i><b>Foto belum bisa dimuat</b>${E(e.message)}` })); }
}
function progImgs(p) {
  const m = fotoMetaOf(p);
  return FT.map(f => {
    const s = f[0], job = UPQ.jobs.find(j => j.pid === p.ID && j.slot === s && !j.err), mm = m[s] || {};
    return { slot: s, url: p['Foto' + s] || '', th: mm.th || '', pending: job ? job.c.preview : '', title: p.Uraian || p.SubBagian, pid: p.ID, loc: p.SubBagian, meta: mm.t ? 'Diunggah ' + fdate(String(mm.t).slice(0, 10)) + ' ' + String(mm.t).slice(11, 16) + (mm.by ? ' oleh ' + mm.by : '') : '' };
  });
}
function viewerProg(pid, slot) {
  const p = findProg(pid); if (!p) return toast('Program tidak ditemukan. Muat ulang halaman.', 'err');
  const imgs = progImgs(p), n = imgs.filter(x => x.url || x.pending).length;
  let i = slot ? imgs.findIndex(x => x.slot === slot) : imgs.findIndex(x => x.url || x.pending); if (i < 0) i = 0;
  viewerOpen(imgs, i, { kicker: 'Before \u00B7 During \u00B7 After \u00B7 ' + n + ' dari 3 foto', title: p.Uraian || p.SubBagian, sub: p.Bagian + ' \u00B7 ' + p.SubBagian + ' \u00B7 ' + (KOL_LBL[p.Status] || p.Status), canEdit: true, pid: pid, foot: isStaff() ? 'Foto dikompres otomatis lalu diunggah di latar \u2014 tidak perlu menunggu.' : '' });
}
function vwRefreshProg(pid, rec) {
  if (!$('#vw') || !VW.opt || VW.opt.pid !== pid) return;
  const p = rec || findProg(pid); if (!p) return;
  const slot = (VW.imgs[VW.i] || {}).slot, imgs = progImgs(p), n = imgs.filter(x => x.url || x.pending).length;
  VW.imgs = imgs; VW.i = Math.max(0, imgs.findIndex(x => x.slot === slot));
  VW.opt.kicker = 'Before \u00B7 During \u00B7 After \u00B7 ' + n + ' dari 3 foto';
  vwRender();
}

function programKosong() { programForm(null, { Bagian: 'Tambal Sulam' }); }
const subOpts = list => list.filter(x => x.Status === 'Aktif').map(x => ({ v: x.ID, l: x.Bagian + ' \u00B7 ' + x.Nama }));
async function programForm(rec, preset) {
  const pl = dcPeek('program.list', {});
  let subAll = dcPeek('sub.list', {}) || (S.prog && S.prog.sub) || (pl && pl.sub) || null;
  if (!subAll) subAll = await api('sub.list');
  const sub = subAll.filter(x => x.Status === 'Aktif');
  dcFresh('sub.list', {}, d => {
    const el = $('#f_SubBagianID'); if (!el) return;
    const v = el.value, first = el.options[0] ? el.options[0].outerHTML : '';
    el.innerHTML = first + subOpts(d).map(o => `<option value="${E(o.v)}">${E(o.l)}</option>`).join('');
    el.value = v;
  });
  const fields = [
    { k: 'Tanggal', l: 'Tanggal mulai', t: 'date', req: true }, { k: 'Bagian', l: 'Bagian', t: 'select', opts: ['Tambal Sulam', 'Proyek'], req: true },
    { k: 'SubBagianID', l: 'Sub-bagian', t: 'select', blank: '\u2014 Lokasi bebas (isi kolom di bawah) \u2014', opts: sub.map(x => ({ v: x.ID, l: x.Bagian + ' \u00B7 ' + x.Nama })), full: true, help: 'Master sub-bagian dikelola lewat tombol "Kelola sub-bagian".' },
    { k: 'SubBagian', l: 'Lokasi (jika tidak memilih sub-bagian)', full: true, ph: 'Mis. Gedung Baru Lt. 2' },
    { k: 'Uraian', l: 'Nama program', req: true, full: true, ph: 'Mis. Perbaikan di garasi Rumah Ust Aris' }, { k: 'PenanggungJawab', l: 'Jumlah pekerja', full: true, ph: 'Mis. Pak Sriyanto CS ( 4 orang )' },
    { k: 'Durasi', l: 'Durasi pekerjaan', ph: 'Mis. 1 Hari' }, { k: 'MaterialKet', l: 'Material', ph: 'Mis. Barang Bekas' },
    { k: 'Status', l: 'Kolom', t: 'select', opts: KOL.map(c => ({ v: c[0], l: c[1] })) },
    { k: 'TglRealisasi', l: 'Tanggal selesai (untuk Hasil Usaha)', t: 'date', help: 'Kosongkan: otomatis hari ini saat masuk Hasil Usaha.' }
  ];
  if (!rec) { S.pf = Object.assign({}, (preset && preset.__foto) || {}); fields.push({ k: 'pfoto', t: 'html', html: pfHtml() }); }
  if (preset) delete preset.__foto;
  openForm({
    title: rec ? 'Ubah program kerja' : 'Tambah program kerja', size: 'lg', fields: fields,
    values: rec || Object.assign({ Tanggal: todayStr(), Bagian: 'Proyek', Status: 'Berjalan' }, preset || {}),
    save: async d => {
      if (rec) d.ID = rec.ID;
      if (d.Status !== 'Selesai') d.TglRealisasi = '';
      const r = await apiM('program.save', d);
      const fotos = rec ? [] : ['Before', 'During', 'After'].filter(k => (S.pf || {})[k]);
      fotos.forEach(k => upEnqueue(r.data.ID, k, S.pf[k], r.data.Uraian));
      S.pf = {}; const dest = S.camForm ? 'program' : AppState.page; S.camForm = false;
      programUpdated(r.data);
      toast(r.message + (fotos.length ? ' ' + fotos.length + ' foto sedang diunggah di latar.' : ''), 'ok'); closeModal(); navigateTo(dest);
    }
  });
  const stEl = $('#f_Status'), trEl = $('#f_TglRealisasi');
  if (stEl && trEl) { const sync = () => { trEl.closest('div').style.display = stEl.value === 'Selesai' ? '' : 'none'; }; stEl.addEventListener('change', sync); sync(); }
}
const PF_LBL = { Before: 'Sebelum (Before)', During: 'Proses (During)', After: 'Selesai (After)' };
function pfHtml() {
  return `<div class="full"><span class="lbl">Foto dokumentasi <span class="muted fw6">(opsional \u00B7 diunggah di latar setelah disimpan)</span></span><div class="pf-grid">${['Before', 'During', 'After'].map(k => `<div class="pf-slot" id="pf_${k}">${pfSlotHtml(k)}</div>`).join('')}</div></div>`;
}
function pfSlotHtml(k) {
  const c = (S.pf || {})[k];
  return `<div class="pf-prev">${c ? `<img alt="Foto ${E(PF_LBL[k])}" src="${c.preview}"><button type="button" class="fdel" onclick="pfClear('${k}')" aria-label="Hapus foto ${k}"><i class="bi bi-x-lg"></i></button>` : `<i class="bi bi-image"></i>`}<span class="tag">${k}</span></div>
    <div class="pf-btns"><button type="button" class="btn-x btn-o btn-sm" onclick="pfPick('${k}',true)"><i class="bi bi-camera"></i> Kamera</button><button type="button" class="btn-x btn-o btn-sm" onclick="pfPick('${k}',false)"><i class="bi bi-upload"></i> Unggah</button></div>`;
}
async function pfPick(k, camera) {
  const f = await pickImage(camera); if (!f) return;
  const el = $('#pf_' + k); if (el) { el.classList.add('up'); el.dataset.st = 'Mengompres\u2026'; }
  try { (S.pf = S.pf || {})[k] = await compressImage(f); } catch (e) { toast(e.message, 'err'); }
  if (el) { el.classList.remove('up'); el.innerHTML = pfSlotHtml(k); }
}
function pfClear(k) { delete (S.pf || {})[k]; const el = $('#pf_' + k); if (el) el.innerHTML = pfSlotHtml(k); }
function cameraStart() {
  pickImage(true).then(async f => {
    if (!f) return;
    toast('Menyiapkan foto\u2026');
    try { S.cam = { foto: await compressImage(f), slot: '' }; } catch (e) { return toast(e.message, 'err'); }
    camReview();
  });
}
function camReview() {
  openModal({
    title: 'Periksa foto',
    body: `<img class="preview-img" style="max-height:52vh" alt="Foto yang baru diambil" src="${S.cam.foto.preview}"><p class="tc muted mt1">Apakah foto sudah sesuai? \u00B7 sudah dikompres ${S.cam.foto.kb} KB</p>`,
    footer: `<button class="btn-x btn-o" onclick="cameraStart()"><i class="bi bi-arrow-counterclockwise"></i> Ulangi</button><button class="btn-x btn-p" onclick="camJenis()"><i class="bi bi-check2"></i> Sesuai, lanjut</button>`
  });
}
const camSort = rows => rows.slice().sort((a, b) => ((a.Status === 'Selesai') - (b.Status === 'Selesai')) || b.Tanggal.localeCompare(a.Tanggal));
const camOpts = rows => rows.map(p => `<label class="cam-opt" data-q="${E(((p.Uraian || '') + ' ' + p.SubBagian + ' ' + p.Bagian).toLowerCase())}"><input type="radio" name="camPid" value="${p.ID}"><span><b>${E(p.Uraian || p.SubBagian)}</b><small>${E(p.SubBagian + ' \u00B7 ' + p.Bagian + ' \u00B7 ' + (KOL_LBL[p.Status] || p.Status))} \u00B7 foto ${FT.filter(f => p['Foto' + f[0]]).length}/3</small></span></label>`).join('');
async function camJenis() {
  const pc = dcPeek('program.list', {});
  let rows = camSort((pc && pc.rows) || (S.prog && S.prog.rows) || []);
  dcFresh('program.list', {}, d => {
    const box = $('#camProg'); if (!box) return;
    const pick = ($('input[name="camPid"]:checked') || {}).value;
    box.innerHTML = camOpts(camSort(d.rows));
    if (pick) { const r = box.querySelector(`input[value="${pick}"]`); if (r) r.checked = true; }
    const ada = $('input[name="camTo"][value="ada"]'); if (ada) ada.disabled = !d.rows.length;
    if ($('#camQ') && $('#camQ').value) camFilter();
  });
  openModal({
    title: 'Jenis foto',
    body: `<div class="row-f gap2 mb2"><img alt="" src="${S.cam.foto.preview}" style="width:84px;height:63px;object-fit:cover;border-radius:.5rem;flex:none"><div class="muted">Pilih jenis foto, lalu tentukan programnya. Foto diunggah di latar, Anda bisa langsung lanjut.</div></div>
      <span class="lbl">Jenis foto <span style="color:#dc2626">*</span></span>
      <div class="cam-jenis" role="radiogroup">${['Before', 'During', 'After'].map(k => `<button type="button" class="cj" data-cj="${k}" role="radio" aria-checked="false" onclick="camSetJenis('${k}')"><b>${k}</b><span>${E(PF_LBL[k].split(' ')[0])}</span></button>`).join('')}</div>
      <span class="lbl mt2">Simpan ke</span>
      <label class="li" style="cursor:pointer"><input type="radio" name="camTo" value="ada" onchange="camTo()"${rows.length ? ' checked' : ' disabled'}> <b>Program yang sudah ada</b></label>
      <label class="li" style="cursor:pointer"><input type="radio" name="camTo" value="baru" onchange="camTo()"${rows.length ? '' : ' checked'}> <b>Program baru</b> <span class="muted">\u2014 isi form Tambah program</span></label>
      <div id="camProgBox"${rows.length ? '' : ' hidden'}><input class="inp mt1" id="camQ" type="search" placeholder="Ketik nama program atau sub-bagian\u2026" oninput="camFilter()" aria-label="Cari program"><div class="cam-list" id="camProg" role="radiogroup">${camOpts(rows)}</div><div class="muted tc" id="camNone" hidden style="padding:.5rem;font-size:12px">Tidak ada program yang cocok.</div></div>`,
    footer: `<button class="btn-x btn-o" onclick="camReview()">Kembali</button><button class="btn-x btn-p" onclick="camNext(this)"><i class="bi bi-cloud-arrow-up"></i> Simpan foto</button>`
  });
}
function camSetJenis(k) { S.cam.slot = k; $$('.cj').forEach(b => { const on = b.dataset.cj === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
function camTo() { const ada = ($('input[name="camTo"]:checked') || {}).value === 'ada'; $('#camProgBox').hidden = !ada; if (ada) setTimeout(() => { const q = $('#camQ'); if (q && matchMedia('(pointer:fine)').matches) q.focus(); }, 50); }
function camFilter() { const q = $('#camQ').value.trim().toLowerCase(); let n = 0; $$('.cam-opt').forEach(el => { const hit = !q || el.dataset.q.indexOf(q) >= 0; el.hidden = !hit; if (hit) n++; }); $('#camNone').hidden = n > 0; }
function camNext() {
  if (!S.cam.slot) return toast('Pilih jenis foto dulu: Before, During, atau After.', 'err');
  const ada = ($('input[name="camTo"]:checked') || {}).value === 'ada';
  if (!ada) { const fo = {}; fo[S.cam.slot] = S.cam.foto; S.camForm = true; return programForm(null, { __foto: fo }); }
  const pick = $('input[name="camPid"]:checked'); if (!pick) return toast('Pilih programnya dulu.', 'err');
  const p = findProg(pick.value);
  upEnqueue(pick.value, S.cam.slot, S.cam.foto, p ? (p.Uraian || p.SubBagian) : '');
  toast('Foto ' + S.cam.slot + ' sedang diunggah di latar. Silakan lanjut bekerja.', 'ok');
  closeModal(); S.cam = null;
}
const programEdit = id => { const p = findProg(id); if (p) programForm(p); };
async function programDel(id) {
  if (!(await confirmBox('Hapus program kerja ini beserta catatannya? Foto di Drive tidak ikut terhapus.', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('program.delete', { id: id }); toast(r.message, 'ok'); if (S.prog) S.prog.rows = S.prog.rows.filter(x => x.ID !== id); dcPatch('program.list', {}, d => { d.rows = d.rows.filter(x => x.ID !== id); }); navigateTo(AppState.page); });
}

/* \u2500\u2500 Export Docs mingguan \u2500\u2500 */
function lapWeeks() {
  const cur = cycStart(todayStr()), mg = (S.prog && S.prog.minggu) || null, out = [];
  const no = (b, st) => { if (!mg) return 0; const pat = b === 'Proyek' ? mg.pr.patokan : mg.ts.patokan; if (!pat) return 0; const n = Math.floor((parseD(st) - parseD(cycStart(pat))) / (7 * 864e5)) + 1; return n < 1 ? 1 : n; };
  for (let i = 0; i < 16; i++) { const st = addD(cur, -7 * i); out.push({ st: st, ts: no('Tambal Sulam', st), pr: no('Proyek', st), lbl: (i === 0 ? 'Minggu ini' : i === 1 ? 'Minggu lalu' : fdate(st)) }); }
  return out;
}
function lapOpen() {
  S.lap = S.lap || { bag: 'Semua', foto: 'minggu', start: cycStart(todayStr()) };
  const L = S.lap, wk = lapWeeks();
  openModal({
    title: 'Export Docs mingguan', size: 'lg',
    body: `<div class="form-grid"><div class="full"><label class="lbl" for="lapW">Minggu laporan (Kamis\u2013Rabu)</label><select class="inp" id="lapW" onchange="S.lap.start=this.value;lapPreview()">${wk.map(w => `<option value="${w.st}"${w.st === L.start ? ' selected' : ''}>${E(w.lbl)} \u00B7 TS ke-${w.ts || '\u2013'} \u00B7 Proyek ke-${w.pr || '\u2013'} \u00B7 ${fdate(w.st)} \u2013 ${fdate(addD(w.st, 6))}</option>`).join('')}</select></div>
      <div><span class="lbl">Bagian</span><div class="seg-b" role="group">${['Semua', 'Tambal Sulam', 'Proyek'].map(b => `<button type="button" class="${L.bag === b ? 'on' : ''}" data-lbag="${b}" onclick="S.lap.bag='${b}';$$('[data-lbag]').forEach(x=>x.classList.toggle('on',x.dataset.lbag==='${b}'));lapPreview()">${b === 'Semua' ? 'TS + Proyek' : E(b)}</button>`).join('')}</div></div>
      <div><span class="lbl">Foto yang dimasukkan</span><label class="row-f gap1" style="cursor:pointer;font-size:13.5px"><input type="radio" name="lapF" value="minggu"${L.foto === 'minggu' ? ' checked' : ''} onchange="S.lap.foto='minggu';lapPreview()"> Hanya yang diunggah minggu ini</label><label class="row-f gap1" style="cursor:pointer;font-size:13.5px"><input type="radio" name="lapF" value="semua"${L.foto === 'semua' ? ' checked' : ''} onchange="S.lap.foto='semua';lapPreview()"> Semua foto</label></div></div>
      <p class="help">Isi dokumen: <b>halaman ringkasan</b> (A. Hasil Usaha, B. Proses, C. Program Kerja \u2014 per sub-bagian, bernomor), lalu <b>halaman foto</b> Hasil Usaha, Proses, dan Program Kerja yang berfoto. Urutan sub-bagian: Tambal Sulam, Pengelasan, Perairan, Pelistrikan, Perkayuan, Pertamanan, Kamar Mandi, TPS, lalu lainnya. Hasil Usaha selalu memuat foto lengkapnya; Proses &amp; Program Kerja hanya foto baru minggu itu, agar tidak terulang.</p>
      <div id="lapPrev" class="mt1"></div>`,
    footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-g" id="lapGo" onclick="lapExport(this)" disabled><i class="bi bi-file-earmark-word"></i> Buat Google Docs</button>`
  });
  lapPreview();
}
async function lapPreview() {
  const box = $('#lapPrev'); if (!box) return;
  const L = S.lap, key = JSON.stringify(L); S.lapKey = key;
  box.innerHTML = '<div class="muted"><span class="spin-sm"></span> Menghitung isi laporan\u2026</div>'; const go = $('#lapGo'); if (go) go.disabled = true;
  try {
    const r = await api('program.laporan', { start: L.start, bagian: L.bag, foto: L.foto }, true);
    if (S.lapKey !== key || !$('#lapPrev')) return;
    S.lapRes = r;
    const tot = r.reduce((n, x) => n + x.total, 0), foto = r.reduce((n, x) => n + x.foto, 0);
    const est = Math.max(10, Math.round(6 + foto * 1.2 + tot * 0.25));
    box.innerHTML = r.map(b => `<div class="mb2"><div class="row-f between wrap gap1"><b>${E(b.bagian)} \u00B7 Minggu ke-${b.weekNo}</b><span class="muted" style="font-size:12px">${fdate(b.start)} \u2013 ${fdate(b.end)}</span></div><div class="lap-sum">${[['hasil', 'Hasil Usaha'], ['proses', 'Proses'], ['rencana', 'Program Kerja']].map(k => `<div><span>${k[1]}</span><b>${b.seksi[k[0]].program}</b><span class="muted">${b.seksi[k[0]].halaman} halaman foto \u00B7 ${b.seksi[k[0]].foto} foto</span></div>`).join('')}</div>
      <details><summary class="link-btn" style="cursor:pointer">Lihat daftar program</summary><div class="lap-list">${[['hasil', 'A. HASIL USAHA'], ['proses', 'B. PROSES'], ['rencana', 'C. PROGRAM KERJA']].map(k => `<h5>${k[1]}</h5>${b.seksi[k[0]].sub.length ? b.seksi[k[0]].sub.map(g => `${g.sub ? `<div class="ls">${E(g.sub)}</div>` : ''}<ol>${g.items.map(i => `<li>${E(i.uraian)}${b.bagian === 'Proyek' ? ' <span class="fx">(' + E(i.lokasi) + ')</span>' : ''} ${i.foto.length ? '<span class="fx">\u00B7 foto ' + E(i.foto.join(', ')) + '</span>' : ''}</li>`).join('')}</ol>`).join('') : '<div class="fx">(tidak ada)</div>'}`).join('')}</div></details></div>`).join('') +
      `<div class="pill ${tot ? 'pill-info' : 'pill-warn'}">${tot ? tot + ' program \u00B7 ' + foto + ' foto \u00B7 perkiraan \u00B1' + est + ' detik' : 'Tidak ada program pada minggu ini'}</div>`;
    if (go) go.disabled = !tot;
  } catch (e) { if ($('#lapPrev')) box.innerHTML = `<div class="err-box">${E(e.message)}</div>`; }
}
function lapExport(btn) {
  const L = Object.assign({}, S.lap), r = S.lapRes || [], foto = r.reduce((n, x) => n + x.foto, 0), tot = r.reduce((n, x) => n + x.total, 0);
  const est = Math.max(10, Math.round(6 + foto * 1.2 + tot * 0.25));
  return act(btn, async () => {
    openModal({ title: 'Menyusun laporan Docs', body: `<div class="exp-prog"><div class="exp-ring"></div><div><b>${E(L.bag === 'Semua' ? 'Tambal Sulam + Proyek' : L.bag)} \u00B7 ${fdate(L.start)} \u2013 ${fdate(addD(L.start, 6))}</b><p class="muted" style="margin:.25rem 0 0">${tot} program, ${foto} foto. Perkiraan \u00B1${est} detik.</p><div class="exp-bar"><span id="expBar"></span></div><p class="muted" id="expTime" style="margin:.35rem 0 0;font-size:12px">0 detik</p></div></div><p class="help mt2">Google Docs menyisipkan foto satu per satu, jadi makin banyak foto makin lama. Jendela ini boleh ditutup; proses tetap berjalan dan tautan muncul setelah selesai.</p>` });
    const t0 = Date.now(), tick = setInterval(() => { const d = Math.round((Date.now() - t0) / 1000), el = $('#expTime'), bar = $('#expBar'); if (el) el.textContent = d + ' detik' + (d > est ? ' \u00B7 sedikit lebih lama dari perkiraan, mohon tunggu' : ''); if (bar) bar.style.width = Math.min(95, Math.round(d / est * 100)) + '%'; }, 1000);
    try {
      const res = await apiM('program.exportWeekly', { start: L.start, bagian: L.bag, foto: L.foto }, false, { timeout: 340000 });
      clearInterval(tick); showExport(res.data, 'Buka Google Docs');
      if (res.data.terpotong) toast(res.message, 'err');
    } catch (e) { clearInterval(tick); closeModal(); throw e; }
  });
}
async function subManage() {
  const list = await api('sub.list'); S.subs = list;
  openModal({
    title: 'Kelola sub-bagian', size: 'lg',
    body: `<div class="tools"><button class="btn-x btn-p btn-sm" onclick="subForm()"><i class="bi bi-plus-lg"></i> Tambah sub-bagian</button></div>` + tableHtml('tbSub', [
      { l: 'Bagian', f: r => badge(r.Bagian) }, { l: 'Nama sub-bagian', f: r => `<b>${E(r.Nama)}</b>` }, { l: 'Mandor', k: 'Mandor' }, { l: 'Status', f: r => badge(r.Status) },
      { l: '', f: r => `<div class="actions"><button class="btn-x btn-o btn-sm" onclick="subForm('${r.ID}')"><i class="bi bi-pencil"></i></button>${isSuper() ? `<button class="btn-x btn-d btn-sm" onclick="subDel('${r.ID}')" aria-label="Hapus"><i class="bi bi-trash"></i></button>` : ''}</div>` }
    ], list, { empty: 'Belum ada sub-bagian' }),
    footer: '<button class="btn-x btn-o" data-bs-dismiss="modal">Tutup</button>'
  });
}
function subForm(id) {
  const rec = id ? S.subs.find(x => x.ID === id) : null;
  openForm({
    title: rec ? 'Ubah sub-bagian' : 'Tambah sub-bagian', submit: 'Simpan',
    fields: [{ k: 'Bagian', l: 'Bagian', t: 'select', opts: ['Tambal Sulam', 'Proyek'], req: true }, { k: 'Status', l: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'] }, { k: 'Nama', l: 'Nama sub-bagian', req: true, full: true }, { k: 'Mandor', l: 'Mandor', full: true }],
    values: rec || { Bagian: 'Tambal Sulam', Status: 'Aktif' },
    save: async d => { if (rec) d.ID = rec.ID; const r = await apiM('sub.save', d); toast(r.message, 'ok'); await subManage(); }
  });
}
async function subDel(id) {
  if (!(await confirmBox('Hapus sub-bagian ini?', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('sub.delete', { id: id }); toast(r.message, 'ok'); await subManage(); });
}

function periodeRange(p) {
  const t = todayStr(), st = cycStart(t);
  if (p === 'lalu') return { from: addD(st, -7), to: addD(st, -1) };
  if (p === '30') return { from: addD(t, -30), to: t };
  if (p === 'semua') return {};
  return { from: st, to: addD(st, 6) };
}
const periodeSel = (id, cur, fn) => `<select class="inp" id="${id}" style="width:auto" onchange="${fn}" aria-label="Periode"><option value="siklus"${cur === 'siklus' ? ' selected' : ''}>Siklus ini (Kamis\u2013Rabu)</option><option value="lalu"${cur === 'lalu' ? ' selected' : ''}>Siklus lalu</option><option value="30"${cur === '30' ? ' selected' : ''}>30 hari terakhir</option><option value="semua"${cur === 'semua' ? ' selected' : ''}>Semua</option></select>`;

PAGES.material = async function (o) {
  const tab = (o && o.tab) || (S.mat && S.mat.tab) || 'pesanan', per = (o && o.per) || (S.mat && S.mat.per) || 'siklus';
  const [rows, kat] = await Promise.all([api('material.list', periodeRange(per)), api('katalog.list')]);
  S.mat = { tab: tab, per: per, rows: rows, kat: kat.rows, owners: kat.owners, st: '' };
  return `<div class="page-head"><div><h1>Pemesanan material</h1><p>${isStaff() ? 'Pesan material ke Toko KUK dan pantau statusnya dari proses hingga terkirim.' : 'Proses pesanan masuk dari pengurus: perbarui status, nama pengirim, dan foto bukti barang tiba.'}</p></div>${isStaff() ? `<button class="btn-x btn-g" onclick="orderForm()"><i class="bi bi-cart-plus"></i> Pesan ke Toko KUK</button>` : ''}</div>
  <section class="card-x"><div class="tabs-x" role="tablist"><button class="tab-x ${tab === 'pesanan' ? 'on' : ''}" role="tab" onclick="navigateTo('material',{tab:'pesanan'})">Pesanan</button><button class="tab-x ${tab === 'katalog' ? 'on' : ''}" role="tab" onclick="navigateTo('material',{tab:'katalog'})">Katalog toko</button></div>
  ${tab === 'pesanan' ? matPesananHtml() : matKatalogHtml()}</section>`;
};
function matPesananHtml() {
  const s = S.mat;
  return `<div class="tools"><div class="search"><i class="bi bi-search"></i><input class="inp" id="q_mat" type="search" placeholder="Cari nota, material, tujuan\u2026" aria-label="Cari pesanan" oninput="paintMat()"></div>
    <select class="inp" id="matSt" style="width:auto" onchange="paintMat()" aria-label="Filter status"><option value="">Semua status</option><option>Proses</option><option>Terkirim</option><option>Ditolak</option></select>
    ${periodeSel('matPer', s.per, "navigateTo('material',{per:this.value})")}</div><div id="matTbl">${matTblHtml()}</div>`;
}
function matTblHtml() {
  const s = S.mat, st = ($('#matSt') || {}).value || '', q = (($('#q_mat') || {}).value || '').trim().toLowerCase(), sf = isStaff();
  const rows = s.rows.filter(r => (!st || r.StatusKirim === st) && (!q || rowText(r).indexOf(q) >= 0));
  const cols = [
    { l: 'Nama barang', c: 'c-nm', f: r => `<b>${E(r.Material)}</b><span class="sub">${fdate(r.Tanggal)} \u00B7 ${E(r.Tujuan)}</span>` },
    { l: 'Jml', n: 1, c: 'c-jml', f: r => `${num(r.Jumlah)}<span class="only-xs muted"> ${E(r.Satuan || '')}</span>` },
    { l: 'Satuan', c: 'c-sat', f: r => E(r.Satuan || '\u2013') },
    { l: 'Harga satuan', n: 1, c: 'c-hrg', f: r => Rp(r.HargaSatuan) },
    { l: 'Total', n: 1, c: 'c-tot', f: r => `<b>${Rp(r.Total)}</b>` },
    { l: 'Pengiriman', c: 'c-st', f: r => `${badge(r.StatusKirim)}${r.StatusBayar === 'Telah Dibayar' ? ' <span class="pill pill-ok">Lunas</span>' : ''}${r.NamaPengirim ? `<span class="sub">${E(r.NamaPengirim)}</span>` : ''}` },
    { l: '', c: 'c-act', f: r => `<div class="actions">${r.BuktiKirimURL ? `<button class="btn-x btn-o btn-sm" data-preview="${E(r.BuktiKirimURL)}" data-title="Bukti kirim ${E(r.NoNota)}" aria-label="Lihat bukti kirim"><i class="bi bi-image"></i></button>` : ''}<button class="btn-x btn-o btn-sm" onclick="matStatus('${r.ID}')"><i class="bi bi-truck"></i><span class="hide-m">Status</span></button>${r.StatusBayar !== 'Telah Dibayar' ? `<button class="btn-x btn-o btn-sm" onclick="matEdit('${r.ID}')" aria-label="Ubah pesanan"><i class="bi bi-pencil"></i></button>` : ''}${sf ? `<button class="btn-x btn-d btn-sm" onclick="matDel('${r.ID}')" aria-label="Hapus pesanan"><i class="bi bi-trash"></i></button>` : ''}</div>` }
  ];
  return ['Tambal Sulam', 'Proyek'].map(b => {
    const list = rows.filter(r => r.Bagian === b);
    return `<div class="grp grp-${b === 'Tambal Sulam' ? 'ts' : 'pr'}"><div class="grp-h">PEMESANAN ${E(b.toUpperCase())}<span class="pill">${list.length} item</span></div><div class="grp-b">${tableHtml('tb_mat_' + b.replace(/\s/g, ''), cols, list, { cls: 'nostk tbl-slim tbl-mat', empty: 'Belum ada pesanan ' + b + ' pada periode ini' })}</div></div>`;
  }).join('');
}
function paintMat() { $('#matTbl').innerHTML = matTblHtml(); }
function matStatus(id) {
  const m = S.mat.rows.find(x => x.ID === id) || (S.bayar && S.bayar.rows.find(x => x.ID === id)); S.photo = {};
  openForm({
    title: 'Ubah status pengiriman \u00B7 #' + m.NoNota, submit: 'Simpan status',
    fields: [
      { k: 'status', l: 'Status pengiriman', t: 'select', opts: ['Proses', 'Terkirim', 'Ditolak'], full: true }, { k: 'pengirim', l: 'Nama pengirim / driver', full: true, help: 'Wajib jika status Terkirim.' },
      { k: 'foto', t: 'html', html: photoCtl('kirimFoto', 'Foto bukti barang tiba' + (m.BuktiKirimURL ? ' (sudah ada, unggah baru untuk mengganti)' : ' (opsional)')) }
    ],
    values: { status: m.StatusKirim, pengirim: m.NamaPengirim },
    save: async d => {
      const ph = (S.photo || {}).kirimFoto;
      const r = await apiM('material.status', { id: id, status: d.status, pengirim: d.pengirim, data: ph ? ph.data : '', mime: ph ? ph.mime : '' });
      toast(r.message, 'ok'); closeModal(); navigateTo(AppState.page);
    }
  });
}
function matEdit(id) {
  const m = (S.mat && S.mat.rows.find(x => x.ID === id)) || (S.bayar && S.bayar.rows.find(x => x.ID === id));
  openForm({
    title: 'Ubah pesanan \u00B7 #' + m.NoNota, fields: [{ k: 'material', l: 'Nama material', req: true, full: true, help: 'Jika sama dengan katalog, harga mengikuti katalog.' }, { k: 'jumlah', l: 'Jumlah (' + m.Satuan + ')', t: 'number', req: true, min: 0.01, step: 'any' }],
    values: { material: m.Material, jumlah: m.Jumlah }, save: async d => { d.id = id; const r = await apiM('material.edit', d); toast(r.message, 'ok'); closeModal(); navigateTo(AppState.page); }
  });
}
async function matDel(id) {
  if (!(await confirmBox('Hapus pesanan ini? Tindakan tercatat di audit dan tidak dapat dibatalkan.', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('material.delete', { id: id }); toast(r.message, 'ok'); navigateTo(AppState.page); });
}
const katOpts = rows => rows.map(k => `<option value="${E(k.Material)}">${E(k.Satuan)} \u00B7 ${Rp(k.Harga)}</option>`).join('');
async function orderForm() {
  const kc = dcPeek('katalog.list', {});
  S.orderKat = kc ? kc.rows : [];
  dcFresh('katalog.list', {}, d => {
    S.orderKat = d.rows; const dl = $('#katDL'); if (dl) dl.innerHTML = katOpts(d.rows);
    if (!d.rows.length && $('#katDL')) toast('Katalog toko masih kosong. Ketik nama barang, satuan, dan harga secara manual.', '');
  });
  if (kc && !kc.rows.length) toast('Katalog toko masih kosong. Ketik nama barang, satuan, dan harga secara manual.', '');
  openModal({
    title: 'Pesan material ke Toko KUK', size: 'lg',
    body: `<div class="form-grid"><div><label class="lbl" for="ordBag">Bagian <span style="color:#dc2626">*</span></label><select class="inp" id="ordBag"><option>Tambal Sulam</option><option>Proyek</option></select></div><div><label class="lbl" for="ordTuj">Alokasi / sub-bagian tujuan <span style="color:#dc2626">*</span></label><input class="inp" id="ordTuj" placeholder="Mis. Rusunawa Asatidz Lt. 2" maxlength="100"></div></div>
      <div class="mt2 fw6">Daftar material</div><div class="help">Ketik nama barang untuk mencari di katalog. Satuan dan harga mengikuti katalog; jika barang belum ada di katalog, isi satuan dan harganya sendiri.</div>
      <datalist id="katDL">${katOpts(S.orderKat)}</datalist>
      <div id="ordLines" class="mt1"></div>
      <div class="row-f between wrap gap1 mt1"><button class="btn-x btn-o btn-sm" onclick="addOrderLine()"><i class="bi bi-plus-lg"></i> Tambah baris</button><div class="fw7 num" id="ordEst">Perkiraan total: Rp 0</div></div>`,
    footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-g" id="ordGo" onclick="submitOrder(this)"><i class="bi bi-send"></i> Kirim pesanan</button>`
  });
  addOrderLine();
}
function addOrderLine() {
  $('#ordLines').insertAdjacentHTML('beforeend', `<div class="li ord-line wrap" style="align-items:flex-end;gap:.5rem">
    <div class="grow" style="min-width:200px"><label class="lbl">Nama barang</label><input class="inp ol-nm" list="katDL" placeholder="Ketik untuk mencari\u2026" autocomplete="off" oninput="ordPick(this)"></div>
    <div style="width:90px"><label class="lbl">Jumlah</label><input type="number" min="0.01" step="any" class="inp ol-qty" oninput="ordEst()" inputmode="decimal"></div>
    <div style="width:100px"><label class="lbl">Satuan</label><input class="inp ol-sat" placeholder="\u2013"></div>
    <div style="width:130px"><label class="lbl">Harga satuan</label><input type="number" min="0" class="inp ol-hg" placeholder="0" oninput="ordEst()"></div>
    <button type="button" class="icon-btn" onclick="this.closest('.ord-line').remove();ordEst()" aria-label="Hapus baris"><i class="bi bi-x-lg"></i></button>
    <div class="ol-info help" style="width:100%;margin:0"></div></div>`);
}
function ordPick(inp) {
  const l = inp.closest('.ord-line'), nm = inp.value.trim().toLowerCase();
  const k = S.orderKat.find(x => String(x.Material).toLowerCase() === nm);
  const sat = l.querySelector('.ol-sat'), hg = l.querySelector('.ol-hg'), info = l.querySelector('.ol-info');
  if (k) {
    l.dataset.kid = k.ID; sat.value = k.Satuan; hg.value = k.Harga; sat.readOnly = hg.readOnly = true;
    info.innerHTML = '<span class="pill pill-ok">Dari katalog</span>';
  } else {
    if (l.dataset.kid) { sat.value = ''; hg.value = ''; }
    delete l.dataset.kid; sat.readOnly = hg.readOnly = false;
    info.textContent = nm ? 'Barang belum ada di katalog \u2014 isi satuan dan harga secara manual.' : '';
  }
  ordEst();
}
function ordEst() {
  let t = 0;
  $$('.ord-line').forEach(l => { t += (Number(l.querySelector('.ol-qty').value) || 0) * (Number(l.querySelector('.ol-hg').value) || 0); });
  $('#ordEst').textContent = 'Perkiraan total: ' + Rp(t);
}
function submitOrder(btn) {
  return act(btn, async () => {
    const bag = $('#ordBag').value, tuj = $('#ordTuj').value.trim();
    if (!tuj) { $('#ordTuj').focus(); throw new Error('Isi alokasi / sub-bagian tujuan.'); }
    const items = [];
    $$('.ord-line').forEach((l, i) => {
      const nm = l.querySelector('.ol-nm').value.trim(), q = Number(l.querySelector('.ol-qty').value);
      if (!nm) throw new Error('Isi nama barang pada baris ' + (i + 1) + '.');
      if (!(q > 0)) throw new Error('Isi jumlah > 0 pada baris ' + (i + 1) + '.');
      if (l.dataset.kid) items.push({ katalogId: l.dataset.kid, jumlah: q });
      else {
        const sat = l.querySelector('.ol-sat').value.trim();
        if (!sat) throw new Error('Isi satuan pada baris ' + (i + 1) + '.');
        items.push({ material: nm, satuan: sat, harga: Number(l.querySelector('.ol-hg').value) || 0, jumlah: q });
      }
    });
    if (!items.length) throw new Error('Tambahkan minimal satu material.');
    const r = await apiM('material.order', { Bagian: bag, Tujuan: tuj, items: items });
    toast(r.message + ' Nota: ' + r.data.join(', '), 'ok'); closeModal();
    if (AppState.page === 'material' || AppState.page === 'dashboard') navigateTo(AppState.page);
  });
}
function matKatalogHtml() {
  const s = S.mat, own = r => isStaff() || r.PemilikToko === AppState.user.username;
  return `<div class="tools">${searchBox('q_kat', 'tb_kat', 'Cari item katalog\u2026')}<span class="grow"></span><button class="btn-x btn-o btn-sm" onclick="importOpen('katalog')"><i class="bi bi-file-earmark-spreadsheet"></i> Impor Excel</button><button class="btn-x btn-p btn-sm" onclick="katForm()"><i class="bi bi-plus-lg"></i> Tambah item</button></div>` +
    tableHtml('tb_kat', [
      { l: 'Material', f: r => `<b>${E(r.Material)}</b>` }, { l: 'Satuan', k: 'Satuan' }, { l: 'Harga', n: 1, f: r => `<b>${Rp(r.Harga)}</b>` }, { l: 'Pemilik toko', k: 'PemilikToko' }, { l: 'Diperbarui', f: r => fdt(r.UpdatedAt) },
      { l: '', f: r => own(r) ? `<div class="actions"><button class="btn-x btn-o btn-sm" onclick="katForm('${r.ID}')"><i class="bi bi-pencil"></i><span class="hide-m">Ubah</span></button><button class="btn-x btn-d btn-sm" onclick="katDel('${r.ID}')" aria-label="Hapus"><i class="bi bi-trash"></i></button></div>` : '' }
    ], s.kat, { empty: 'Katalog masih kosong', emptySub: 'Tambahkan material beserta harga satuannya.' });
}
function katForm(id) {
  const rec = id ? S.mat.kat.find(x => x.ID === id) : null, s = S.mat;
  const fields = [{ k: 'Material', l: 'Nama material', req: true, full: true }, { k: 'Satuan', l: 'Satuan', req: true, ph: 'Sak, Batang, Rit\u2026' }, { k: 'Harga', l: 'Harga satuan (Rp)', t: 'number', req: true, min: 0, step: 100 }];
  if (isStaff()) fields.push({ k: 'PemilikToko', l: 'Pemilik katalog (akun toko)', t: 'select', req: true, full: true, opts: s.owners.length ? s.owners : ['tokokuk'] });
  openForm({ title: rec ? 'Ubah item katalog' : 'Tambah item katalog', fields: fields, values: rec || { PemilikToko: s.owners[0] || 'tokokuk' }, save: async d => { if (rec) d.ID = rec.ID; const r = await apiM('katalog.save', d); toast(r.message, 'ok'); closeModal(); navigateTo('material', { tab: 'katalog' }); } });
}
async function katDel(id) {
  if (!(await confirmBox('Hapus item katalog ini? Pesanan lama tidak terpengaruh.', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('katalog.delete', { id: id }); toast(r.message, 'ok'); navigateTo('material', { tab: 'katalog' }); });
}

const eligible = r => r.StatusKirim === 'Terkirim' && r.StatusBayar !== 'Telah Dibayar';
PAGES.pembayaran = async function (o) {
  const per = (o && o.per) || (S.bayar && S.bayar.per) || 'siklus';
  const rows = (await api('material.list', periodeRange(per))).filter(r => r.StatusKirim === 'Terkirim');
  S.bayar = { per: per, rows: rows };
  return `<div class="page-head"><div><h1>Pembayaran material</h1><p>Verifikasi &amp; rekapitulasi pembayaran barang yang sudah berstatus Terkirim. Setiap pembayaran wajib melampirkan bukti dan nama verifikator.</p></div>${periodeSel('bayPer', per, "navigateTo('pembayaran',{per:this.value})")}</div>
  <div class="two">${['Tambal Sulam', 'Proyek'].map(bayarPanel).join('')}</div>`;
};
function bayarPanel(bagian) {
  const list = S.bayar.rows.filter(r => r.Bagian === bagian), un = list.filter(eligible);
  const g = bagian === 'Tambal Sulam' ? 'ts' : 'pr';
  const byDate = {}; list.forEach(r => { (byDate[r.Tanggal] = byDate[r.Tanggal] || []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();
  const dayCard = t => {
    const it = byDate[t], unDay = it.filter(eligible);
    return `<div class="day-card"><div class="day-h"><span><b>${E(fdate(t, 1).toUpperCase())}</b> <span class="pill">${it.length} item</span></span>${unDay.length ? `<button class="btn-x btn-g btn-sm" onclick="bayarModal(null,'${t}','${bagian}')"><i class="bi bi-check2-all"></i> Bayar hari ini</button>` : '<span class="pill pill-ok">Lunas</span>'}</div>
      <div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl nostk tbl-pay"><thead><tr><th>Nama barang</th><th class="n">Jml</th><th class="n">Total</th><th>Status / verifikator</th><th class="n">Aksi</th></tr></thead><tbody>${it.map(r => `<tr>
        <td class="c-nm"><b>${E(r.Material)}</b><span class="sub">Tujuan: ${E(r.Tujuan)}</span></td>
        <td class="n nw c-jml">${num(r.Jumlah)} <span class="muted">${E(r.Satuan)}</span></td>
        <td class="n nw c-tot"><b>${Rp(r.Total)}</b></td>
        <td class="c-st">${badge(r.StatusBayar)}<span class="sub">${r.Verifikator ? 'Verifikator: ' + E(r.Verifikator) : 'Verifikator: \u2013'}</span></td>
        <td class="c-act"><div class="actions">${r.BuktiBayarURL ? `<button class="btn-x btn-o btn-sm" data-preview="${E(r.BuktiBayarURL)}" data-title="Bukti bayar ${E(r.NoNota)}" aria-label="Lihat bukti"><i class="bi bi-image"></i></button>` : ''}${eligible(r) ? `<button class="btn-x btn-o btn-sm" onclick="matEdit('${r.ID}')" aria-label="Edit"><i class="bi bi-pencil"></i></button><button class="btn-x btn-g btn-sm" onclick="bayarModal(['${r.ID}'])"><i class="bi bi-check2"></i> Bayar</button>` : `<button class="btn-x btn-d btn-sm" onclick="bayarCancel('${r.ID}')">Batalkan</button>`}</div></td>
      </tr>`).join('')}</tbody></table></div></div>`;
  };
  return `<div class="card-x">
    <div class="card-h"><h3 class="grp-title ${g}">KEUANGAN ${E(bagian.toUpperCase())}</h3><span class="pill pill-${g === 'ts' ? 'ts' : 'brand'}">${list.length} barang terkirim</span></div>
    <div class="pay-sum"><div class="pay-due"><small>BELUM DIBAYAR<span class="hide-xs"> (PRIORITAS)</span></small><b class="num">${Rp(un.reduce((t, r) => t + r.Total, 0))}</b></div><div class="pay-tot"><small>KEUANGAN TERKIRIM</small><b class="num">${Rp(list.reduce((t, r) => t + r.Total, 0))}</b></div></div>
    <div class="grp grp-${g}"><div class="grp-h">PEMBAYARAN ${E(bagian.toUpperCase())}<span class="pill">${list.length} item</span></div><div class="grp-b">${dates.length ? dates.map(dayCard).join('') : emptyBox('Belum ada barang terkirim', 'Barang masuk ke sini setelah Toko KUK menandainya Terkirim.')}</div></div>
  </div>`;
}
function bayarModal(ids, tanggal, bagian) {
  const list = tanggal ? S.bayar.rows.filter(r => r.Tanggal === tanggal && r.Bagian === bagian && eligible(r)) : S.bayar.rows.filter(r => ids.indexOf(r.ID) >= 0 && eligible(r));
  if (!list.length) return toast('Tidak ada nota terkirim yang belum dibayar pada pilihan ini.', 'err');
  S.photo = {};
  openModal({
    title: 'Verifikasi pembayaran',
    body: `<div class="li mb2"><span class="ico g"><i class="bi bi-receipt"></i></span><div class="grow"><div class="t">${list.length} barang akan ditandai Telah Dibayar</div><div class="s">${E(list.slice(0, 3).map(r => r.Material).join(', '))}${list.length > 3 ? ' dan ' + (list.length - 3) + ' lainnya' : ''}</div></div><b class="num">${Rp(list.reduce((t, r) => t + r.Total, 0))}</b></div>
      <div class="mb2"><label class="lbl" for="bayVer">Nama verifikator <span style="color:#dc2626">*</span></label><input class="inp" id="bayVer" value="${E(AppState.user.nama)}" maxlength="80"></div>
      ${photoCtl('bayarFoto', 'Foto bukti transaksi / struk (opsional)')}<div class="help mt1">Boleh dikosongkan. Bila dilampirkan, satu foto dipakai untuk seluruh barang pada pilihan ini.</div>`,
    footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-g" onclick="bayarSubmit(this)" id="bayOk"><i class="bi bi-check2-circle"></i> Tandai Telah Dibayar</button>`
  });
  S.bayarTarget = { ids: list.map(r => r.ID) };
}
function bayarSubmit(btn) {
  return act(btn, async () => {
    const ph = (S.photo || {}).bayarFoto, ver = $('#bayVer').value.trim();
    if (!ver) { $('#bayVer').focus(); throw new Error('Isi nama verifikator.'); }
    const r = await apiM('bayar.verify', { ids: S.bayarTarget.ids, verifikator: ver, data: ph ? ph.data : '', mime: ph ? ph.mime : '' });
    toast(r.message + ' Total ' + Rp(r.data.total), 'ok'); closeModal(); navigateTo('pembayaran');
  });
}
async function bayarCancel(id) {
  if (!(await confirmBox('Batalkan status pembayaran nota ini? Bukti bayar akan dilepas dari nota.', 'Ya, batalkan'))) return;
  await act(null, async () => { const r = await apiM('bayar.cancel', { id: id }); toast(r.message, 'ok'); navigateTo('pembayaran'); });
}

PAGES.akun = async function (o) {
  const tab = (o && o.tab) || 'akun';
  const tabs = `<div class="tabs-x" role="tablist"><button class="tab-x ${tab === 'akun' ? 'on' : ''}" onclick="navigateTo('akun',{tab:'akun'})">Akun pengguna</button><button class="tab-x ${tab === 'audit' ? 'on' : ''}" onclick="navigateTo('akun',{tab:'audit'})">Jejak audit</button><button class="tab-x ${tab === 'set' ? 'on' : ''}" onclick="navigateTo('akun',{tab:'set'})">Pengaturan</button></div>`;
  let body = '';
  if (tab === 'akun') {
    const u = await api('admin.users'); S.users = u;
    body = `<div class="tools">${searchBox('q_usr', 'tb_usr', 'Cari akun\u2026')}<span class="grow"></span><button class="btn-x btn-p btn-sm" onclick="userForm()"><i class="bi bi-person-plus"></i> Tambah akun</button></div>` + tableHtml('tb_usr', [
      { l: 'Pengguna', f: r => `<div class="row-f gap1"><span class="avatar sm">${E(initials(r.Nama))}</span><div><b>${E(r.Nama)}</b>${r.utama ? ' <span class="pill pill-brand">Utama</span>' : ''}<span class="sub">@${E(r.Username)}</span></div></div>` },
      { l: 'Peran', f: r => badge(r.Role, r.Role === 'superadmin' ? 'brand' : r.Role === 'admin' ? 'info' : 'ts').replace('>' + r.Role + '<', '>' + (ROLE_LBL[r.Role] || r.Role) + '<') }, { l: 'Status', f: r => badge(r.Status) }, { l: 'Login terakhir', f: r => fdt(r.LastLogin) },
      { l: '', f: r => `<div class="actions"><button class="btn-x btn-o btn-sm" onclick="userForm('${r.ID}')"><i class="bi bi-pencil"></i><span class="hide-m">Ubah</span></button><button class="btn-x btn-w btn-sm" onclick="userReset('${r.ID}')"><i class="bi bi-key"></i><span class="hide-m">Reset</span></button>${r.utama || r.ID === AppState.user.id ? '' : `<button class="btn-x btn-d btn-sm" onclick="userDel('${r.ID}')" aria-label="Hapus akun"><i class="bi bi-trash"></i></button>`}</div>` }
    ], u);
  } else if (tab === 'audit') {
    const a = await api('admin.audit', { limit: 300 });
    body = `<div class="tools">${searchBox('q_aud', 'tb_aud', 'Cari pengguna, aksi, ringkasan\u2026')}<span class="muted" style="font-size:12px">300 catatan terbaru \u00B7 tidak dapat diubah dari aplikasi</span></div>` + tableHtml('tb_aud', [
      { l: 'Waktu', f: r => `<span class="num">${E(String(r.Timestamp).slice(0, 19))}</span>` }, { l: 'Pengguna', k: 'UserID' },
      { l: 'Aksi', f: r => `<span class="pill pill-${/gagal|ditolak|delete/.test(r.Aksi) ? 'bad' : /create|login$/.test(r.Aksi) ? 'ok' : 'info'}">${E(r.Aksi)}</span>` }, { l: 'Data', k: 'Sheet' }, { l: 'Ringkasan', k: 'Ringkasan' }
    ], a);
  } else {
    const c = await api('admin.config');
    const F = [{ k: 'appName', l: 'Nama aplikasi', req: true, full: true, ml: 60 }, { k: 'logoUrl', l: 'URL logo (https, opsional)', full: true, ph: 'Alamat https gambar logo' }, { k: 'emailToko', l: 'Email Toko KUK (notifikasi order masuk)', t: 'email', full: true, help: 'Beberapa email dipisah koma.' }, { k: 'emailAdmin', l: 'Email admin (notifikasi barang tiba)', t: 'text', full: true, help: 'Beberapa email dipisah koma.' }];
    S.cfgF = F;
    body = `<form id="cfgForm" class="form-grid" novalidate onsubmit="return false" style="max-width:640px">${F.map(f => fieldHtml(f, c[f.k])).join('')}<div class="full"><button class="btn-x btn-p" onclick="act(this,saveCfg)"><i class="bi bi-save"></i> Simpan pengaturan</button></div></form>
    <hr style="border-color:var(--border);margin:1.5rem 0"><h3 style="font-size:15px;margin-bottom:.75rem">Penyimpanan</h3><dl class="kv"><dt>ID folder Drive</dt><dd class="trunc" style="font-family:monospace">${E(c.folderId)}</dd><dt>ID Spreadsheet</dt><dd class="trunc" style="font-family:monospace">${E(c.spreadsheetId)}</dd></dl>`;
  }
  return `<div class="page-head"><div><h1>Kelola akun &amp; audit</h1><p>Atur pengguna, tinjau jejak aktivitas, dan sesuaikan pengaturan aplikasi.</p></div></div><section class="card-x">${tabs}${body}</section>`;
};
async function saveCfg() {
  const d = collect(S.cfgF, $('#cfgForm')); if (!d) return;
  const r = await apiM('admin.configSave', d); toast(r.message, 'ok');
  AppState.config.appName = d.appName; AppState.config.logoUrl = d.logoUrl; $('#tbApp').textContent = d.appName; document.title = d.appName;
}
function userForm(id) {
  const rec = id ? S.users.find(x => x.ID === id) : null;
  const fields = rec
    ? [{ k: 'Nama', l: 'Nama lengkap', req: true, full: true }, { k: 'Role', l: 'Peran', t: 'select', req: true, dis: rec.utama, opts: [{ v: 'superadmin', l: ROLE_LBL.superadmin }, { v: 'admin', l: ROLE_LBL.admin }, { v: 'toko', l: ROLE_LBL.toko }] }, { k: 'Status', l: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'], dis: rec.utama, help: rec.utama ? 'Akun utama dilindungi.' : 'Menonaktifkan akun langsung mengakhiri sesinya.' }]
    : [{ k: 'Username', l: 'Username', req: true, ml: 30, help: 'Huruf kecil, angka, titik, _ atau -.' }, { k: 'Nama', l: 'Nama lengkap', req: true }, { k: 'Role', l: 'Peran', t: 'select', req: true, opts: [{ v: 'admin', l: ROLE_LBL.admin }, { v: 'superadmin', l: ROLE_LBL.superadmin }, { v: 'toko', l: ROLE_LBL.toko }] }, { k: 'Password', l: 'Password awal', t: 'password', req: true, ml: 60, help: 'Minimal 8 karakter.' }];
  openForm({
    title: rec ? 'Ubah akun @' + rec.Username : 'Tambah akun', fields: fields, values: rec || { Role: 'admin' },
    save: async d => { if (rec) { d.ID = rec.ID; if (rec.utama) { d.Role = rec.Role; d.Status = 'Aktif'; } } const r = await apiM('admin.userSave', d); toast(r.message, 'ok'); closeModal(); navigateTo('akun', { tab: 'akun' }); }
  });
}
async function userReset(id) {
  const u = S.users.find(x => x.ID === id);
  if (!(await confirmBox('Reset password <b>@' + E(u.Username) + '</b>? Sesi aktifnya akan berakhir dan password sementara dibuat.', 'Ya, reset'))) return;
  await act(null, async () => {
    const r = await apiM('admin.resetPw', { id: id });
    openModal({ title: 'Password sementara', body: `<p>Sampaikan kepada <b>${E(r.data.username)}</b> lewat jalur aman. Password ini hanya tampil sekali.</p><div class="cred" id="credBox">${E(r.data.password)}</div>`, footer: `<button class="btn-x btn-o" onclick="copyCred()"><i class="bi bi-clipboard"></i> Salin</button><button class="btn-x btn-p" data-bs-dismiss="modal">Selesai</button>` });
  });
}
function copyCred() { const t = $('#credBox').textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Password disalin.', 'ok')).catch(() => { const r = document.createRange(); r.selectNodeContents($('#credBox')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Tekan Ctrl+C / tahan lalu Salin.'); }); }
async function userDel(id) {
  const u = S.users.find(x => x.ID === id);
  if (!(await confirmBox('Hapus akun <b>@' + E(u.Username) + '</b> secara permanen?', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('admin.userDelete', { id: id }); toast(r.message, 'ok'); navigateTo('akun', { tab: 'akun' }); });
}

document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.slot[data-preview]')) { e.preventDefault(); e.target.click(); }
  if (e.key === 'Escape') closeDrawer();
});
const WA_CARD = [['kirim', 'bi-truck', 'Barang untuk dikirim', 'Pesanan Toko KUK yang belum dikirim, per lokasi & pemesan'], ['hadir', 'bi-people', 'Kehadiran harian', 'Jumlah hadir shift pagi & siang, izin, ghoib'], ['keuangan', 'bi-wallet2', 'Rekap keuangan', 'Tambal Sulam & Proyek: minggu ini, sebelumnya, total'], ['tagihan', 'bi-receipt', 'Tagihan Toko KUK', 'Barang terkirim yang belum dibayar, per bagian']];
PAGES.wa = async function () {
  const c = await api('wa.config');
  S.wa = { c: c };
  return { html: waHtml(), init: () => { if (S.waSel) waPick(S.waSel, true); } };
};
function waHtml() {
  const c = S.wa.c;
  const warn = !c.ada ? `<div class="banner" role="status"><i class="bi bi-plug"></i><div class="grow"><b>WhatsApp belum terhubung</b><div class="t2">${isSuper() ? 'Isi token Fonnte dan daftar grup tujuan di bagian Pengaturan di bawah.' : 'Minta Super Admin mengisi token Fonnte di menu ini.'} Sementara itu pesan tetap bisa disusun lalu disalin.</div></div></div>`
    : !c.targets.length ? `<div class="banner" role="status"><i class="bi bi-people"></i><div class="grow"><b>Belum ada grup tujuan</b><div class="t2">${isSuper() ? 'Tambahkan grup tujuan di Pengaturan di bawah.' : 'Minta Super Admin menambahkan grup tujuan.'}</div></div></div>` : '';
  return `<div class="page-head"><div><h1>Kirim WhatsApp</h1><p>Susun laporan otomatis dari data SIMOP, periksa, lalu kirim ke grup WhatsApp lewat Fonnte. Teks bisa diubah sebelum dikirim.</p></div></div>${warn}
  <div class="wa-grid" role="group" aria-label="Jenis pesan">${WA_CARD.map(x => `<button type="button" class="wa-card${S.waSel === x[0] ? ' on' : ''}" data-waj="${x[0]}" onclick="waPick('${x[0]}')"><i class="bi ${x[1]}"></i><b>${E(x[2])}</b><span>${E(x[3])}</span></button>`).join('')}</div>
  <div id="waBox">${S.waSel ? '' : `<div class="card-x">${emptyBox('Pilih jenis pesan di atas', 'Pesan disusun otomatis dari data terbaru.')}</div>`}</div>
  ${isSuper() ? waSetHtml() : ''}`;
}
function waPick(j, keep) {
  S.waSel = j;
  $$('[data-waj]').forEach(b => b.classList.toggle('on', b.dataset.waj === j));
  const c = S.wa.c, opt = j === 'hadir' ? `<input type="date" class="inp" style="width:auto" id="waTgl" value="${E((S.waOpt && S.waOpt.tgl) || todayStr())}" onchange="waLoad()" aria-label="Tanggal">` : j === 'keuangan' ? `<select class="inp" style="width:auto" id="waWk" onchange="waLoad()" aria-label="Minggu"><option value="${cycStart(todayStr())}">Minggu ini</option><option value="${addD(cycStart(todayStr()), -7)}">Minggu lalu</option></select>` : '';
  const card = WA_CARD.find(x => x[0] === j);
  $('#waBox').innerHTML = `<div class="wa-wrap fade-in"><section class="card-x"><div class="card-h"><div><h2>${E(card[2])}</h2><p>Teks bisa diubah. Format WhatsApp: *tebal*, _miring_.</p></div><div class="row-f gap1 wrap">${opt}<button type="button" class="btn-x btn-o btn-sm" onclick="waLoad()"><i class="bi bi-arrow-clockwise"></i> Susun ulang</button></div></div>
      <textarea class="inp" id="waText" rows="16" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px" oninput="waBubble()" aria-label="Teks pesan"></textarea>
      <div class="row-f gap1 wrap mt1"><button type="button" class="btn-x btn-o btn-sm" onclick="waCopy()"><i class="bi bi-clipboard"></i> Salin teks</button>${navigator.share ? '<button type="button" class="btn-x btn-o btn-sm" onclick="waShare()"><i class="bi bi-share"></i> Bagikan\u2026</button>' : ''}<span class="muted" id="waLen" style="font-size:12px;margin-left:auto"></span></div></section>
    <section class="card-x"><div class="card-h"><div><h2>Pratinjau &amp; kirim</h2><p>Begini tampilan pesan di WhatsApp.</p></div></div><div class="wa-phone"><div class="wa-bub" id="waBub"><span class="spin-sm"></span> Menyusun pesan\u2026</div></div>
      <span class="lbl mt2">Kirim ke</span>${c.targets.length ? `<div class="wa-tg">${c.targets.map((t, i) => `<label><input type="checkbox" class="check" value="${E(t.id)}"${i === 0 ? ' checked' : ''}> ${E(t.nama)}<small>${E(t.id.replace(/@g\.us$/, ' (grup)'))}</small></label>`).join('')}</div>` : '<div class="muted" style="font-size:13px">Belum ada tujuan terdaftar.</div>'}
      <button type="button" class="btn-x btn-g mt2" style="width:100%" id="waGo" onclick="waSendUI(this)"${c.ada && c.targets.length ? '' : ' disabled'}><i class="bi bi-whatsapp"></i> Kirim lewat Fonnte</button></section></div>`;
  if (!keep || !S.waText) waLoad(); else { $('#waText').value = S.waText; waBubble(); }
}
async function waLoad() {
  const j = S.waSel, ta = $('#waText'); if (!j || !ta) return;
  const p = { jenis: j };
  if (j === 'hadir' && $('#waTgl')) { p.tanggal = $('#waTgl').value; S.waOpt = { tgl: p.tanggal }; }
  if (j === 'keuangan' && $('#waWk')) p.start = $('#waWk').value;
  ta.disabled = true; $('#waBub').innerHTML = '<span class="spin-sm"></span> Menyusun pesan\u2026';
  try {
    const r = await api('wa.preview', p, true);
    if (S.waSel !== j || !$('#waText')) return;
    ta.value = r.text; S.waText = r.text; waBubble();
  } catch (e) { $('#waBub').innerHTML = `<span style="color:#b91c1c">${E(e.message)}</span>`; }
  finally { if ($('#waText')) $('#waText').disabled = false; }
}
function waFmt(t) {
  return E(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>');
}
function waBubble() {
  const t = ($('#waText') || {}).value || ''; S.waText = t;
  const b = $('#waBub'); if (b) b.innerHTML = t ? waFmt(t) : '<span class="muted">(pesan kosong)</span>';
  const l = $('#waLen'); if (l) { l.textContent = t.length.toLocaleString('id-ID') + ' / 6.000 huruf'; l.style.color = t.length > 6000 ? '#dc2626' : ''; }
}
function waCopy() {
  const t = ($('#waText') || {}).value || ''; if (!t) return;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Teks pesan disalin. Tempel di WhatsApp.', 'ok')).catch(() => { const ta = $('#waText'); ta.select(); toast('Tekan Ctrl+C / tahan lalu Salin.'); });
}
function waShare() { const t = ($('#waText') || {}).value || ''; if (t && navigator.share) navigator.share({ text: t }).catch(() => { }); }
function waSendUI(btn) {
  return act(btn, async () => {
    const t = ($('#waText') || {}).value.trim(), tg = $$('.wa-tg input:checked').map(x => x.value);
    if (!t) throw new Error('Pesan masih kosong.');
    if (t.length > 6000) throw new Error('Pesan terlalu panjang (maks. 6.000 huruf).');
    if (!tg.length) throw new Error('Centang minimal satu grup tujuan.');
    const nama = tg.map(id => (S.wa.c.targets.find(x => x.id === id) || { nama: id }).nama);
    if (!(await confirmBox('Kirim pesan ini ke <b>' + E(nama.join(', ')) + '</b>?', 'Ya, kirim'))) return;
    let ok = 0;
    for (const id of tg) {
      try { const r = await apiM('wa.send', { target: id, text: t, jenis: S.waSel }); ok++; toast(r.message, 'ok'); }
      catch (e) { toast('Gagal ke ' + ((S.wa.c.targets.find(x => x.id === id) || {}).nama || id) + ': ' + e.message, 'err'); }
    }
    if (ok === tg.length) toast('Semua pesan terkirim (' + ok + ').', 'ok');
  });
}
const waRow = (t) => `<div class="row-t"><input class="inp wa-n" placeholder="Nama, mis. Grup Pembangunan G3" value="${E((t && t.nama) || '')}" maxlength="60" aria-label="Nama tujuan"><input class="inp wa-i" placeholder="ID grup (\u2026@g.us) atau nomor 62812\u2026" value="${E((t && t.id) || '')}" aria-label="ID tujuan" autocomplete="off"><button type="button" class="icon-btn" onclick="this.parentElement.remove()" aria-label="Hapus tujuan"><i class="bi bi-x-lg"></i></button></div>`;
function waSetHtml() {
  const c = S.wa.c;
  return `<section class="card-x wa-set mt2" id="waSet"><div class="card-h"><div class="row-f gap2"><div class="ico"><i class="bi bi-gear"></i></div><div><h2>Pengaturan Fonnte</h2><p>Khusus Super Admin. Token disimpan di server dan tidak ditampilkan utuh.</p></div></div></div>
    <div class="form-grid" style="max-width:760px"><div class="full"><label class="lbl" for="waTok">Token Fonnte</label><input class="inp" id="waTok" type="password" autocomplete="off" placeholder="${c.ada ? 'Tersimpan: ' + E(c.token) + ' \u2014 isi untuk mengganti' : 'Tempel token dari fonnte.com'}"><div class="help">Cara mendapatkan: masuk ke fonnte.com \u2192 menu <b>Device</b> \u2192 hubungkan nomor WhatsApp (scan QR) \u2192 salin <b>Token</b>.</div></div></div>
    <span class="lbl mt2">Tujuan pesan (grup atau nomor)</span><div id="waRows" style="max-width:760px">${(c.targets.length ? c.targets : [null]).map(waRow).join('')}</div>
    <div class="row-f gap1 wrap"><button type="button" class="btn-x btn-o btn-sm" onclick="$('#waRows').insertAdjacentHTML('beforeend',waRow())"><i class="bi bi-plus-lg"></i> Tambah tujuan</button><button type="button" class="btn-x btn-o btn-sm" onclick="waGroupsUI(false,this)"${c.ada ? '' : ' disabled title="Simpan token dulu"'}><i class="bi bi-list-ul"></i> Ambil daftar grup</button><button type="button" class="btn-x btn-o btn-sm" onclick="waGroupsUI(true,this)"${c.ada ? '' : ' disabled'} title="Gunakan sekali saat baru bergabung ke grup"><i class="bi bi-arrow-repeat"></i> Perbarui dari WhatsApp</button></div>
    <div id="waGrp" class="mt1"></div>
    <div class="row-f gap1 wrap mt2"><button type="button" class="btn-x btn-p" onclick="waSaveCfg(this,false)"><i class="bi bi-save"></i> Simpan pengaturan</button>${c.ada ? '<button type="button" class="btn-x btn-d btn-sm" onclick="waSaveCfg(this,true)"><i class="bi bi-trash"></i> Hapus token</button>' : ''}</div></section>`;
}
function waRowsGet() { return $$('#waRows .row-t').map(r => ({ nama: r.querySelector('.wa-n').value.trim(), id: r.querySelector('.wa-i').value.trim() })).filter(x => x.id); }
function waSaveCfg(btn, hapus) {
  return act(btn, async () => {
    if (hapus && !(await confirmBox('Hapus token Fonnte? Pengiriman WhatsApp akan berhenti sampai token diisi lagi.', 'Ya, hapus'))) return;
    const r = await apiM('wa.configSave', { token: hapus ? '' : $('#waTok').value.trim(), hapusToken: !!hapus, targets: waRowsGet() });
    toast(r.message, 'ok'); dcPatch('wa.config', {}, d => Object.assign(d, r.data)); navigateTo('wa', { force: true });
  });
}
function waGroupsUI(refresh, btn) {
  return act(btn, async () => {
    if (refresh && !(await confirmBox('Minta Fonnte memperbarui daftar grup dari WhatsApp? Lakukan hanya bila baru bergabung ke grup baru (terlalu sering bisa membuat nomor diblokir).', 'Ya, perbarui'))) return;
    const r = await apiM('wa.groups', { refresh: !!refresh });
    const gs = r.data.groups;
    $('#waGrp').innerHTML = gs.length ? `<div class="wa-tg" style="max-width:760px">${gs.map(g => `<label><span class="grow">${E(g.nama)}</span><small>${E(g.id)}</small><button type="button" class="btn-x btn-o btn-sm" onclick="waAddGrp(this)" data-id="${E(g.id)}" data-nama="${E(g.nama)}"><i class="bi bi-plus-lg"></i> Pakai</button></label>`).join('')}</div>` : '<div class="muted">Tidak ada grup. Pastikan nomor WhatsApp sudah bergabung ke grupnya, lalu tekan "Perbarui dari WhatsApp".</div>';
  });
}
function waAddGrp(b) {
  if (waRowsGet().some(x => x.id === b.dataset.id)) return toast('Grup ini sudah ada di daftar tujuan.', '');
  const empty = $$('#waRows .row-t').find(r => !r.querySelector('.wa-i').value.trim());
  if (empty) { empty.querySelector('.wa-n').value = b.dataset.nama; empty.querySelector('.wa-i').value = b.dataset.id; }
  else $('#waRows').insertAdjacentHTML('beforeend', waRow({ nama: b.dataset.nama, id: b.dataset.id }));
  toast('Ditambahkan. Klik "Simpan pengaturan" agar tersimpan.', 'ok');
}

(function init() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127.0.0.1)$/.test(location.hostname))) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
  let t = 'light';
  try { t = localStorage.getItem('simop-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { }
  setTheme(t);
  const saved = readToken();
  if (!gasConfigured()) { showLogin('Alamat server belum diatur. Isi GAS_URL di file js' + '/config.js dengan URL Web App (diakhiri /exec).'); return; }
  if (!saved) showLogin();
  else {
  document.body.classList.add('auth-mode');
  $('#app-container').innerHTML = bootHtml();
  const si = readSessInfo();
  if (si && si.user && si.menu) applySession({ token: saved, user: si.user, menu: si.menu, config: si.config || {} });
  gasPost('resumeSession', [saved]).then(
    res => {
      if (res && res.success) {
        if (!si || JSON.stringify(si.menu) !== JSON.stringify(res.data.menu) || si.user.role !== res.data.user.role) { AppState.seq++; applySession(res.data); }
        else { AppState.user = res.data.user; AppState.config = res.data.config; saveSessInfo(res.data); buildCheck(res.data.config); }
      } else if (si) { forceLogout(res && res.code === 'AUTH' ? 'Sesi berakhir. Silakan masuk kembali.' : (res && res.message)); }
      else { clearToken(); showLogin(res && res.code === 'AUTH' ? '' : (res && res.message)); }
    },
    e => { if (!si) showLogin(e.message || 'Koneksi gagal. Periksa jaringan lalu coba lagi.'); else toast('Koneksi ke server bermasalah. Menampilkan data terakhir di perangkat.', 'err'); });
  }
  gasGet('publicConfig').then(r => {
    if (r && r.success && !AppState.token) {
      AppState.config = r.data; document.title = r.data.appName;
      const h = $('#lgTitle'); if (h) h.textContent = 'Masuk ke ' + r.data.appName;
    }
  }).catch(() => { });
})();

PAGES.rekapmat = async function (o) {
  o = o || {};
  const prev = S.rmat || {};
  const cur = cycStart(todayStr());
  const modeTS = o.modeTS || prev.modeTS || 'ini', modePR = o.modePR || prev.modePR || 'ini';
  const pick = (mode, chosen) => mode === 'semua' ? { all: true } : { start: mode === 'lalu' ? addD(cur, -7) : mode === 'pilih' ? (chosen || cur) : cur };
  const qTS = pick(modeTS, o.startTS || prev.startTS), qPR = pick(modePR, o.startPR || prev.startPR);
  const [ts, pr] = await Promise.all([api('mat.rekap', Object.assign({ bagian: 'Tambal Sulam' }, qTS)), api('mat.rekap', Object.assign({ bagian: 'Proyek' }, qPR))]);
  S.rmat = { modeTS: modeTS, modePR: modePR, startTS: ts.all ? '' : ts.start, startPR: pr.all ? '' : pr.start, ts: ts, pr: pr, patokanPR: pr.patokan || '' };
  const sortir = (key, d) => {
    const mode = key === 'TS' ? modeTS : modePR, other = key === 'TS' ? 'modeTS' : 'modePR', sk = key === 'TS' ? 'startTS' : 'startPR';
    const modeSel = `<select class="inp" style="width:auto" aria-label="Sortir minggu ${key}" id="rmMode${key}" onchange="navigateTo('rekapmat',{${other}:this.value})">${[['ini', 'Minggu ini'], ['lalu', 'Minggu lalu'], ['semua', 'Semua'], ['pilih', 'Atur minggu ke-']].map(x => `<option value="${x[0]}"${mode === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select>`;
    const weekSel = mode === 'pilih' ? `<select class="inp" style="width:auto" aria-label="Minggu ke-" id="rmWeek${key}" onchange="navigateTo('rekapmat',{${other}:'pilih',${sk}:this.value})">${d.weeks.map(w => `<option value="${w.start}"${w.start === d.start ? ' selected' : ''}>${E(w.label)}</option>`).join('')}</select>` : '';
    return `<span class="row-f gap1 wrap">${modeSel}${weekSel}</span>`;
  };
  const per = d => d.all ? d.label + ' \u00B7 ' + fdate(d.start) + ' \u2013 ' + fdate(d.end) : d.label + ' \u00B7 ' + fdate(d.start) + ' \u2013 ' + fdate(d.end);
  const tbl = d => {
    const rows = d.items.map((m, i) => `<tr><td class="c-no">${i + 1}</td><td class="c-nm"><b>${E(m.Material)}</b><span class="sub hide-xs">${fdate(m.Tanggal)}</span></td><td class="n c-jml"><span class="hide-xs">${num(m.Jumlah)}</span><span class="only-xs muted">${fdate(m.Tanggal)} \u00B7 ${num(m.Jumlah)} ${E(m.Satuan || '')} @ ${Rp(m.HargaSatuan)}</span></td><td class="c-sat">${E(m.Satuan || '\u2013')}</td><td class="n c-hrg">${Rp(m.HargaSatuan)}</td><td class="n c-tot"><b>${Rp(m.Total)}</b></td><td class="c-pg"><span class="pill pill-muted"><i class="bi bi-truck"></i> ${E(m.NamaPengirim || '\u2013')}</span></td></tr>`).join('');
    const g = d.bagian === 'Tambal Sulam' ? 'ts' : 'pr';
    return `<div class="tbl-wrap"><table class="tbl nostk tbl-rm"><thead><tr><th>No</th><th>Nama barang</th><th class="n">Jml</th><th>Satuan</th><th class="n">Harga satuan</th><th class="n">Total subtotal</th><th>Pengirim</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted tc">Belum ada barang terkirim pada periode ini</td></tr>'}<tr class="tot-${g}"><td colspan="5">TOTAL ANGGARAN ${E(d.bagian.toUpperCase())}:</td><td class="n">${Rp(d.total)}</td><td></td></tr></tbody></table></div>`;
  };
  return `<div class="page-head"><div><h1>Rekapan mingguan pembayaran</h1><p>Rekapitulasi tagihan material terkirim Kamis\u2013Rabu, dengan penomoran minggu Tambal Sulam dan Proyek masing-masing.</p></div></div>
  <section class="card-x"><div class="tools" style="margin:0">
    <span class="fw7" style="font-size:13px">MINGGU TAMBAL SULAM:</span>${sortir('TS', ts)}
    <span class="pill pill-ts">${E(per(ts))}</span>
    <span class="grow"></span>
    <button class="btn-x btn-g" onclick="rekapMatExport(this)"><i class="bi bi-file-earmark-spreadsheet"></i> Export ke Spreadsheet</button>
  </div></section>
  <div class="kpi-grid k3 rm-k" style="margin-top:1.25rem">
    ${kpi('', 'Total Tambal Sulam', 'bi-tools', `<span style="font-size:22px;color:var(--em)">${Rp(ts.total)}</span>`, ts.items.length + ' barang terkirim')}
    ${kpi('', 'Total Proyek', 'bi-building', `<span style="font-size:22px;color:var(--primary-deep)">${Rp(pr.total)}</span>`, pr.items.length + ' barang terkirim')}
    ${kpi('dark', 'Grand total (TS + Proyek)', 'bi-wallet2', `<span style="font-size:22px">${Rp(ts.total + pr.total)}</span>`, (ts.items.length + pr.items.length) + ' total item')}
  </div>
  <div class="two wide">
    <div class="grp grp-ts"><div class="grp-h"><span>REKAPAN TAMBAL SULAM<small class="grp-sub">${E(per(ts))}</small></span><span class="pill">${ts.items.length} item</span></div><div class="grp-b">${tbl(ts)}</div></div>
    <div class="grp grp-pr"><div class="grp-h"><span>REKAPAN PROYEK<small class="grp-sub">${E(per(pr))}</small></span><span class="pill">${pr.items.length} item</span></div><div class="grp-b">
      <div class="form-grid mb2">
        <div><label class="lbl" for="rmPat">Tgl mulai Proyek (M-1)</label>${isStaff() ? `<input type="date" class="inp" id="rmPat" value="${E(S.rmat.patokanPR)}" onchange="rekapMatPatokan(this.value)">` : `<div class="inp" id="rmPat" style="display:flex;align-items:center;background:var(--surface-2)">${S.rmat.patokanPR ? fdate(S.rmat.patokanPR) : '\u2013'}</div>`}</div>
        <div><span class="lbl">Sortir minggu (Proyek)</span>${sortir('PR', pr)}</div>
      </div>
      <div class="row-f between wrap gap1 mb2"><span class="pill pill-brand">${E(per(pr))}</span><button class="btn-x btn-o btn-sm" onclick="navigateTo('rekapmat',{modePR:S.rmat.modeTS,startPR:S.rmat.startTS})"><i class="bi bi-arrow-repeat"></i> Samakan dgn minggu TS</button></div>
      ${tbl(pr)}</div></div>
  </div>`;
};
function rekapMatExport(btn) {
  return act(btn, async () => { toast('Membuat spreadsheet di Google Drive\u2026'); const r = await apiM('rekap.exportMat', { startTS: S.rmat.startTS, startPR: S.rmat.startPR, allTS: S.rmat.ts.all, allPR: S.rmat.pr.all }); showExport(r.data, 'Buka Spreadsheet'); });
}
async function rekapMatPatokan(tgl) {
  if (!tgl) return;
  await act(null, async () => { const r = await apiM('keu.patokan', { Bagian: 'Proyek', Tanggal: tgl }); toast(r.message, 'ok'); navigateTo('rekapmat'); });
}

function stackTables(root) {
  $$('table.tbl:not(.mxt):not(.nostk):not([data-stk])', root || document).forEach(t => {
    const heads = $$('thead tr:last-child th', t).map(th => th.textContent.trim());
    if (!heads.length) return;
    t.setAttribute('data-stk', '1'); t.classList.add('stk');
    $$('tbody tr', t).forEach(tr => {
      let col = 0;
      Array.from(tr.children).forEach(td => {
        const span = Number(td.getAttribute('colspan') || 1);
        if (span === 1 && heads[col]) td.setAttribute('data-label', heads[col]);
        col += span;
      });
    });
  });
}
(function () {
  const box = document.getElementById('app-container');
  let pending = false;
  new MutationObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; stackTables(box); }); }).observe(box, { childList: true, subtree: true });
  const mb = document.getElementById('appModalBody');
  if (mb) new MutationObserver(() => stackTables(mb)).observe(mb, { childList: true, subtree: true });
})();

(function pullToRefresh() {
  const TH = 70, MAX = 110, MIN_SPIN = 650;
  let y0 = null, dy = 0, busy = false;
  const ind = document.createElement('div');
  ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = '<div class="ptr-c"><span class="ptr-ring"></span><span class="ptr-spin"></span><i class="bi bi-arrow-down ptr-ic"></i><i class="bi bi-check-lg ptr-ok"></i></div>';
  document.body.appendChild(ind);
  const blocked = t => {
    if (!AppState.token || busy || document.body.classList.contains('modal-open') || document.body.classList.contains('drawer-open')) return true;
    if (window.scrollY > 0) return true;
    for (let el = t; el && el !== document.body; el = el.parentElement) if (el.scrollTop > 0) return true;
    return false;
  };
  const show = d => {
    const p = Math.min(d, MAX), k = Math.min(1, d / TH);
    ind.classList.add('pull');
    ind.style.setProperty('--y', (p - 56) + 'px'); ind.style.setProperty('--p', k.toFixed(3)); ind.style.opacity = Math.min(1, k * 1.4);
    ind.classList.toggle('ready', d >= TH);
  };
  const hide = () => { ind.classList.remove('pull', 'ready', 'spin', 'done'); ind.style.removeProperty('--y'); ind.style.removeProperty('--p'); ind.style.opacity = ''; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.addEventListener('touchstart', e => { if (e.touches.length !== 1 || blocked(e.target)) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  window.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy <= 0 || window.scrollY > 0) { y0 = null; hide(); return; } show(dy * 0.55); }, { passive: true });
  window.addEventListener('touchend', async () => {
    if (y0 === null) return;
    const go = dy * 0.55 >= TH; y0 = null;
    if (!go) return hide();
    busy = true;
    ind.classList.remove('pull', 'ready'); ind.classList.add('spin');
    ind.style.setProperty('--y', (TH - 50) + 'px'); ind.style.opacity = 1;
    const t0 = Date.now();
    let ok = false;
    try { ok = (await navigateTo(AppState.page, { force: true })) === true; } catch (e) { ok = false; }
    const left = MIN_SPIN - (Date.now() - t0); if (left > 0) await wait(left);
    if (ok) { ind.classList.remove('spin'); ind.classList.add('done'); await wait(520); }
    ind.style.setProperty('--y', '-56px'); ind.style.opacity = 0; await wait(220);
    hide(); busy = false;
    if (ok) toast('Data diperbarui.', 'ok');
    else toast('Gagal memperbarui: ' + (AppState.lastNavError || 'server tidak merespons') + ' Data yang tampil adalah data terakhir.', 'err');
  });
})();

document.addEventListener('pointerdown', e => { AppState.lastTap = e.target; AppState.lastAct = Date.now(); }, true);
document.addEventListener('keydown', () => { AppState.lastAct = Date.now(); }, true);
['input', 'change', 'click'].forEach(ev => document.addEventListener(ev, e => { const c = document.getElementById('app-container'); if (c && c.contains(e.target)) AppState.uiDirty = true; }, true));

const IMP = {
  program: {
    judul: 'Program Kerja', page: 'program',
    kolom: [['bagian', 'Bagian', 'WAJIB \u00B7 Tambal Sulam / Proyek'], ['lokasi', 'Sub-bagian / Lokasi', 'boleh kosong \u00B7 TS: sub-bagian resmi, Proyek: bebas'], ['nama', 'Nama Program', 'WAJIB'], ['pekerja', 'Nama Pekerja', 'boleh kosong \u00B7 mis. Pak Joko CS (3 orang)'], ['status', 'Status', 'boleh kosong \u00B7 Direncanakan / Proses / Selesai']],
    contoh: [['Tambal Sulam', 'Perairan', 'Perbaikan pipa bocor asrama', 'Pak Joko CS (3 orang)', 'Proses'], ['Proyek', 'Gedung Serbaguna', 'Pemasangan kusen jendela', '', 'Direncanakan']],
    alias: { bagian: ['bagian'], lokasi: ['subbagian', 'lokasi', 'subbagianlokasi', 'sublokasi'], nama: ['namaprogram', 'program', 'uraian', 'programkerja'], pekerja: ['namapekerja', 'pekerja', 'jumlahpekerja', 'penanggungjawab', 'mandor'], status: ['status'] }
  },
  katalog: {
    judul: 'Katalog Toko', page: 'material',
    kolom: [['nama', 'Nama Barang', 'WAJIB'], ['satuan', 'Satuan', 'boleh kosong \u00B7 mis. Sak, Batang, Kg'], ['harga', 'Harga', 'boleh kosong \u00B7 mis. 62000 atau Rp 62.000'], ['pemilik', 'Pemilik Toko', 'boleh kosong \u00B7 otomatis tokokuk']],
    contoh: [['Semen Gresik 50 Kg', 'Sak', '62000', 'tokokuk'], ['Besi Beton 10mm', 'Batang', '82000', '']],
    alias: { nama: ['namabarang', 'barang', 'material', 'namamaterial', 'item'], satuan: ['satuan', 'unit'], harga: ['harga', 'hargasatuan', 'price'], pemilik: ['pemiliktoko', 'pemilik', 'toko'] }
  },
  karyawan: {
    judul: 'Data Karyawan', page: 'karyawan',
    kolom: [['nama', 'Nama', 'WAJIB'], ['bagian', 'Bagian', 'WAJIB \u00B7 Tambal Sulam / Proyek'], ['lokasi', 'Sub-bagian', 'boleh kosong \u00B7 TS: dari daftar resmi'], ['jabatan', 'Jabatan', 'boleh kosong \u00B7 Mandor / Kepala Tukang / Tukang / Kuli'], ['status', 'Status', 'boleh kosong \u00B7 Aktif / Nonaktif']],
    contoh: [['Ahmad Fauzi', 'Tambal Sulam', 'Perairan', 'Tukang', 'Aktif'], ['Slamet Riyadi', 'Proyek', 'Gedung Serbaguna', 'Kuli', '']],
    alias: { nama: ['nama', 'namalengkap', 'namakaryawan', 'namapekerja'], bagian: ['bagian'], lokasi: ['subbagian', 'lokasi', 'sublokasi'], jabatan: ['jabatan', 'posisi'], status: ['status'] }
  }
};
IMP.keuangan = {
  judul: 'Laporan Keuangan', page: 'keuangan',
  kolom: [['bagian', 'Bagian', 'WAJIB \u00B7 Tambal Sulam / Proyek'], ['minggu', 'Minggu ke-', 'WAJIB* \u00B7 angka, mis. 27 (atau isi Tanggal)'], ['tanggal', 'Tanggal', 'boleh kosong \u00B7 mis. 2026-10-03 atau 03/10/2026'], ['nominal', 'Nominal', 'WAJIB \u00B7 mis. 16620800 atau Rp 16.620.800']],
  contoh: [['Tambal Sulam', '27', '', '16620800'], ['Proyek', '11', '', 'Rp 25.000.000']],
  alias: { bagian: ['bagian'], minggu: ['mingguke', 'minggu', 'week', 'mke'], tanggal: ['tanggal', 'tglmulai', 'tgl', 'date'], nominal: ['nominal', 'nominalanggaran', 'anggaran', 'jumlah', 'total', 'nominalrp'] }
};
const impKey = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function impParse(text) {
  const t = String(text || '').replace(/^\uFEFF/, '');
  const sep = t.indexOf('\t') >= 0 ? '\t' : (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length ? ';' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === '') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
function impMap(type, grid) {
  const sp = IMP[type]; if (!grid.length) return { rows: [], header: false };
  const first = grid[0].map(impKey), idx = {};
  Object.keys(sp.alias).forEach(k => { const j = first.findIndex(h => sp.alias[k].indexOf(h) >= 0); if (j >= 0) idx[k] = j; });
  const header = Object.keys(idx).length >= 2;
  const body = header ? grid.slice(1) : grid;
  const rows = body.map(r => { const o = {}; sp.kolom.forEach((c, n) => { const j = header ? idx[c[0]] : n; o[c[0]] = j === undefined ? '' : String(r[j] === undefined ? '' : r[j]).trim(); }); return o; });
  return { rows: rows, header: header };
}
function importOpen(type) {
  const sp = IMP[type]; S.imp = { type: type, rows: [], res: null };
  openModal({
    title: 'Impor ' + sp.judul + ' dari Excel', size: 'xl',
    body: `<div class="imp-cols"><b>Urutan kolom</b> <span class="muted">(baris judul boleh ikut disalin \u00B7 kolom "boleh kosong" bisa dilengkapi nanti lewat aplikasi)</span><div class="imp-chips">${sp.kolom.map((c, i) => `<span class="imp-chip"><em>${i + 1}</em>${E(c[1])}<small>${E(c[2])}</small></span>`).join('')}</div></div>
      <div class="row-f gap1 wrap mb2"><button type="button" class="btn-x btn-o btn-sm" onclick="impTemplate()"><i class="bi bi-download"></i> Unduh template Excel</button><label class="btn-x btn-o btn-sm" style="cursor:pointer"><i class="bi bi-folder2-open"></i> Pilih file Excel / CSV<input type="file" id="impFile" accept=".xlsx,.xls,.csv,.txt" hidden onchange="impFile(this)"></label></div>
      <label class="lbl" for="impText">Atau tempel langsung dari Excel</label>
      <textarea class="inp" id="impText" data-type="${type}" rows="4" placeholder="Di Excel: blok tabelnya \u2192 Ctrl+C. Lalu klik di sini \u2192 Ctrl+V" oninput="impQueue()"></textarea>
      <div id="impPrev" class="mt2"></div>`,
    footer: `<button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-p" id="impGo" disabled onclick="impSave(this)"><i class="bi bi-cloud-upload"></i> Simpan</button>`
  });
}
let impTimer = null;
function impQueue() { clearTimeout(impTimer); impTimer = setTimeout(() => impCheck(impParse($('#impText').value)), 450); }
async function impCheck(grid) {
  const tp = ($('#impText') || {}).dataset ? $('#impText').dataset.type : '';
  if (!tp) return;
  if (!S.imp || S.imp.type !== tp) S.imp = { type: tp, rows: [], res: null };
  const sp = IMP[S.imp.type], m = impMap(S.imp.type, grid), box = $('#impPrev'); if (!box) return;
  S.imp.rows = m.rows; S.imp.res = null; $('#impGo').disabled = true;
  if (!m.rows.length) { box.innerHTML = ''; return; }
  if (m.rows.length > 500) { box.innerHTML = `<div class="err-box">Terlalu banyak: ${m.rows.length} baris. Maksimal 500 baris sekali impor.</div>`; return; }
  box.innerHTML = `<div class="muted"><span class="spin-sm"></span> Memeriksa ${m.rows.length} baris\u2026</div>`;
  try {
    const r = await apiM('import.check', { type: S.imp.type, rows: m.rows }, true);
    if (!$('#impPrev') || S.imp.rows !== m.rows) return;
    S.imp.res = r.data; impRender(m.header);
  } catch (e) { if ($('#impPrev')) box.innerHTML = `<div class="err-box">${E(e.message)}</div>`; }
}
function impRender(header) {
  const sp = IMP[S.imp.type], d = S.imp.res, sm = d.sum, onlyErr = $('#impOnlyErr') && $('#impOnlyErr').checked;
  const okN = sm.baru + sm.perbarui;
  const pill = st => ({ baru: '<span class="pill pill-ok">Baru</span>', perbarui: '<span class="pill pill-brand">Diperbarui</span>', sama: '<span class="pill pill-muted">Sudah ada</span>', error: '<span class="pill pill-bad">Bermasalah</span>' })[st];
  const rows = d.items.filter(r => !onlyErr || r.status === 'error');
  $('#impPrev').innerHTML = `<div class="imp-sum">${sm.baru ? `<span class="pill pill-ok">${sm.baru} baru</span>` : ''}${sm.perbarui ? `<span class="pill pill-brand">${sm.perbarui} diperbarui</span>` : ''}${sm.sama ? `<span class="pill pill-muted">${sm.sama} sudah ada (dilewati)</span>` : ''}${sm.error ? `<span class="pill pill-bad">${sm.error} bermasalah (dilewati)</span>` : ''}<span class="muted">dari ${sm.total} baris${header ? ' \u00B7 baris judul terdeteksi' : ''}</span>${sm.error ? `<label class="row-f gap1" style="margin-left:auto;cursor:pointer;font-size:13px"><input type="checkbox" class="check" id="impOnlyErr" ${onlyErr ? 'checked' : ''} onchange="impRender(${header})"> Hanya yang bermasalah</label>` : ''}</div>
    <div class="tbl-wrap imp-tbl"><table class="tbl tbl-slim nostk"><thead><tr><th>#</th><th>Hasil pemeriksaan</th>${sp.kolom.map(c => `<th>${E(c[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(r => {
      const src = S.imp.rows[r.no - 1];
      return `<tr class="imp-${r.status}"><td class="muted">${r.no}</td><td class="imp-res">${pill(r.status)}${r.pesan.map(x => `<span class="sub imp-err">${E(x)}</span>`).join('')}${r.catatan.map(x => `<span class="sub">${E(x)}</span>`).join('')}</td>${sp.kolom.map(c => `<td>${E(src[c[0]] || '')}</td>`).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
  const go = $('#impGo'); go.disabled = !okN;
  go.innerHTML = `<i class="bi bi-cloud-upload"></i> ${okN ? 'Simpan ' + okN + ' baris' : 'Tidak ada baris valid'}`;
}
async function impSave(btn) {
  const tp = $('#impText') && $('#impText').dataset.type;
  if (!S.imp || S.imp.type !== tp || !S.imp.res) return toast('Data berubah. Tempel ulang tabelnya lalu periksa kembali.', 'err');
  const sp = IMP[S.imp.type];
  return act(btn, async () => {
    const r = await apiM('import.save', { type: S.imp.type, rows: S.imp.rows });
    toast(r.message, 'ok'); closeModal();
    if (AppState.page === sp.page) navigateTo(sp.page, { force: true });
  });
}
function impLoadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; sc.onload = () => res(window.XLSX); sc.onerror = () => rej(new Error('Gagal memuat pembaca Excel. Periksa internet, atau simpan file sebagai CSV.')); document.head.appendChild(sc); });
}
async function impFile(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  try {
    let grid;
    if (/\.(csv|txt)$/i.test(f.name)) grid = impParse(await f.text());
    else { const X = await impLoadXLSX(); const wb = X.read(await f.arrayBuffer(), { type: 'array' }); grid = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).filter(r => r.some(c => String(c).trim() !== '')); }
    $('#impText').value = ''; impCheck(grid);
  } catch (e) { toast(e.message, 'err'); }
  inp.value = '';
}
async function impTemplate() {
  const sp = IMP[S.imp.type], head = sp.kolom.map(c => c[1]), data = [head], nama = 'Template Impor ' + sp.judul;
  try {
    const X = await impLoadXLSX(); const ws = X.utils.aoa_to_sheet(data); ws['!cols'] = sp.kolom.map(() => ({ wch: 26 }));
    const ex = X.utils.aoa_to_sheet([['Contoh pengisian (jangan disalin ke lembar Data)'], head].concat(sp.contoh)); ex['!cols'] = sp.kolom.map(() => ({ wch: 26 }));
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Data'); X.utils.book_append_sheet(wb, ex, 'Contoh'); X.writeFile(wb, nama + '.xlsx');
  } catch (e) {
    const csv = '\uFEFF' + data.map(r => r.map(c => /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = nama + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}

function urutGroups() {
  const rows = ((S.karyawan && S.karyawan.rows) || []).filter(k => k.Status === 'Aktif' && BAG_KARY.indexOf(k.Bagian) >= 0);
  const g = [], idx = {};
  rows.forEach(k => { const key = k.Bagian + '|' + (k.SubBagian || ''); if (!(key in idx)) { idx[key] = g.length; g.push({ key: key, bagian: k.Bagian, sub: k.SubBagian || '', rows: [] }); } g[idx[key]].rows.push(k); });
  return g;
}
function urutOpen(key) {
  const g = urutGroups();
  if (!g.length) return toast('Belum ada karyawan aktif.', '');
  const cur = g.find(x => x.key === key) || g[0];
  S.urut = { key: cur.key, reset: false };
  openModal({
    title: 'Atur urutan karyawan', size: 'lg',
    body: `<label class="lbl" for="urG">Sub-bagian</label><select class="inp mb2" id="urG" onchange="urutOpen(this.value)">${g.map(x => `<option value="${E(x.key)}"${x.key === cur.key ? ' selected' : ''}>${E(x.bagian + ' \u00B7 ' + (x.sub || '(Tanpa sub-bagian)'))} (${x.rows.length})</option>`).join('')}</select>
      <p class="help" style="margin:0 0 .5rem">Seret <b>\u22EE\u22EE</b> atau pakai tombol \u25B2\u25BC untuk memindah posisi. Urutan ini dipakai di Data Karyawan dan Presensi.</p>
      <ol class="ur-list" id="urList">${cur.rows.map(k => `<li class="ur-item" data-id="${E(k.ID)}"><span class="ur-h" onpointerdown="urutDrag(event,this.closest('li'))" title="Seret untuk memindah" aria-hidden="true">\u22EE\u22EE</span><span class="ur-no"></span><span class="ur-nm"><b>${E(k.Nama)}</b><small>${E(k.Jabatan || '\u2013')}</small></span><span class="ur-btn"><button type="button" class="btn-x btn-o btn-sm" onclick="urutMove(this,-1)" aria-label="Naikkan ${E(k.Nama)}">\u25B2</button><button type="button" class="btn-x btn-o btn-sm" onclick="urutMove(this,1)" aria-label="Turunkan ${E(k.Nama)}">\u25BC</button></span></li>`).join('')}</ol>`,
    footer: `<button class="btn-x btn-o" onclick="urutJabatan()"><i class="bi bi-sort-down"></i> Kembalikan ke urutan jabatan</button><button class="btn-x btn-o" data-bs-dismiss="modal">Batal</button><button class="btn-x btn-p" onclick="urutSave(this)"><i class="bi bi-check2"></i> Simpan urutan</button>`
  });
  urutNum();
}
function urutNum() { $$('#urList .ur-item').forEach((li, i) => { li.querySelector('.ur-no').textContent = (i + 1) + '.'; }); }
function urutMove(btn, d) {
  const li = btn.closest('li'), box = li.parentElement;
  if (d < 0 && li.previousElementSibling) box.insertBefore(li, li.previousElementSibling);
  if (d > 0 && li.nextElementSibling) box.insertBefore(li.nextElementSibling, li);
  S.urut.reset = false; urutNum(); btn.focus();
  li.classList.add('ur-moved'); setTimeout(() => li.classList.remove('ur-moved'), 350);
}
function urutDrag(e, li) {
  if (!li) return;
  e.preventDefault();
  const box = li.parentElement; li.classList.add('ur-drag');
  try { e.target.setPointerCapture(e.pointerId); } catch (x) { }
  const move = ev => {
    const y = ev.clientY; let before = null;
    for (const sb of [...box.children]) { if (sb === li) continue; const r = sb.getBoundingClientRect(); if (y < r.top + r.height / 2) { before = sb; break; } }
    if (before !== li.nextElementSibling) { box.insertBefore(li, before); urutNum(); }
    const bx = box.closest('.modal-body'); if (bx) { const r = bx.getBoundingClientRect(); if (y < r.top + 40) bx.scrollTop -= 12; else if (y > r.bottom - 40) bx.scrollTop += 12; }
  };
  const up = () => { li.classList.remove('ur-drag'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); S.urut.reset = false; urutNum(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
function urutJabatan() {
  const J = ['Mandor', 'Kepala Tukang', 'Tukang', 'Kuli'], box = $('#urList');
  const rk = li => { const r = (S.karyawan.rows || []).find(k => k.ID === li.dataset.id) || {}; const i = J.indexOf(r.Jabatan); return [i >= 0 ? i : 9, String(r.Nama || '')]; };
  [...box.children].sort((a, b) => { const x = rk(a), y = rk(b); return x[0] - y[0] || x[1].localeCompare(y[1]); }).forEach(li => box.appendChild(li));
  S.urut.reset = true; urutNum(); toast('Urutan dikembalikan sesuai jabatan. Klik Simpan untuk menerapkan.', '');
}
async function urutSave(btn) {
  const ids = $$('#urList .ur-item').map(li => li.dataset.id);
  return act(btn, async () => {
    const r = await apiM('karyawan.order', { ids: ids, reset: !!S.urut.reset });
    toast(r.message, 'ok'); closeModal(); navigateTo('karyawan', { force: true });
  });
}
