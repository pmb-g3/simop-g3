# SIMOP Gontor Kampus 3 — Frontend

Sistem Informasi Manajemen Operasional Pembangunan.

- **Frontend** (repository ini): HTML/CSS/JavaScript statis di GitHub Pages
- **Backend**: Google Apps Script sebagai REST API JSON (`doGet` / `doPost`), data di Google Sheets & Drive

## Struktur

```
index.html        Halaman aplikasi (logo tertanam)
css/style.css     Seluruh tampilan
js/config.js      ← isi GAS_URL (URL Web App /exec) di sini
js/api.js         Penghubung fetch() ke Apps Script
js/app.js         Logika aplikasi
```

## Konfigurasi

Edit `js/config.js`:

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

## Keamanan

Repository ini publik, tetapi **tidak memuat kredensial apa pun**. Semua data dilindungi login dan hak akses per peran yang diperiksa di server Apps Script.
