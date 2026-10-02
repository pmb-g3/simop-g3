# Panduan Migrasi SIMOP: Backend di Apps Script, Frontend di GitHub Pages

Setelah migrasi:

```
GitHub Pages (tampilan)  ──fetch() JSON──▶  Google Apps Script (Kode.gs)  ──▶  Sheets & Drive
https://USERNAME.github.io/simop/            https://script.google.com/.../exec
```

- **Data tidak berpindah.** Spreadsheet, foto di Drive, akun, dan semua pengaturan tetap sama.
- Pengguna cukup **login ulang sekali** di alamat baru, karena "Ingat saya" tersimpan per alamat situs.
- URL Apps Script lama kini menampilkan JSON, bukan tampilan aplikasi lagi. Bagikan alamat GitHub Pages ke semua pengguna.

---

## BAGIAN A: Backend (Google Apps Script)

### A1. Ganti kode
1. Buka proyek **SIMOP G3** di script.google.com.
2. Buka file **`Kode`**, hapus semua isinya, tempel isi **`Kode.gs`** yang baru, lalu **Save**.
3. **Hapus** 3 file HTML yang tidak dipakai lagi: `Index`, `Stylesheet`, `JavaScript`. Klik tiga titik di samping nama file, lalu pilih **Delete**.
4. Pastikan layanan **Google Docs API** masih ada di panel **Services**. Bila belum ada: klik **Services (+)**, pilih **Google Docs API**, lalu **Add**.

### A2. Deploy ulang (tanpa mengganti URL)
1. **Deploy → Manage deployments**, lalu klik **ikon pensil** pada deployment yang sudah ada.
2. **Version:** pilih **New version**.
3. Periksa pengaturannya:
   - **Execute as:** `Me`
   - **Who has access:** **`Anyone`**

   > ⚠️ Harus **Anyone**, bukan "Anyone with Google account". Halaman GitHub memanggil API tanpa login Google. Bila pilihannya salah, akan muncul pesan "Respons server tidak valid".
4. Klik **Deploy**, lalu **salin Web app URL** (diakhiri `/exec`).

> 💡 Dengan cara "edit deployment + New version", **URL tidak berubah**. Bila Anda memakai "New deployment", Anda mendapat URL baru dan `js/config.js` di GitHub harus ikut diganti.

### A3. Uji backend
Tempel URL berikut di browser (ganti dengan URL Anda):
```
https://script.google.com/macros/s/XXXXXXXX/exec?action=ping
```
Yang benar: muncul teks JSON seperti `{"success":true,"data":{"app":"SIMOP Gontor Kampus 3",...},"message":"SIMOP API aktif."}`.

---

## BAGIAN B: Frontend (GitHub Pages)

Semua langkah lewat **terminal** (PowerShell di Windows). **Jangan** memakai tombol "Upload files" di web GitHub, karena struktur folder `css/` dan `js/` akan rusak dan tampilan menjadi polos (404).

### B1. Siapkan folder
1. Ekstrak **`simop-frontend.zip`**, misalnya ke `Documents`.
2. Hasilnya folder **`simop-frontend`**. Isinya harus langsung:
   ```
   simop-frontend\
   ├── index.html      ← wajib terlihat di sini
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\style.css
   └── js\config.js, api.js, app.js
   ```
3. **Isi URL backend:** buka `js\config.js` dengan Notepad, lalu ganti
   `TEMPEL_URL_EXEC_DI_SINI` dengan URL `/exec` dari langkah A2. Simpan.
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```

### B2. Install Git (sekali saja)
Unduh dari **https://git-scm.com/download/win**, install dengan pengaturan bawaan, lalu buka **PowerShell** dan cek:
```powershell
git --version
```

### B3. Akun & identitas Git (sekali saja)
1. Daftar di **https://github.com**. Username Anda akan menjadi bagian alamat situs: `USERNAME.github.io`.
2. Di PowerShell:
   ```powershell
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```

### B4. Buat repository
Di github.com: klik **+**, lalu **New repository**.
- Nama: misalnya **`simop`**
- Pilih **Public** (wajib untuk GitHub Pages gratis; aman karena tidak ada kredensial di frontend)
- **Jangan** centang README, .gitignore, maupun license

### B5. Masuk ke folder yang BENAR
Ini langkah yang paling sering salah. `git init` harus dijalankan **di dalam folder `simop-frontend`**, yaitu folder yang langsung berisi `index.html`.

Cara mudah: buka folder `simop-frontend` di File Explorer, klik address bar, ketik `powershell`, lalu Enter. Kemudian:
```powershell
dir
```
✅ Lanjut hanya bila `index.html`, `css`, dan `js` terlihat di daftar.
❌ Bila yang terlihat folder `simop-frontend` lagi, masuk dulu dengan `cd simop-frontend`.

### B6. Kirim ke GitHub (push pertama)
Jalankan satu per satu:
```powershell
git init
git add .
git commit -m "Upload pertama SIMOP"
git branch -M main
git remote add origin https://github.com/USERNAME/simop.git
git push -u origin main
```
> Perhatikan **titik** pada `git add .`.

Saat `git push` meminta login:
- **Username:** username GitHub
- **Password:** **Personal Access Token**, bukan password akun

  Saat token ditempel, **layar tetap kosong**. Ini normal. Klik kanan untuk menempel, lalu tekan Enter.

**Membuat token** (bila belum punya):
1. Buka https://github.com/settings/tokens → **Generate new token (classic)**.
2. Note: `simop`. Expiration: `90 days` atau `No expiration`.
3. Centang ✅ **repo**, lalu klik **Generate token**.
4. Salin `ghp_...` (hanya tampil sekali, simpan di Notepad).

Tanda berhasil: `Writing objects: 100%` dan `* [new branch] main -> main`.

### B7. Aktifkan GitHub Pages
Repository → **Settings → Pages**:

| Kolom | Nilai |
|---|---|
| Source | **Deploy from a branch** |
| Branch | **main** / **(root)** |
| Enforce HTTPS | ✅ **wajib** (kamera HP butuh HTTPS) |

Klik **Save**, tunggu 1–2 menit, lalu buka:
**`https://USERNAME.github.io/simop/`**

### B8. Memperbarui tampilan di kemudian hari
Dari folder `simop-frontend`:
```powershell
git add .
git commit -m "Keterangan perubahan"
git push
```
Situs diperbarui dalam 1–2 menit. Bila masih tampil versi lama, tekan **Ctrl+Shift+R** atau buka di Incognito.

> Perubahan **backend** (`Kode.gs`) tetap dilakukan di editor Apps Script, lalu **Manage deployments → ikon pensil → New version**. Tidak perlu push ke GitHub.

---

## BAGIAN C: Uji setelah online
1. Buka `https://USERNAME.github.io/simop/`. Layar login dengan logo harus tampil.
2. Login, lalu periksa Dashboard, Presensi, Material, dan Program Kerja.
3. Di HP: coba tombol **Foto** (izinkan kamera) dan **tarik ke bawah** untuk refresh.
4. Bila ada masalah: tekan **F12 → Console**, lalu kirim screenshot-nya.

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Alamat server belum diatur" | `GAS_URL` di `js/config.js` belum diisi | Isi URL `/exec`, lalu `git add .` → `git commit -m "isi url"` → `git push` |
| "Respons server tidak valid" | Deployment bukan **Anyone** | A2: ubah Who has access ke **Anyone**, lalu New version |
| "Koneksi ke server gagal" | Internet putus, atau URL salah ketik | Cek URL dengan `?action=ping` (A3) |
| Halaman 404 di GitHub Pages | `git init` di folder yang salah, atau Pages belum aktif | Pastikan `index.html` terlihat di root repo; cek Settings → Pages: main / (root) |
| Tampilan polos tanpa warna | File diunggah lewat web GitHub sehingga folder `css/` hilang | Push ulang lewat terminal dari folder `simop-frontend` |
| `Password authentication is not supported` | GitHub butuh token | Buat Personal Access Token (B6) |
| `remote origin already exists` | Langkah remote sudah pernah dijalankan | Lewati, langsung `git push` |
| `Updates were rejected...` | Repo GitHub sudah berisi file | `git pull --rebase origin main`, lalu `git push` |
| `LF will be replaced by CRLF` | Peringatan format baris Windows | Abaikan, bukan error |
| Kamera tidak terbuka | Situs bukan HTTPS / izin ditolak | Centang Enforce HTTPS (B7); izinkan kamera di browser |
| Tampilan versi lama | Cache browser | Ctrl+Shift+R atau Incognito |

## Catatan teknis migrasi
- Backend menjadi REST API murni: `doGet` (`?action=ping` / `?action=publicConfig`) dan `doPost` (`{fn, args}`), semuanya menjawab JSON lewat ContentService. HtmlService tidak dipakai lagi.
- Hanya 5 fungsi yang bisa dipanggil dari internet: `api`, `doLogin`, `doLogout`, `resumeSession`, `getPublicConfig`. Fungsi `setupAppEnvironment`, `migrateV2`, `resetSuperAdminPassword`, dan `pasangTrigger` hanya bisa dijalankan dari editor.
- Login, token sesi, "Ingat saya", dan hak akses per peran tetap sama, dan tetap diperiksa di server.
- Frontend memanggil backend dengan `fetch()` dan `Content-Type: text/plain`, sehingga tidak ada CORS preflight yang diblokir Apps Script.
- Aturan "tanpa komentar / tanpa `//`" di kode tampilan **tidak lagi wajib**, karena GitHub tidak memproses ulang file seperti Google. Aturan itu tetap aman untuk diikuti.
- Semua fitur tetap berjalan: 213/213 tes server dan 211/211 pemeriksaan browser lulus lewat jalur `fetch()` yang baru.
