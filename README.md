# SIMOP Gontor Kampus 3 — Frontend

Sistem Informasi Manajemen Operasional Pembangunan.

- **Frontend** (repository ini): HTML/CSS/JavaScript statis di GitHub Pages
- **Backend**: Google Apps Script sebagai REST API JSON (`doGet` / `doPost`), data di Google Sheets & Drive

## Struktur

```
index.html             Halaman aplikasi (logo tertanam)
css/style.css          Seluruh tampilan (tema terang & gelap)
js/config.js           ← isi GAS_URL (URL Web App /exec) di sini
js/api.js              Penghubung fetch() ke Apps Script
js/app.js              Logika aplikasi
manifest.webmanifest   Supaya bisa dipasang di layar utama HP
sw.js                  Service worker (membuka aplikasi lebih cepat, tidak menyimpan data)
icons/                 Ikon aplikasi
```

## Pasang di HP

- **Android (Chrome):** buka situs → menu ⋮ → *Instal aplikasi* / *Tambahkan ke layar utama*. Di aplikasi juga ada tombol **Pasang di HP** di menu samping.
- **iPhone (Safari):** tombol Bagikan → *Tambah ke Layar Utama*.

## WhatsApp (Fonnte)

Super Admin membuka menu **Kirim WhatsApp → Pengaturan Fonnte**, mengisi token dari fonnte.com (menu Device), lalu memilih grup tujuan lewat tombol *Ambil daftar grup*. Token disimpan di server Apps Script, bukan di repository ini.

## Konfigurasi

Edit `js/config.js`:

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

## Keamanan

Repository ini publik, tetapi **tidak memuat kredensial apa pun**. Semua data dilindungi login dan hak akses per peran yang diperiksa di server Apps Script.
