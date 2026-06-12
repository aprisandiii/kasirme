# KasirMe — Panduan Setup Free Trial + Supabase

## Langkah-langkah Setup

### 1. Buat Tabel di Supabase

1. Login ke [supabase.com](https://supabase.com) dan buka project Anda
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New query**, lalu paste seluruh isi file `supabase_migration.sql`
4. Klik **Run** — tabel `trial_users` akan terbuat otomatis

### 2. Ambil Kredensial Supabase

1. Di Supabase, klik **Project Settings → API**
2. Salin:
   - **Project URL** → bentuknya `https://xxxxxxxxxx.supabase.co`
   - **anon public key** → string panjang yang diawali `eyJ...`

### 3. Isi Konfigurasi di Kode

Buka file `src/modules/trial.js`, temukan bagian ini di paling atas:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
const TRIAL_DAYS        = 7   // ubah ke 14 jika ingin 14 hari
```

Ganti nilainya dengan milik Anda, contoh:
```js
const SUPABASE_URL      = 'https://abcdefghij.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
const TRIAL_DAYS        = 7
```

### 4. Ganti Nomor WhatsApp

Di file `src/main.js`, cari semua kemunculan:
```
https://wa.me/628XXXXXXXXXX
```
Ganti dengan nomor WhatsApp bisnis Anda, contoh:
```
https://wa.me/6281234567890
```

### 5. Build & Deploy

```bash
npm install
npm run build
```
Upload folder `dist/` ke hosting Anda (Netlify, Vercel, cPanel, dll).

---

## Cara Kerja Sistem Trial

```
Pengguna buka website pertama kali
        ↓
Device ID dibuat & disimpan di localStorage
        ↓
Cek ke Supabase → belum ada record?
        ↓
Buat record baru (trial_start = sekarang)
        ↓
Hitung: days_elapsed = hari ini − trial_start
        ↓
days_left = TRIAL_DAYS − days_elapsed
        ↓
┌─────────────────────────────────────┐
│ status = 'paid'  → Masuk normal     │
│ days_left > 0    → Masuk + banner   │
│ days_left = 0    → Layar terkunci   │
└─────────────────────────────────────┘
```

### Jika tidak ada koneksi internet
Sistem akan membaca **cache lokal** (localStorage). Jika cache ada, perhitungan trial tetap jalan. Jika tidak ada cache sama sekali, diberi **1 hari grace period** agar tidak memblokir pengguna baru.

---

## Cara Upgrade Pengguna ke Status Berbayar

### Cara Manual (via Supabase Dashboard)
1. Buka **Table Editor → trial_users**
2. Cari baris berdasarkan `device_id` atau `email` pengguna
3. Ubah kolom `status` dari `trial` → `paid`
4. Isi kolom `plan` dengan `basic` atau `pro`

### Cara via SQL Editor
```sql
UPDATE public.trial_users
SET status = 'paid', plan = 'basic'
WHERE email = 'pelanggan@email.com';
```

### Cara Otomatis (Payment Gateway)
Integrasikan webhook dari **Midtrans / Xendit / dll.** yang memanggil Supabase dengan `service_role` key setelah pembayaran berhasil.

---

## Monitoring Pengguna Trial

Jalankan query ini di SQL Editor Supabase:
```sql
SELECT * FROM public.trial_summary;
```

Kolom yang tersedia:
| Kolom | Keterangan |
|-------|-----------|
| `device_id` | ID unik perangkat |
| `email` | Email (jika diisi saat upgrade) |
| `status` | `trial` atau `paid` |
| `days_elapsed` | Sudah berapa hari pakai |
| `days_left` | Sisa hari trial |
| `joined_at` | Tanggal pertama kali pakai |

---

## Troubleshooting

**"Supabase error 401"** → Periksa SUPABASE_ANON_KEY sudah benar

**"Supabase error 404"** → Tabel `trial_users` belum dibuat, jalankan migration SQL

**"Supabase error 42501"** → RLS policy belum aktif, jalankan ulang bagian `CREATE POLICY` di SQL migration

**Layar terkunci padahal trial belum habis** → Hapus localStorage: buka DevTools → Application → Local Storage → hapus `km_trial_cache` → refresh
