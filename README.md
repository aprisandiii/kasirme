# KasirMe v1.2
**Aplikasi kasir untuk UMKM — Kelola Toko Lebih Mudah, Jualan Lebih Tenang**

---

## Isi Paket

| File | Keterangan |
|------|-----------|
| `kasirme-fixed/` | Source code lengkap |
| `kasirme-fixed/dist/` | Hasil build siap hosting |
| `kasirme-v1.1-dist.zip` | Folder dist saja — langsung upload |
| `KasirMe_Tutorial.pdf` | Panduan lengkap untuk pengguna non-teknis |

---

## Cara Pasang di Netlify (Gratis, 2 Menit)

1. Daftar gratis di [netlify.com](https://netlify.com)
2. Buka [app.netlify.com/drop](https://app.netlify.com/drop)
3. Extract `kasirme-v1.1-dist.zip` — dapatkan folder `dist/`
4. Drag & drop folder `dist/` ke area Netlify
5. Aplikasi langsung online dengan URL otomatis

**Login default:** username `admin` / password `admin123`  
Segera ganti di **Pengaturan → Akun Admin** setelah masuk.

---

## Cara Pasang di VPS / cPanel

```bash
npm install
npm run build
# Upload isi folder dist/ ke public_html/
```

---

## Struktur Proyek

```
kasirme/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js              # Boot: migrate → load → seed → login
    ├── app.js               # Router + global bridge
    ├── modules/
    │   ├── state.js         # State + semua actions
    │   ├── storage.js       # IndexedDB (idb) — data permanen
    │   └── auth.js          # Login/logout + hash password
    ├── pages/
    │   ├── dashboard.js
    │   ├── produk.js
    │   ├── kasir.js
    │   ├── riwayat.js
    │   ├── laporan.js
    │   ├── stok.js
    │   └── pengaturan.js
    ├── utils/index.js
    └── styles/
        ├── variables.css    # Edit warna di sini
        ├── base.css
        ├── components.css
        ├── layout.css
        └── pages.css
```

---

## Fitur

| Fitur | Keterangan |
|-------|-----------|
| Dashboard | Metrik harian, grafik 7 hari, alert stok menipis |
| Kasir | Tile produk, keranjang, diskon, kembalian, QRIS/Transfer/Tunai |
| Produk | CRUD produk, import CSV, kategori kustom |
| Riwayat | Filter transaksi, lihat struk, retur/void |
| Laporan | Penjualan, produk terlaris, laba/rugi, peak hours, ekspor CSV |
| Stok | Penyesuaian manual, riwayat log |
| Pengaturan | Info toko, akun admin, kategori, backup/restore |

---

## Yang Baru di v1.1

- **IndexedDB** — data tidak hilang meski hapus cache (kapasitas jauh lebih besar dari localStorage)
- **Password di-hash SHA-256** — tidak tersimpan plain text
- **Migrasi otomatis** — data lama dari localStorage dipindah otomatis
- **Backup aman** — password tidak ikut ter-ekspor

---

## Catatan Teknis

- Data: **IndexedDB** via library `idb`
- Password: **SHA-256** via Web Crypto API (browser native, tanpa library tambahan)
- XSS: semua input dilewatkan `esc()` sebelum masuk innerHTML
- `window.__kasirme` = global bridge untuk event handler di innerHTML

---

## Changelog v1.2

- **Keamanan**: Hapus hint kredensial default dari halaman login, setup akun admin saat pertama kali jalan, paksa password minimal 6 karakter, logout otomatis setelah tidak aktif (configurable)
- **Konten**: Halaman landing/promosi sebelum login, info penyimpanan diperbarui (IndexedDB)
- **UX**: Halaman 404 internal, konfirmasi reset data 3 langkah, validasi produk lebih ketat (duplikat nama, modal > harga jual)
- **Fitur baru**: Mode gelap, badge notifikasi stok hampir habis di sidebar, PWA (installable, app icon, manifest, service worker untuk mode offline dasar)
