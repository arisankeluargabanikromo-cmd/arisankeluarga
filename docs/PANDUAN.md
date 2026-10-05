# Panduan Implementasi FamilyHub: GitHub → Supabase → Vercel

Estimasi waktu: 30–45 menit. Semua layanan memiliki paket gratis yang cukup untuk keluarga besar.

## 1. Cara kerja sistem

```
Browser (HTML/CSS/JS di /public)
        │  fetch /api/...
        ▼
Vercel Functions (/api/[r].js)  ── login, aturan arisan, pengundian
        │                    │
        ▼                    ▼
Supabase Postgres        Supabase Storage
(data keluarga)          (foto, bucket "galeri")
```

GitHub menyimpan kode. Setiap kali Anda `git push`, Vercel otomatis membangun ulang dan merilis versi baru. Data tersimpan di Supabase, jadi deploy ulang tidak menghapus data.

Yang perlu disiapkan: akun GitHub, Supabase, dan Vercel (daftar Vercel dengan akun GitHub agar mudah terhubung), serta Git dan Node.js 20+ jika ingin mencoba di komputer sendiri.

## 2. Tahap 1: GitHub

1. Buka github.com → **New repository** → nama `familyhub` → pilih **Private** → **Create repository** (jangan centang README/.gitignore, karena sudah ada di proyek).
2. Ekstrak zip proyek, buka terminal di folder `familyhub`, lalu jalankan:

```bash
git init
git add .
git commit -m "FamilyHub pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/familyhub.git
git push -u origin main
```

Pastikan file `.env` atau `.env.local` tidak ikut terunggah (sudah dicegah oleh `.gitignore`). Jangan pernah menaruh kunci rahasia di GitHub.

## 3. Tahap 2: Supabase

### 3.1 Buat project
1. Buka supabase.com → **New project**.
2. **Region: Southeast Asia (Singapore)**. Region yang dekat dengan Vercel `sin1` membuat aplikasi jauh lebih cepat.
3. Buat **Database password** yang kuat, lalu **simpan di tempat aman**. Password ini dipakai di langkah 3.3.
4. Tunggu project selesai dibuat (±2 menit).

### 3.2 Buat tabel dan bucket foto
1. Menu **SQL Editor** → **New query**.
2. Buka file `supabase/schema.sql` dari proyek, salin seluruh isinya, tempel, lalu klik **Run**.
3. Hasilnya harus "Success". Cek di **Table Editor**: tabel `members`, `rounds`, `payments`, `draws`, `transactions`, `events`, `announcements`, `photos`, `login_fails` sudah ada. Di **Storage** akan ada bucket `galeri`.

File ini aman dijalankan ulang. Ia juga mengaktifkan **Row Level Security** pada semua tabel, sehingga data tidak bisa dibaca lewat API publik Supabase. Jangan dimatikan.

### 3.3 Ambil 3 nilai yang dibutuhkan
Dashboard Supabase dapat berubah tampilan. Bila nama menu sedikit berbeda, cari kata kuncinya.

| Nilai | Lokasi | Contoh |
|---|---|---|
| `DATABASE_URL` | Tombol **Connect** di bagian atas dashboard → **Transaction pooler** (port **6543**) | `postgresql://postgres.abcd:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | **Project Settings → API** (Project URL) | `https://abcd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings → API Keys**: kunci `service_role` (atau "secret key" pada tampilan baru) | `eyJ...` |

Catatan penting:
- Ganti `[PASSWORD]` dengan password database Anda. Jika berisi simbol seperti `@ # / :`, ubah menjadi kode URL (`@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`). Cara termudah: pakai password berisi huruf dan angka saja.
- **Wajib Transaction pooler (port 6543).** Koneksi langsung (port 5432) memakai IPv6 dan sering gagal dari Vercel.
- `service_role` / secret key adalah **kunci master**. Hanya boleh ada di Environment Variables Vercel, tidak di kode, GitHub, atau chat.

## 4. Tahap 3: Vercel

1. Buka vercel.com → **Add New → Project** → pilih repo `familyhub` → **Import**.
2. **Framework Preset: Other**. Biarkan Build Command dan Output Directory kosong (sudah diatur oleh `vercel.json`).
3. Buka bagian **Environment Variables**, tambahkan 5 variabel (Environment: Production, Preview, Development dicentang semua):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | Transaction pooler dari langkah 3.3 |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci service_role / secret |
| `AUTH_SECRET` | String acak panjang. Buat di terminal dengan `openssl rand -hex 32` |
| `SETUP_KEY` | Kata sandi rahasia pilihan Anda (dipakai sekali untuk membuat admin) |

4. Klik **Deploy**. Setelah selesai, Vercel memberi alamat seperti `familyhub-xxxx.vercel.app`.

Jika Anda menambah atau mengubah variabel setelah deploy, lakukan **Deployments → ⋯ → Redeploy** agar terbaca.

## 5. Tahap 4: Penyiapan awal aplikasi

1. Buka alamat Vercel Anda. Layar **Pengaturan awal** muncul.
2. Isi **Kunci setup** (nilai `SETUP_KEY`), nama, username, dan password admin (minimal 8 karakter) → **Buat admin**. Anda langsung masuk.
3. Untuk keamanan, setelah admin dibuat Anda boleh menghapus `SETUP_KEY` dari Vercel. Setup tidak bisa dijalankan lagi selama sudah ada admin.
4. Isi data berurutan:
   - **Anggota** → **＋ Anggota**: tambah anggota dengan generasi dan orang tua (membentuk Silsilah). Beri *username* dan *password* agar anggota bisa login, atau biarkan kosong untuk anggota yang tidak perlu akun.
   - **Arisan → Atur putaran**: isi iuran per orang, tanggal, dan lokasi acara bulan ini.
   - **Agenda** dan **Pengumuman**: isi sesuai kebutuhan.
5. Bagikan alamat situs dan akun ke anggota. Mereka bisa mengganti password lewat tombol **Ganti password** di sidebar.

### Alur bulanan
1. Atur putaran bulan baru (iuran, tanggal, lokasi).
2. Catat pembayaran: **Arisan → Catat lunas** per anggota.
3. Pada hari acara: **Pengocokan Digital → Mulai pengocokan**. Hasil tercatat permanen dan hadiah otomatis masuk sebagai pengeluaran di **Keuangan**.
4. Catat pengeluaran acara di **Keuangan**, unggah foto di **Dokumentasi**, cetak rekap di **Laporan**.

### Aturan pengundian
Peserta eligible adalah anggota yang **aktif**, **ikut arisan**, **sudah bayar** bulan itu, dan **belum menang** di siklus berjalan. Pengacakan terjadi di server, satu kali per putaran. Setelah semua peserta pernah menang, siklus baru dimulai otomatis.

## 6. Menjalankan di komputer sendiri (opsional)

```bash
npm install
npm i -g vercel
vercel link          # hubungkan ke project Vercel Anda
vercel env pull .env.local   # unduh environment variables
vercel dev           # buka http://localhost:3000
```

Gunakan database yang sama dengan produksi dengan hati-hati. Untuk latihan, buat project Supabase kedua khusus uji coba.

## 7. Memperbarui aplikasi

Ubah kode → `git add . && git commit -m "pesan" && git push`. Vercel otomatis merilis. Jika ada perubahan tabel, tulis perintah SQL-nya (mis. `alter table ... add column if not exists ...`) dan jalankan di SQL Editor Supabase **sebelum** push.

## 8. Backup dan keamanan

- **Backup:** di Supabase, cek menu **Database → Backups**. Ketersediaan backup otomatis bergantung pada paket Anda. Untuk paket gratis, ekspor berkala: **Table Editor → pilih tabel → Export CSV** (terutama `members`, `payments`, `draws`, `transactions`) dan simpan sebulan sekali.
- **Paket gratis Supabase** dapat dijeda otomatis bila lama tidak ada aktivitas. Bila situs tiba-tiba error setelah lama tidak dipakai, buka dashboard Supabase dan klik **Restore/Resume**.
- Ganti `AUTH_SECRET` akan mengeluarkan semua pengguna dari sesi (berguna jika ada kecurigaan).
- Pakai repo GitHub **Private**. Aktifkan 2FA di GitHub, Vercel, dan Supabase.
- Foto di bucket `galeri` dapat dibuka siapa pun yang memegang alamat lengkapnya (nama file acak). Jangan unggah dokumen sensitif (KTP, dll.).
- Batas login: 5 kali gagal (username + IP) dikunci 15 menit.

## 9. Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| Layar putih / "Gagal memuat" | Buka Vercel → **Logs**. Hampir selalu karena environment variable belum diisi atau belum Redeploy. |
| `ENOTFOUND` / `ETIMEDOUT` / koneksi database gagal | Pakai **Transaction pooler port 6543**, bukan koneksi langsung. Cek password dan kode URL simbolnya. |
| `relation "members" does not exist` | `schema.sql` belum dijalankan di Supabase (langkah 3.2). |
| `password authentication failed` | Password di `DATABASE_URL` salah. Reset di Supabase: **Database → Settings → Reset password**, lalu perbarui di Vercel dan Redeploy. |
| Setup: "Kunci setup salah" | `SETUP_KEY` di Vercel belum ada/berbeda, atau belum Redeploy. |
| Terus kembali ke layar login | `AUTH_SECRET` belum diisi. Pastikan situs dibuka lewat `https://`. |
| Unggah foto: "Supabase Storage belum diatur" | `SUPABASE_URL` atau `SUPABASE_SERVICE_ROLE_KEY` kosong. Cek juga bucket `galeri` ada di Storage. |
| Foto HEIC (iPhone) gagal | Browser tidak bisa membacanya. Gunakan Safari, atau ubah foto ke JPG dulu. |
| "Belum ada peserta eligible" | Peserta harus aktif, ikut arisan, sudah dicatat lunas bulan itu, dan belum menang di siklus ini. |
| "Terlalu banyak percobaan" | Tunggu 15 menit. Admin juga bisa menghapus baris di tabel `login_fails` lewat Supabase. |

## 10. Struktur folder

```
familyhub/
├── api/[r].js            # Seluruh endpoint API (members, payments, draws, ...)
├── lib/
│   ├── db.js             # Koneksi Postgres Supabase
│   ├── auth.js           # Hash password, token sesi
│   └── storage.js        # Unggah/hapus foto di Supabase Storage
├── public/               # Frontend statis
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── core.js       # Helper, API client, modal & form
│       ├── views.js      # Tampilan tiap halaman
│       ├── actions.js    # Form, galeri, pengundian
│       └── main.js       # Login/setup & inisialisasi
├── supabase/schema.sql   # Skema database (jalankan sekali)
├── docs/PANDUAN.md       # Panduan ini
├── vercel.json           # Region Singapura, header keamanan
├── package.json
└── .env.example          # Daftar variabel lingkungan
```
