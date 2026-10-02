// ============================================================
// JEMBATAN KE BACKEND (Google Apps Script REST API)
// Semua komunikasi lewat fetch(). Tidak memakai google.script.run.
// ============================================================

/** true bila GAS_URL di js/config.js sudah diisi URL Web App yang benar */
function gasConfigured() {
  return typeof GAS_URL === 'string' && GAS_URL.indexOf('https://script.google.com/') === 0 && /\/exec$/.test(GAS_URL);
}

/** Ubah galat teknis menjadi pesan yang dimengerti pengguna */
function gasError_(e) {
  const m = (e && e.message) || '';
  if (e && e.name === 'AbortError') return new Error('Server terlalu lama merespons. Coba lagi beberapa saat.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return new Error('Koneksi ke server gagal. Periksa jaringan Anda.');
  if (/Unexpected token|JSON/i.test(m)) return new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan "Execute as: Me" dan "Who has access: Anyone".');
  return new Error(m || 'Terjadi kesalahan saat menghubungi server.');
}

/** POST {fn, args} ke Apps Script. Content-Type WAJIB text/plain agar tidak memicu CORS preflight. */
async function gasPost(fn, args) {
  if (!gasConfigured()) throw new Error('GAS_URL belum diisi di js/config.js.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fn, args: args || [] }),
      redirect: 'follow',
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error('Server menjawab dengan kode ' + res.status + '.');
    return await res.json();
  } catch (e) {
    throw gasError_(e);
  } finally {
    clearTimeout(timer);
  }
}

/** GET data publik ringan, mis. ?action=publicConfig */
async function gasGet(action) {
  if (!gasConfigured()) throw new Error('GAS_URL belum diisi di js/config.js.');
  try {
    const res = await fetch(GAS_URL + '?action=' + encodeURIComponent(action), { redirect: 'follow' });
    return await res.json();
  } catch (e) {
    throw gasError_(e);
  }
}
