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
const READ_ACT = new Set(['dash.get', 'karyawan.list', 'absensi.get', 'rekap.absensi', 'rekap.bayar', 'rekap.list', 'izin.list', 'sub.list', 'program.list', 'katalog.list', 'material.list', 'piket.list', 'piket.staff', 'keu.list', 'armada.list', 'admin.users', 'admin.audit', 'admin.config', 'pilihan.list', 'minggu.info', 'mat.rekap']);
const DC = { mem: {}, mode: 'net', changed: false, bg: false, user: '' };
const DC_MISS = new Error('cache-miss');
const dcKey = (a, p) => a + '|' + JSON.stringify(p || {});
function dcStore() { try { return localStorage.getItem('simop-rt') ? localStorage : sessionStorage; } catch (e) { return sessionStorage; } }
const clone = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
function dcLoad() {
  DC.user = AppState.user ? AppState.user.username + ':' + AppState.user.role : '';
  try { DC.mem = JSON.parse(dcStore().getItem('simop-dc:' + DC.user) || '{}') || {}; } catch (e) { DC.mem = {}; }
}
let dcTimer = null;
function dcSave() {
  clearTimeout(dcTimer);
  dcTimer = setTimeout(() => {
    if (!DC.user) return;
    for (let tries = 0; tries < 6; tries++) {
      try { dcStore().setItem('simop-dc:' + DC.user, JSON.stringify(DC.mem)); return; }
      catch (e) {
        const ks = Object.keys(DC.mem).sort((a, b) => DC.mem[a].t - DC.mem[b].t);
        if (!ks.length) return;
        ks.slice(0, Math.ceil(ks.length / 2)).forEach(k => delete DC.mem[k]);
      }
    }
  }, 300);
}
function dcClear() {
  DC.mem = {};
  [localStorage, sessionStorage].forEach(st => { try { Object.keys(st).filter(k => k.indexOf('simop-dc:') === 0).forEach(k => st.removeItem(k)); } catch (e) { } });
}
function dcPatch(action, payload, fn) { const h = DC.mem[dcKey(action, payload)]; if (h) { try { fn(h.d); dcSave(); } catch (e) { } } }
function dcPeek(action, payload) { const h = DC.mem[dcKey(action, payload)]; return h ? clone(h.d) : null; }
function dcFresh(action, payload, onChange) {
  const h = DC.mem[dcKey(action, payload)], old = h ? JSON.stringify(h.d) : null;
  return apiM(action, payload, true, { silent: true }).then(r => { if (JSON.stringify(r.data) !== old && onChange) { try { onChange(clone(r.data)); } catch (e) { } } return r.data; }).catch(() => null);
}
function apiM(action, payload, quiet, o) {
  const rd = READ_ACT.has(action), key = rd ? dcKey(action, payload) : '';
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
  const isFile = action === 'file.get';
  return gasPost('api', [AppState.token, action, payload || {}], { prio: DC.bg ? 2 : (isFile || (o && o.silent)) ? 1 : 0, idem: rd || isFile, track: !isFile && !(o && o.silent), bg: DC.bg }).then(res => {
    if (!q) loader(-1);
    if (res && res.success) {
      if (rd) {
        const js = JSON.stringify(res.data === undefined ? null : res.data), old = DC.mem[key];
        if (!old || JSON.stringify(old.d) !== js) DC.changed = true;
        DC.mem[key] = { t: Date.now(), d: JSON.parse(js) }; dcSave();
      } else if (action !== 'file.get') { AppState.lastWrite = Date.now(); AppState.optRow = null; }
      return { data: res.data, message: res.message };
    }
    if (optRow) optRow.classList.remove('opt-out');
    if (res && res.code === 'AUTH') { forceLogout(res.message); throw new Error(res.message); }
    if (!rd && action !== 'file.get' && res && res.success === false) AppState.needNet = true;
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
  AppState.optRow = t && t.closest ? t.closest('tr, .li, .prog, .pk-row, .day-item, .kar-row') : null;
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
async function compressImage(file) {
  if (file.type.slice(0, 6) !== 'image/') throw new Error('Pilih berkas gambar (JPG/PNG).');
  const im = await loadImg(file), w0 = im.naturalWidth, h0 = im.naturalHeight;
  let max = 1280, q = 0.82, out = '';
  for (let i = 0; i < 7; i++) {
    const sc = Math.min(1, max / Math.max(w0, h0)), c = document.createElement('canvas');
    c.width = Math.round(w0 * sc); c.height = Math.round(h0 * sc);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', q);
    if (out.length * 0.75 <= 950000) break;
    q = Math.max(0.45, q - 0.1); max = Math.round(max * 0.85);
  }
  const b64 = out.split(',')[1];
  if (b64.length > 1750000) throw new Error('Foto masih terlalu besar setelah dikompres. Coba foto lain.');
  return { data: b64, mime: 'image/jpeg', kb: Math.round(b64.length * 0.75 / 1024), preview: out };
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
  const navBtn = it => `<button class="bn-item" data-nav="${it.id}" onclick="navigateTo('${it.id}')"><i class="bi ${it.icon}"></i><span>${E(it.label.replace('Pemesanan ', '').replace('Pembayaran Material', 'Bayar').replace('Presensi Harian', 'Presensi'))}</span></button>`;
  if (isStaff()) {
    const pick = ['dashboard', 'presensi', 'material'].filter(p => have.has(p)).map(id => m.find(x => x.id === id));
    $('#bottomNav').innerHTML = pick.slice(0, 2).map(navBtn).join('') + '<button class="bn-item bn-cam" onclick="cameraStart()" aria-label="Ambil foto program kerja"><span class="bn-cam-c"><i class="bi bi-camera-fill"></i></span><span>Foto</span></button>' + pick.slice(2).map(navBtn).join('') + '<button class="bn-item" onclick="openDrawer()"><i class="bi bi-list"></i><span>Menu</span></button>';
  } else
  $('#bottomNav').innerHTML = bn.map(it => `<button class="bn-item" data-nav="${it.id}" onclick="navigateTo('${it.id}')"><i class="bi ${it.icon}"></i><span>${E(it.label.replace('Pemesanan ', '').replace('Pembayaran Material', 'Bayar').replace('Presensi Harian', 'Presensi'))}</span></button>`).join('') + `<button class="bn-item" onclick="openDrawer()"><i class="bi bi-list"></i><span>Menu</span></button>`;
  $('#tbActions').innerHTML = isStaff() ? `<button class="btn-x btn-g btn-sm hide-m" onclick="orderForm()"><i class="bi bi-plus-lg"></i> Ajukan Material</button><button class="btn-x btn-p btn-sm hide-m" onclick="navigateTo('presensi')"><i class="bi bi-person-check"></i> Input Presensi</button>` : '';
  renderCutoff();
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
}
function isTyping() {
  const c = document.getElementById('app-container'), a = document.activeElement;
  if (c && a && c.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  return !!(c && [...c.querySelectorAll('input[type="search"]')].some(i => i.value));
}
function uiBusy() {
  return (AppState.uiDirty && Date.now() - (AppState.lastAct || 0) < 1500) || isTyping() || document.body.classList.contains('modal-open') || document.body.classList.contains('drawer-open') ||
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
    if (shown && DC.oldest < 4000) return true;
  }
  const onScreen = shown;
  if (!onScreen) c.innerHTML = skeleton();
  const snap = Object.assign({}, S);
  DC.changed = false;
  try {
    const r = await PAGES[id](opts.force ? (AppState.pageOpts || {}) : opts);
    if (seq !== AppState.seq) return true;
    if (!onScreen || keep) paintPage(r, onScreen);
    else if (DC.changed && !uiBusy()) paintPage(r, true);
    else { if (DC.changed) AppState.pending = true; Object.keys(S).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } }); }
    return true;
  } catch (e) {
    if (seq !== AppState.seq || !AppState.token) return false;
    if (onScreen) { Object.keys(S).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } }); setSyncError(e.message); }
    else c.innerHTML = errBox(e.message);
    AppState.lastNavError = e.message;
    return false;
  }
}
/** Periksa data terbaru diam-diam (dipanggil berkala & saat aplikasi kembali dibuka) */
async function refreshQuiet() {
  if (!AppState.token || !AppState.page || uiBusy() || NET.inflight > 0 || DC.bg) return;
  if (Date.now() - (AppState.lastWrite || 0) < 4000) return;
  const id = AppState.page, seq = AppState.seq, snap = Object.assign({}, S);
  DC.changed = false;
  try {
    const r = await PAGES[id](AppState.pageOpts || {});
    if (seq !== AppState.seq) return;
    if (DC.changed && !uiBusy()) paintPage(r, true);
    else { if (DC.changed) AppState.pending = true; Object.keys(S).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } }); }
  } catch (e) {
    if (seq === AppState.seq) { Object.keys(S).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } }); setSyncError(e.message); }
  }
}
setInterval(() => { if (document.visibilityState === 'visible') refreshQuiet(); }, 90000);
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
  if (have.indexOf('presensi') >= 0 && AppState.page !== 'presensi') { DC.bg = true; try { await api('absensi.get', { tanggal: todayStr() }); } catch (e) { } finally { DC.bg = false; } }
  for (const id of ids) {
    if (!AppState.token || id === AppState.page || id === 'presensi') continue;
    if (Date.now() - (AppState.lastWrite || 0) < 4000) await new Promise(r => setTimeout(r, 1500));
    for (let w = 0; w < 40 && (NET.queue[0].length || (NET.inflight > 0 && !DC.bg) || Date.now() - (AppState.lastAct || 0) < 1500); w++) await new Promise(r => setTimeout(r, 400));
    if (!AppState.token) return;
    const seq0 = AppState.seq, snap = Object.assign({}, S), exp = S.expRange ? Object.assign({}, S.expRange) : null;
    DC.bg = true;
    try { await PAGES[id]({}); } catch (e) { } finally { DC.bg = false; }
    if (AppState.page !== id) {
      if (AppState.seq === seq0) Object.keys(S).forEach(k => { if (S[k] !== snap[k]) { if (k in snap) S[k] = snap[k]; else delete S[k]; } });
      if (exp) S.expRange = exp; else delete S.expRange;
    }
    await new Promise(r => setTimeout(r, 60));
  }
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
function applySession(d) {
  AppState.token = d.token; AppState.user = d.user; AppState.menu = d.menu; AppState.config = d.config;
  saveSessInfo(d); dcLoad();
  if (d.boot) { Object.keys(d.boot).forEach(k => { DC.mem[k] = { t: Date.now(), d: d.boot[k] }; }); dcSave(); }
  document.body.classList.remove('auth-mode'); renderShell();
  navigateTo('dashboard').then(() => setTimeout(() => { prefetchMenus().catch(() => { }); }, 700));
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
  const fd = e.target.closest('[data-fdel]');
  if (fd) { e.stopPropagation(); deleteSlot(fd.dataset.pid, fd.dataset.slot, fd.dataset.lbl, fd.closest('.slot')); return; }
  const up = e.target.closest('[data-upload]');
  if (up) { e.stopPropagation(); uploadSlot(up.dataset.pid, up.dataset.slot, up.closest('.slot') || up); return; }
  const pv = e.target.closest('[data-preview]');
  if (pv) previewFile(pv.dataset.preview, pv.dataset.title);
});
function loadThumbs(root) {
  const els = $$('[data-thumb]', root || document).filter(x => !x.dataset.done); let i = 0;
  const one = async () => {
    while (i < els.length) {
      const el = els[i++]; el.dataset.done = 1; const url = el.dataset.thumb;
      try {
        const d = AppState.img[url] || (AppState.img[url] = (await api('file.get', { url: url, thumb: 1 }, true)).dataUrl);
        el.insertAdjacentHTML('afterbegin', `<img alt="${E(el.dataset.title || 'Foto')}" src="${d}">`);
      } catch (e) { el.insertAdjacentHTML('afterbegin', '<div class="empty" style="padding:.5rem"><i class="bi bi-image-alt" style="font-size:20px"></i></div>'); }
      el.classList.remove('loading');
    }
  };
  one(); one();
}

const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam'; };
const hk = x => String(x).replace('.', ',');

PAGES.dashboard = async function () {
  const d = await api('dash.get');
  S.dash = { d: d, bagian: 'Semua' }; S.dashProg = S.dashProg || 'ini';
  if (d.role === 'toko') return dashToko(d);
  return { html: dashStaff(d), init: c => loadThumbs(c) };
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

function dashStaff(d) {
  const p = d.presensi, pr = d.periode;
  const keluar = d.armada.find(a => a.Status !== 'Ada');
  const kosong = d.subKosong;
  const shiftLbl = p.shiftAktif === 'pagi' ? 'Shift Pagi' : p.shiftAktif === 'siang' ? 'Shift Siang' : 'Total hadir';
  const head = `
  <div class="page-head">
    <div>
      <div class="row-f gap1 wrap" style="margin-bottom:.5rem"><span class="pill pill-ok"><i class="bi bi-database-check"></i> Database Gontor 3 aktif</span><span class="pill pill-info"><i class="bi bi-calendar-range"></i> Siklus ${fdate(pr.start)} \u2013 ${fdate(pr.end)}</span></div>
      <h1>Ahlan wa Sahlan, ${E(AppState.user.nama)}</h1>
      <p>Pusat pengawasan operasional lapangan, presensi tukang, dan administrasi logistik harian.</p>
      <div class="row-f gap1 wrap hide-m mt2">
        <button class="btn-x btn-o btn-sm" onclick="navigateTo('presensi')"><i class="bi bi-person-check"></i> Catat presensi</button>
        <button class="btn-x btn-o btn-sm" onclick="orderForm()"><i class="bi bi-cart-plus"></i> Pesan material</button>
        <button class="btn-x btn-p btn-sm" onclick="programForm()"><i class="bi bi-plus-lg"></i> Program kerja</button>
      </div>
    </div>
    <aside class="act-mini" aria-label="Log aktivitas">
      <div class="act-mini-h"><b><i class="bi bi-activity"></i> Log aktivitas</b><select class="inp" id="actF" aria-label="Filter waktu log" onchange="S.actF=this.value;paintAct()">${[['hari', 'Hari ini'], ['7', '7 hari'], ['30', '30 hari'], ['semua', 'Semua']].map(o => `<option value="${o[0]}"${(S.actF || 'hari') === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      <div id="actList" class="act-mini-b">${aktivitasHtml(filterAct(d.aktivitas))}</div>
    </aside>
  </div>
  <div class="quick only-m" aria-label="Aksi cepat">
    <button onclick="navigateTo('presensi')"><span class="ico g"><i class="bi bi-person-check"></i></span>+ Presensi</button>
    <button onclick="orderForm()"><span class="ico"><i class="bi bi-cart-plus"></i></span>+ Pesan</button>
    <button onclick="programForm()"><span class="ico w"><i class="bi bi-kanban"></i></span>+ Program</button>
    <button onclick="navigateTo('rekapmat')"><span class="ico r"><i class="bi bi-file-earmark-spreadsheet"></i></span>Rekapan</button>
  </div>`;
  const kpis = `<div class="kpi-grid">
    ${kpi('green', shiftLbl + ' hari ini', 'bi-arrow-up-right', `${p.utama}<small>/${p.total}</small>`, `Pagi: ${p.pagi} | Siang: ${p.siang}`, `<div class="kpi-s">${p.izin} izin resmi \u00B7 ${p.ghoib} ghoib${p.belumInput ? ' \u00B7 ' + p.belumInput + ' belum diinput' : ''}</div>`)}
    ${kpi('', 'Piket staf hari ini', 'bi-clipboard-check', d.piket.length, d.piket.length ? E(d.piket.slice(0, 3).map(x => x.StaffNama.replace(/^Ust\.\s{0,}/, '')).join(', ')) : 'Belum dijadwalkan')}
    ${kpi('', 'Status armada', 'bi-truck', `${d.armadaSiaga}<small>/${d.armada.length}</small>`, keluar ? E(keluar.Kendaraan + ': ' + (keluar.Tujuan || 'sedang digunakan')) : 'Semua armada siaga')}
    ${kpi('', 'Tagihan Toko KUK', 'bi-receipt', `<span style="font-size:22px">${Rp(d.tagihan.total)}</span>`, `${d.tagihan.nota} nota menunggu`)}
    ${kpi(kosong.length ? 'warn' : '', 'Tambal Sulam kosong', 'bi-exclamation-triangle', kosong.length, kosong.length ? E(kosong.slice(0, 2).map(x => x.Nama.replace(/\s*\(.*\)/, '')).join(', ')) : 'Semua sub-bagian terisi')}
  </div>`;
  const banner = kosong.length ? `<div class="banner" role="alert"><i class="bi bi-exclamation-triangle-fill"></i><div class="grow"><b>${kosong.length} sub-bagian Tambal Sulam belum mengisi program kerja</b><div class="t2">${E(kosong.map(x => x.Nama).join(', '))} belum menetapkan alokasi tenaga kerja dan material.</div></div><button class="btn-x btn-w btn-sm" onclick="programKosong()">Tetapkan sekarang</button></div>` : '';
  const izinTbl = (() => {
    const grp = (st, cls) => { const nm = d.izinList.filter(x => x.status === st).map(x => x.nama); return `<div class="nm-grp"><span class="pill pill-${cls}">${st} (${nm.length})</span><div class="nm-list">${nm.length ? nm.map(n => `<span>${E(n)}</span>`).join('') : '<span class="muted">\u2013</span>'}</div></div>`; };
    return `<div id="tbIzinHari">${grp('Ghoib', 'bad')}${grp('Izin', 'warn')}</div>`;
  })();
  const progGroup = bagian => dashProgGroupHtml(bagian);
  const matGroup = bagian => `<div class="grp grp-${bagian === 'Tambal Sulam' ? 'ts' : 'pr'}" id="dmg_${bagian.replace(/\s/g, '')}">${dashMatInner(bagian)}</div>`;
  const piket = d.piket.map(x => `<div class="li"><span class="avatar">${E(initials(x.StaffNama))}</span><div class="grow"><div class="t">${E(x.StaffNama)}</div></div></div>`).join('') || emptyBox('Belum ada jadwal piket', 'Atur di menu Piket Staff.');
  const keuCard = k => `<div class="li" style="flex-direction:column;align-items:stretch;gap:.5rem"><div class="row-f between">${badge(k.bagian, k.bagian === 'Tambal Sulam' ? 'ts' : 'brand')}<b class="num">${Rp(k.total)}</b></div><div class="row-f between" style="font-size:12px"><span class="muted">Minggu terakhir${k.terakhir ? ' (M-' + k.terakhir.mingguKe + ')' : ''}</span><b class="num">${k.terakhir ? Rp(k.terakhir.nominal) : '\u2013'}</b></div><div class="muted" style="font-size:12px">Rekapitulasi Minggu ke-${k.dari || 0} s.d. Minggu ke-${k.ke || 0}</div></div>`;
  const ins = d.insights.length ? `<section class="card-x"><div class="card-h" style="margin-bottom:.5rem"><div class="row-f gap2"><div class="ico"><i class="bi bi-stars"></i></div><div><h2>Ringkasan hari ini</h2><p>Dihitung otomatis dari data presensi, material, dan armada.</p></div></div></div><ul style="margin:0;padding-left:1.1rem;display:grid;gap:.375rem">${d.insights.map(t => `<li>${E(t)}</li>`).join('')}</ul></section>` : '';
  return head + kpis + banner + `
  <div class="stack">
    ${ins}
    <section class="card-x">
      <div class="card-h"><div class="row-f gap2"><div class="ico g"><i class="bi bi-clock-history"></i></div><div><h2>Presensi &amp; perizinan pekerja</h2><p>${shiftLbl}: ${p.utama} dari ${p.total} pekerja hadir \u00B7 ${p.izin} izin \u00B7 ${p.ghoib} ghoib</p></div></div></div>
      ${izinTbl}
    </section>
    <section class="card-x">
      <div class="card-h"><div class="row-f gap2"><div class="ico"><i class="bi bi-kanban"></i></div><div><h2>Program kerja &amp; triad dokumentasi</h2><p>Maksimal 4 program terbaru per bagian sesuai filter</p></div></div><div class="row-f gap1"><button class="btn-x btn-o btn-sm" onclick="navigateTo('program')">Semua program</button><button class="btn-x btn-p btn-sm" onclick="programForm()"><i class="bi bi-plus-lg"></i> Tambah</button></div></div>
      <div class="chips mb2" role="group" aria-label="Filter periode program">${[['ini', 'Minggu ini'], ['lalu', 'Minggu lalu'], ['bulan', 'Bulan ini'], ['semua', 'Semua']].map(o => `<button class="chip-f ${S.dashProg === o[0] ? 'on' : ''}" data-dp="${o[0]}" onclick="setDashProg('${o[0]}')">${o[1]}</button>`).join('')}</div>
      <div id="dashProgs">${progGroup('Tambal Sulam')}${progGroup('Proyek')}</div>
    </section>
    <section class="card-x">
      <div class="card-h"><div class="row-f gap2"><div class="ico w"><i class="bi bi-cart3"></i></div><div><h2>Log pemesanan material</h2><p>Dikelompokkan per bagian</p></div></div><div class="row-f gap1"><select class="inp inp-sm" id="matF" aria-label="Filter waktu pesanan" onchange="S.matF=this.value;paintDashMat()">${[['hari', 'Hari ini'], ['7', '7 hari'], ['30', '30 hari'], ['semua', 'Semua']].map(o => `<option value="${o[0]}"${(S.matF || 'hari') === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><button class="btn-x btn-g btn-sm" onclick="orderForm()"><i class="bi bi-cart-plus"></i><span class="hide-m"> Pesan ke Toko KUK</span></button></div></div>
      ${matGroup('Tambal Sulam')}${matGroup('Proyek')}
    </section>
    <div class="two">
      <section class="card-x"><div class="card-h"><div class="row-f gap2"><div class="ico g"><i class="bi bi-clipboard-check"></i></div><div><h2>Piket staf hari ini</h2><p>${fdate(d.tanggal, 1)}</p></div></div></div>${piket}</section>
      <section class="card-x"><div class="card-h"><div class="row-f gap2"><div class="ico w"><i class="bi bi-wallet2"></i></div><div><h2>Keuangan per bagian</h2><p>Dari laporan mingguan manual</p></div></div><button class="btn-x btn-o btn-sm" onclick="navigateTo('keuangan')">Detail</button></div>${d.keuangan.map(keuCard).join('')}</section>
    </div>
  </div>`;
}
function dashMatInner(bagian) {
  const all = (S.dash.d.materialByBagian.find(x => x.bagian === bagian) || { items: [] }).items, f = S.matF || 'hari', t = todayStr();
  const from = f === 'semua' ? '' : f === 'hari' ? t : addD(t, -(Number(f) - 1));
  const list = all.filter(m => !from || m.Tanggal >= from);
  return `<div class="grp-h">${E(bagian.toUpperCase())}<span class="pill">${list.length} pesanan</span></div><div class="grp-b dm-scroll">${tableHtml('tbMat' + bagian.replace(/\s/g, ''), [
    { l: 'Nama barang', c: 'c-nm', f: r => `<b>${E(r.Material)}</b><span class="sub">${fdate(r.Tanggal)}<span class="only-xs"> \u00B7 ${num(r.Jumlah)} ${E(r.Satuan || '')}</span> \u00B7 ${E(r.Tujuan)}</span>` },
    { l: 'Jml', n: 1, c: 'c-jml', f: r => `${num(r.Jumlah)} <span class="muted">${E(r.Satuan || '')}</span>` },
    { l: 'Total', n: 1, c: 'c-tot', f: r => `<b>${Rp(r.Total)}</b>` },
    { l: 'Status', c: 'c-st', f: r => r.StatusBayar === 'Telah Dibayar' ? '<span class="pill pill-ok">Lunas</span>' : badge(r.StatusKirim) }
  ], list, { cls: 'nostk tbl-slim tbl-mat tbl-dm', empty: 'Belum ada pesanan ' + bagian + ' pada rentang ini' })}</div>`;
}
function paintDashMat() { ['Tambal Sulam', 'Proyek'].forEach(b => { const el = $('#dmg_' + b.replace(/\s/g, '')); if (el) el.innerHTML = dashMatInner(b); }); }
function filterAct(list) {
  const f = S.actF || 'hari', t = todayStr();
  if (f === 'semua') return list || [];
  const from = f === 'hari' ? t : addD(t, -(Number(f) - 1));
  return (list || []).filter(a => String(a.waktu).slice(0, 10) >= from);
}
function paintAct() { const el = $('#actList'); if (el && S.dash) el.innerHTML = aktivitasHtml(filterAct(S.dash.d.aktivitas)); }
function aktivitasHtml(list) {
  if (!list || !list.length) return '<div class="muted tc" style="padding:.75rem;font-size:12px">Belum ada perubahan data pada rentang ini.</div>';
  return `<ul class="act-log">${list.map(a => `<li title="${E(a.ringkas)}"><time>${E(String(a.waktu).slice(8, 10) + '/' + String(a.waktu).slice(5, 7) + ' ' + String(a.waktu).slice(11, 16))}</time><div class="trunc"><b>${E(a.oleh)}</b> ${E(a.aksi.toLowerCase())} ${E(a.data)}<span class="s trunc">${E(a.ringkas)}</span></div></li>`).join('')}</ul>`;
}
function dashProgGroupHtml(bagian) {
  const d = S.dash.d, all = (d.programByBagian.find(x => x.bagian === bagian) || { items: [] }).items;
  const rg = progRange(S.dashProg || 'ini', bagian, d.minggu);
  const list = all.filter(p => (!rg.from || p.Tanggal >= rg.from) && (!rg.to || p.Tanggal <= rg.to));
  return programGroupHtml(bagian, list.slice(0, 4), { range: rg, more: list.length > 4 ? list.length - 4 : 0 });
}
function setDashProg(k) {
  S.dashProg = k;
  $$('[data-dp]').forEach(b => b.classList.toggle('on', b.dataset.dp === k));
  const el = $('#dashProgs'); el.innerHTML = dashProgGroupHtml('Tambal Sulam') + dashProgGroupHtml('Proyek'); loadThumbs(el);
}
function programExportGroup(bagian, btn) {
  const rg = (S.expRange || {})[bagian] || {};
  return act(btn, async () => { toast('Menyusun laporan dokumentasi ' + (rg.label || '') + '\u2026'); const r = await apiM('program.exportDocGroup', { bagian: bagian, from: rg.from || '', to: rg.to || '', label: rg.label || '' }); showExport(r.data, 'Buka Google Docs'); });
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
  return `<div class="page-head"><div><h1>${E(cfg.title)}</h1><p>${E(cfg.sub)}</p></div><button class="btn-x btn-p" onclick="crudAdd('${cfg.id}')"><i class="bi bi-plus-lg"></i> ${E(cfg.add)}</button></div>
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
const BAG_KARY = ['Tambal Sulam', 'Proyek', 'Logistik & Armada'];
function karSubMode() {
  const ts = ($('#f_Bagian') || {}).value === 'Tambal Sulam', el = $('#f_SubBagian'); if (!el) return;
  if (ts) { el.setAttribute('list', 'f_SubBagian_dl'); el.placeholder = 'Ketik untuk mencari, mis. Perairan'; }
  else { el.removeAttribute('list'); el.placeholder = 'Mis. Rusunawa Asatidz Lt. 2'; }
  const h = el.parentElement.querySelector('.help'); if (h) h.textContent = ts ? 'Tambal Sulam: wajib salah satu dari daftar resmi.' : 'Isi bebas sesuai lokasi kerja.';
}

crud({
  id: 'karyawan', title: 'Data karyawan', sub: 'Master pekerja lapangan. Hanya karyawan aktif yang muncul di presensi.', add: 'Tambah karyawan', noun: 'karyawan',
  list: 'karyawan.list', save: 'karyawan.save', del: 'karyawan.delete',
  prep: async () => ({ pil: await api('pilihan.list') }),
  cls: 'nostk tbl-slim tbl-kar',
  cols: [{ l: 'Nama', f: r => `<b>${E(r.Nama)}</b><span class="sub">${E([r.Jabatan, r.Bagian, r.SubBagian].filter(Boolean).join(' \u00B7 '))}</span>` }, { l: 'Status', c: 'c-st', f: r => r.Status === 'Aktif' ? '<span class="dot-ok" title="Aktif" aria-label="Aktif"></span>' : badge(r.Status) }],
  fields: (ctx, row) => {
    const jb = ctx.pil.jabatan.slice(); if (row && row.Jabatan && jb.indexOf(row.Jabatan) < 0) jb.push(row.Jabatan);
    return [{ k: 'Nama', l: 'Nama lengkap', req: true, full: true, ml: 80 }, { k: 'Bagian', l: 'Bagian', t: 'select', opts: BAG_KARY, req: true }, { k: 'Status', l: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif'] },
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
  return `<div class="page-head"><div><h1>Laporan keuangan</h1><p>Rekapitulasi anggaran mingguan per bagian, dengan penomoran minggu masing-masing.</p></div><button class="btn-x btn-g" onclick="keuAdd()"><i class="bi bi-plus-lg"></i> Input laporan keuangan</button></div>
  <div class="two mb2">
    <div class="sum-card ts"><small>TOTAL KEUANGAN TAMBAL SULAM</small><b class="num">${Rp(tot('Tambal Sulam'))}</b></div>
    <div class="sum-card pr"><small>TOTAL KEUANGAN PROYEK</small><b class="num">${Rp(tot('Proyek'))}</b></div>
  </div>
  <div class="two">${S.keu.data.map(keuPanel).join('')}</div>`;
}
function keuAdd(bagian) {
  openForm({ title: 'Input laporan keuangan', submit: 'Simpan',
    fields: [{ k: 'Bagian', l: 'Bagian', t: 'select', opts: ['Tambal Sulam', 'Proyek'], req: true, full: true }, { k: 'TglMulai', l: 'Tanggal (dalam minggu terkait)', t: 'date', req: true, help: 'Nomor minggu dihitung otomatis dari patokan awal bagian.' }, { k: 'Nominal', l: 'Nominal anggaran (Rp)', t: 'number', req: true, min: 0, step: 500 }],
    values: { Bagian: bagian || 'Tambal Sulam', TglMulai: todayStr() },
    save: async d => { const r = await apiM('keu.save', d); toast(r.message, 'ok'); closeModal(); navigateTo('keuangan'); }
  });
}
function keuEdit(id, bagian) {
  const item = S.keu.data.flatMap(k => k.items).find(x => x.ID === id);
  openForm({ title: 'Ubah laporan keuangan', submit: 'Simpan',
    fields: [{ k: 'TglMulai', l: 'Tanggal', t: 'date', req: true }, { k: 'Nominal', l: 'Nominal anggaran (Rp)', t: 'number', req: true, min: 0, step: 1000 }],
    values: item,
    save: async d => { d.ID = id; d.Bagian = bagian; const r = await apiM('keu.save', d); toast(r.message, 'ok'); closeModal(); navigateTo('keuangan'); }
  });
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
  const wk = s0 => { if (!mg) return ''; const pat = bagian === 'Proyek' ? mg.pr.patokan : mg.ts.patokan; if (!pat) return ''; const n = Math.floor((parseD(s0) - parseD(pat)) / (7 * 864e5)) + 1; return 'Minggu ke-' + (n < 1 ? 1 : n) + ' '; };
  if (key === 'ini') return { from: st, to: addD(st, 6), label: wk(st) + '(' + fdate(st) + ' \u2013 ' + fdate(addD(st, 6)) + ')' };
  if (key === 'lalu') { const a = addD(st, -7); return { from: a, to: addD(a, 6), label: wk(a) + '(' + fdate(a) + ' \u2013 ' + fdate(addD(a, 6)) + ')' }; }
  if (key === 'bulan') { const a = t.slice(0, 8) + '01', d = new Date(parseD(a)); d.setUTCMonth(d.getUTCMonth() + 1); const b = addD(d.toISOString().slice(0, 10), -1); return { from: a, to: b, label: 'Bulan ' + BLN[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4) }; }
  if (key === 'rentang') { const a = S.progFrom || '', b = S.progTo || ''; return { from: a, to: b, label: (a ? fdate(a) : 'awal') + ' \u2013 ' + (b ? fdate(b) : 'akhir') }; }
  return { from: '', to: '', label: 'Semua periode' };
}
function programCard(p) {
  const st = isStaff();
  const slots = [['Before', 'Sebelum'], ['During', 'Proses'], ['After', 'Selesai']];
  const triad = slots.map(s => {
    const k = s[0], l = s[1], u = p['Foto' + k];
    if (u) return `<div class="slot loading" data-thumb="${E(u)}" data-preview="${E(u)}" data-title="${E(l + ' \u2014 ' + p.SubBagian)}" role="button" tabindex="0" aria-label="Lihat foto ${E(l)}"><span class="tag">${E(l)}</span>${st ? `<button class="fdel" data-fdel data-pid="${p.ID}" data-slot="${k}" data-lbl="${E(l)}" aria-label="Hapus foto ${E(l)}" title="Hapus foto"><i class="bi bi-trash3"></i></button><button class="re" data-upload data-pid="${p.ID}" data-slot="${k}" aria-label="Ganti foto ${k}"><i class="bi bi-arrow-repeat"></i></button>` : ''}</div>`;
    return st ? `<button type="button" class="slot empty" data-upload data-pid="${p.ID}" data-slot="${k}"><i class="bi bi-camera"></i><span><span class="hide-xs">Unggah foto </span>${E(l)}</span><span class="muted" style="font-weight:500">Maks. 1 MB</span></button>` : `<div class="slot empty" style="cursor:default;border-style:solid"><i class="bi bi-image"></i><span>${E(l)}<br>belum ada</span></div>`;
  }).join('');
  return `<article class="prog" id="prog_${p.ID}">
    <div class="row-f between wrap gap1"><div class="grow"><h3 style="font-size:16px;line-height:22px;margin:0">${E(p.Uraian || p.SubBagian)}</h3><div class="muted">Sub-bagian: ${E(p.SubBagian)}</div><div class="mt1">${badge(p.Status || 'Direncanakan')}</div></div>
    ${st ? `<div class="row-f gap1"><button class="btn-x btn-o btn-sm" onclick="programEdit('${p.ID}')"><i class="bi bi-pencil"></i> Ubah</button><button class="btn-x btn-d btn-sm" onclick="programDel('${p.ID}')" aria-label="Hapus program"><i class="bi bi-trash"></i> Hapus</button></div>` : ''}</div>
    <div class="triad">${triad}</div>
  </article>`;
}
async function deleteSlot(pid, slot, lbl, el) {
  if (!(await confirmBox('Hapus foto <b>' + E(lbl) + '</b>? File foto di Google Drive juga ikut dihapus.', 'Ya, hapus foto'))) return;
  if (el) el.classList.add('up');
  try {
    const r = await apiM('program.fotoDel', { id: pid, slot: slot });
    toast(r.message, 'ok'); programUpdated(r.data);
  } catch (e) { toast(e.message, 'err'); if (el) el.classList.remove('up'); }
}
function programGroupHtml(bagian, list, opt) {
  opt = opt || {};
  (S.expRange = S.expRange || {})[bagian] = opt.range || { from: '', to: '', label: 'Semua periode' };
  const items = list.length ? list.map((p, i) => programCard(p).replace('<h3 style="font-size:16px;line-height:22px;margin:0">', `<h3 style="font-size:16px;line-height:22px;margin:0"><span class="muted">${i + 1}.</span> `)).join('') : emptyBox('Belum ada program ' + bagian);
  return `<div class="grp grp-${bagian === 'Tambal Sulam' ? 'ts' : 'pr'}">
    <div class="grp-h"><span>${E(bagian.toUpperCase())}${opt.range ? `<small class="grp-sub">${E(opt.range.label)}</small>` : ''}</span><span class="pill">${list.length}${opt.more ? '+' + opt.more : ''} program</span></div>
    <div class="grp-b">${items}
      <div class="row-f between wrap gap1 mt2">${isStaff() ? `<button class="btn-x btn-p btn-sm" onclick="programForm(null,{Bagian:'${bagian}'})"><i class="bi bi-plus-lg"></i> Tambah program ${E(bagian)}</button>${opt.more ? `<button class="btn-x btn-o btn-sm" onclick="navigateTo('program')">Lihat ${opt.more} lainnya</button>` : ''}<button class="btn-x btn-o btn-sm" onclick="programExportGroup('${bagian}',this)"><i class="bi bi-file-earmark-word"></i> Export Docs ${E(bagian)} (sesuai tampilan)</button>` : ''}</div>
    </div></div>`;
}
PAGES.program = async function () {
  const r = await api('program.list');
  S.prog = { rows: r.rows, sub: r.sub, minggu: r.minggu }; S.progKey = S.progKey || 'ini';
  return {
    html: `<div class="page-head"><div><h1>Program kerja</h1><p>Rencana dan progres fisik tiap sub-bagian, dikelompokkan per bagian, lengkap dengan dokumentasi foto Sebelum \u00B7 Proses \u00B7 Selesai.</p></div><div class="row-f gap1 wrap"><button class="btn-x btn-o" onclick="subManage()"><i class="bi bi-diagram-3"></i> Kelola sub-bagian</button><button class="btn-x btn-p" onclick="programForm()"><i class="bi bi-plus-lg"></i> Tambah program</button></div></div>
    <section class="card-x"><div class="tools">
      <div class="search"><i class="bi bi-search"></i><input class="inp" id="progQ" type="search" placeholder="Cari program, lokasi, mandor\u2026" aria-label="Cari program" oninput="paintPrograms()"></div>
      <select class="inp" id="progS" style="width:auto" onchange="paintPrograms()" aria-label="Filter status"><option value="">Semua status</option><option value="Direncanakan">Direncanakan</option><option value="Berjalan">Proses</option><option value="Selesai">Selesai</option></select>
      <select class="inp" id="progK" style="width:auto" onchange="S.progKey=this.value;paintPrograms()" aria-label="Filter periode">${[['ini', 'Periode minggu ini'], ['lalu', 'Minggu lalu'], ['bulan', 'Bulan ini'], ['semua', 'Semua'], ['rentang', 'Pilih tanggal\u2026']].map(o => `<option value="${o[0]}"${S.progKey === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>
      <span id="progRg" class="row-f gap1 wrap"${S.progKey === 'rentang' ? '' : ' hidden'}><input type="date" class="inp" style="width:auto" id="progFrom" value="${E(S.progFrom || '')}" onchange="S.progFrom=this.value;paintPrograms()" aria-label="Dari tanggal"><span class="muted">s.d.</span><input type="date" class="inp" style="width:auto" id="progTo" value="${E(S.progTo || '')}" onchange="S.progTo=this.value;paintPrograms()" aria-label="Sampai tanggal"></span>
    </div><div id="progList"></div></section>`,
    init: () => paintPrograms()
  };
};
function paintPrograms() {
  const q = $('#progQ').value.trim().toLowerCase(), st = $('#progS').value, key = S.progKey || 'ini';
  $('#progRg').hidden = key !== 'rentang';
  const filt = p => (!st || p.Status === st) && (!q || rowText(p).indexOf(q) >= 0);
  const el = $('#progList');
  el.innerHTML = ['Tambal Sulam', 'Proyek'].map(b => {
    const rg = progRange(key, b, S.prog.minggu);
    return programGroupHtml(b, S.prog.rows.filter(p => p.Bagian === b && (!rg.from || p.Tanggal >= rg.from) && (!rg.to || p.Tanggal <= rg.to)).filter(filt), { range: rg });
  }).join('');
  loadThumbs(el);
}
function findProg(id) {
  return (S.prog && S.prog.rows.find(x => x.ID === id)) || (S.dash && S.dash.d.programByBagian && S.dash.d.programByBagian.flatMap(g => g.items).find(x => x.ID === id));
}
function programUpdated(rec) {
  if (S.prog) { const i = S.prog.rows.findIndex(x => x.ID === rec.ID); if (i >= 0) S.prog.rows[i] = rec; }
  if (S.dash && S.dash.d.programByBagian) S.dash.d.programByBagian.forEach(g => { const i = g.items.findIndex(x => x.ID === rec.ID); if (i >= 0) g.items[i] = rec; });
  const el = $('#prog_' + rec.ID);
  if (el) { if (AppState.page === 'program') paintPrograms(); else { const par = el.parentElement; el.outerHTML = programCard(rec); loadThumbs(par); } }
}
async function uploadSlot(pid, slot, el) {
  const f = await pickImage(); if (!f) return;
  el.classList.add('up'); el.dataset.st = 'Menyiapkan foto\u2026';
  try {
    toast('Mengompres foto\u2026');
    const c = await compressImage(f);
    el.dataset.st = 'Mengunggah ' + c.kb + ' KB\u2026';
    const r = await apiM('program.foto', { id: pid, slot: slot, data: c.data, mime: c.mime });
    toast('Foto ' + slot + ' tersimpan \u00B7 ' + c.kb + ' KB', 'ok');
    programUpdated(r.data);
  } catch (e) { toast(e.message, 'err'); el.classList.remove('up'); }
}
function programKosong() {
  const s = S.dash && S.dash.d.subKosong[0];
  programForm(null, s ? { Bagian: 'Tambal Sulam', SubBagianID: s.ID } : null);
}
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
    { k: 'Status', l: 'Status', t: 'select', opts: [{ v: 'Direncanakan', l: 'Direncanakan' }, { v: 'Berjalan', l: 'Proses' }, { v: 'Selesai', l: 'Selesai' }] }
  ];
  if (!rec) { S.pf = Object.assign({}, (preset && preset.__foto) || {}); fields.push({ k: 'pfoto', t: 'html', html: pfHtml() }); }
  if (preset) delete preset.__foto;
  openForm({
    title: rec ? 'Ubah program kerja' : 'Tambah program kerja', size: 'lg', fields: fields,
    values: rec || Object.assign({ Tanggal: todayStr(), Bagian: 'Proyek', Status: 'Berjalan' }, preset || {}),
    save: async d => {
      if (rec) d.ID = rec.ID;
      const r = await apiM('program.save', d);
      const fotos = rec ? [] : ['Before', 'During', 'After'].filter(k => (S.pf || {})[k]);
      for (let i = 0; i < fotos.length; i++) {
        toast('Mengunggah foto ' + fotos[i] + ' (' + (i + 1) + '/' + fotos.length + ')\u2026');
        const pfEl = $('#pf_' + fotos[i]); if (pfEl) { pfEl.classList.add('up'); pfEl.dataset.st = 'Mengunggah\u2026'; }
        await apiM('program.foto', { id: r.data.ID, slot: fotos[i], data: S.pf[fotos[i]].data, mime: S.pf[fotos[i]].mime });
      }
      S.pf = {}; const dest = S.camForm ? 'program' : AppState.page; S.camForm = false;
      toast(r.message + (fotos.length ? ' ' + fotos.length + ' foto tersimpan.' : ''), 'ok'); closeModal(); navigateTo(dest);
    }
  });
}
const PF_LBL = { Before: 'Sebelum (Before)', During: 'Proses (During)', After: 'Selesai (After)' };
function pfHtml() {
  return `<div class="full"><span class="lbl">Foto dokumentasi <span class="muted fw6">(opsional)</span></span><div class="pf-grid">${['Before', 'During', 'After'].map(k => `<div class="pf-slot" id="pf_${k}">${pfSlotHtml(k)}</div>`).join('')}</div></div>`;
}
function pfSlotHtml(k) {
  const c = (S.pf || {})[k];
  return `<div class="pf-prev">${c ? `<img alt="Foto ${E(PF_LBL[k])}" src="${c.preview}"><button type="button" class="fdel" onclick="pfClear('${k}')" aria-label="Hapus foto ${k}"><i class="bi bi-x-lg"></i></button>` : `<i class="bi bi-image"></i>`}<span class="tag">${k}</span></div>
    <div class="pf-btns"><button type="button" class="btn-x btn-o btn-sm" onclick="pfPick('${k}',true)"><i class="bi bi-camera"></i> Kamera</button><button type="button" class="btn-x btn-o btn-sm" onclick="pfPick('${k}',false)"><i class="bi bi-upload"></i> Unggah</button></div>`;
}
async function pfPick(k, camera) {
  const f = await pickImage(camera); if (!f) return;
  const el = $('#pf_' + k); if (el) el.classList.add('up');
  try { (S.pf = S.pf || {})[k] = await compressImage(f); } catch (e) { toast(e.message, 'err'); }
  if (el) { el.classList.remove('up'); el.innerHTML = pfSlotHtml(k); }
}
function pfClear(k) { delete (S.pf || {})[k]; const el = $('#pf_' + k); if (el) el.innerHTML = pfSlotHtml(k); }
function cameraStart() {
  pickImage(true).then(async f => {
    if (!f) return;
    try { S.cam = { foto: await compressImage(f), slot: '' }; } catch (e) { return toast(e.message, 'err'); }
    camReview();
  });
}
function camReview() {
  openModal({
    title: 'Periksa foto',
    body: `<img class="preview-img" style="max-height:52vh" alt="Foto yang baru diambil" src="${S.cam.foto.preview}"><p class="tc muted mt1">Apakah foto sudah sesuai? \u00B7 ${S.cam.foto.kb} KB</p>`,
    footer: `<button class="btn-x btn-o" onclick="cameraStart()"><i class="bi bi-arrow-counterclockwise"></i> Ulangi</button><button class="btn-x btn-p" onclick="camJenis()"><i class="bi bi-check2"></i> Sesuai, lanjut</button>`
  });
}
const camSort = rows => rows.slice().sort((a, b) => ((a.Status === 'Selesai') - (b.Status === 'Selesai')) || b.Tanggal.localeCompare(a.Tanggal));
const camOpts = rows => rows.map(p => `<label class="cam-opt" data-q="${E(((p.Uraian || '') + ' ' + p.SubBagian + ' ' + p.Bagian).toLowerCase())}"><input type="radio" name="camPid" value="${p.ID}"><span><b>${E(p.Uraian || p.SubBagian)}</b><small>${E(p.SubBagian + ' \u00B7 ' + p.Bagian + ' \u00B7 ' + (p.Status === 'Berjalan' ? 'Proses' : p.Status))}</small></span></label>`).join('');
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
    body: `<div class="row-f gap2 mb2"><img alt="" src="${S.cam.foto.preview}" style="width:84px;height:63px;object-fit:cover;border-radius:.5rem;flex:none"><div class="muted">Pilih jenis foto, lalu tentukan programnya.</div></div>
      <span class="lbl">Jenis foto <span style="color:#dc2626">*</span></span>
      <div class="cam-jenis" role="radiogroup">${['Before', 'During', 'After'].map(k => `<button type="button" class="cj" data-cj="${k}" role="radio" aria-checked="false" onclick="camSetJenis('${k}')"><b>${k}</b><span>${E(PF_LBL[k].split(' ')[0])}</span></button>`).join('')}</div>
      <span class="lbl mt2">Simpan ke</span>
      <label class="li" style="cursor:pointer"><input type="radio" name="camTo" value="baru" checked onchange="camTo()"> <b>Program baru</b> <span class="muted">\u2014 isi form Tambah program</span></label>
      <label class="li" style="cursor:pointer"><input type="radio" name="camTo" value="ada" onchange="camTo()"${rows.length ? '' : ' disabled'}> <b>Program yang sudah ada</b></label>
      <div id="camProgBox" hidden><input class="inp mt1" id="camQ" type="search" placeholder="Ketik nama program atau sub-bagian\u2026" oninput="camFilter()" aria-label="Cari program"><div class="cam-list" id="camProg" role="radiogroup">${camOpts(rows)}</div><div class="muted tc" id="camNone" hidden style="padding:.5rem;font-size:12px">Tidak ada program yang cocok.</div></div>`,
    footer: `<button class="btn-x btn-o" onclick="camReview()">Kembali</button><button class="btn-x btn-p" onclick="camNext(this)"><i class="bi bi-arrow-right"></i> Lanjut</button>`
  });
}
function camSetJenis(k) { S.cam.slot = k; $$('.cj').forEach(b => { const on = b.dataset.cj === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); }
function camTo() { const ada = ($('input[name="camTo"]:checked') || {}).value === 'ada'; $('#camProgBox').hidden = !ada; if (ada) setTimeout(() => { const q = $('#camQ'); if (q) q.focus(); }, 50); }
function camFilter() { const q = $('#camQ').value.trim().toLowerCase(); let n = 0; $$('.cam-opt').forEach(el => { const hit = !q || el.dataset.q.indexOf(q) >= 0; el.hidden = !hit; if (hit) n++; }); $('#camNone').hidden = n > 0; }
function camNext(btn) {
  if (!S.cam.slot) return toast('Pilih jenis foto dulu: Before, During, atau After.', 'err');
  const ada = ($('input[name="camTo"]:checked') || {}).value === 'ada';
  if (!ada) { const fo = {}; fo[S.cam.slot] = S.cam.foto; S.camForm = true; return programForm(null, { __foto: fo }); }
  return act(btn, async () => {
    const pick = $('input[name="camPid"]:checked'); if (!pick) throw new Error('Pilih programnya dulu.');
    const id = pick.value;
    const r = await apiM('program.foto', { id: id, slot: S.cam.slot, data: S.cam.foto.data, mime: S.cam.foto.mime });
    toast(r.message, 'ok'); closeModal(); S.cam = null; navigateTo('program');
  });
}
const programEdit = id => programForm(findProg(id));
function programDoc(id, btn) {
  return act(btn, async () => { toast('Menyusun laporan Google Docs\u2026'); const r = await apiM('program.exportDoc', { id: id }); showExport(r.data, 'Buka Google Docs'); });
}
async function programDel(id) {
  if (!(await confirmBox('Hapus program kerja ini beserta catatannya? Foto di Drive tidak ikut terhapus.', 'Ya, hapus'))) return;
  await act(null, async () => { const r = await apiM('program.delete', { id: id }); toast(r.message, 'ok'); navigateTo(AppState.page); });
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
  return `<div class="tools">${searchBox('q_kat', 'tb_kat', 'Cari item katalog\u2026')}<span class="grow"></span><button class="btn-x btn-p btn-sm" onclick="katForm()"><i class="bi bi-plus-lg"></i> Tambah item</button></div>` +
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
(function init() {
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
        else { AppState.user = res.data.user; AppState.config = res.data.config; saveSessInfo(res.data); }
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
