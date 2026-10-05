# FamilyHub — Arisan & Family Network

Frontend statis (`public/`) + API serverless Vercel (`api/[r].js`) + Postgres (Neon).

## Deploy (GitHub → Vercel)
1. Buat repo GitHub baru, lalu unggah seluruh isi folder ini (`git init && git add . && git commit -m "init" && git push`).
2. Di Vercel: **Add New → Project → Import** repo tersebut. Framework: **Other**. Klik Deploy.
3. Di Vercel: **Storage → Create → Neon (Postgres)** → hubungkan ke project ini. `DATABASE_URL` terisi otomatis.
4. **Settings → Environment Variables**, tambahkan:
   - `AUTH_SECRET` = string acak panjang (`openssl rand -hex 32`)
   - `SETUP_KEY` = kata sandi rahasia sekali pakai
5. **Storage → Create → Blob** (pilih akses **Public**) lalu hubungkan ke project ini. `BLOB_READ_WRITE_TOKEN` terisi otomatis. Ini untuk menu Dokumentasi.
6. **Deployments → Redeploy** agar variabel terbaca.
7. Buka situs Anda → layar *Pengaturan awal* muncul → isi `SETUP_KEY` dan buat akun admin. Tabel database dibuat otomatis.
8. Tambahkan anggota di menu **Anggota** (beri username/password agar mereka bisa login), atur iuran di **Arisan → Atur putaran**.

## Alur arisan bulanan
Atur putaran (iuran, tanggal, lokasi) → catat pembayaran → **Pengocokan** → catat hadiah ke pemenang di **Keuangan**.

## Aturan pengundian
Peserta eligible = aktif + peserta arisan + sudah bayar bulan itu + belum menang di siklus berjalan. Pengacakan memakai `crypto.randomInt` di server, satu kali per putaran (dijaga constraint database), disimpan beserta daftar peserta dan hash bukti. Setelah semua peserta menang, siklus baru dimulai otomatis.

## Fitur tambahan
- **Dokumentasi:** semua anggota yang login bisa mengunggah foto (otomatis dikecilkan ke maks. 1600 px sebelum diunggah); hanya admin yang bisa menghapus. File disimpan di Vercel Blob dengan alamat acak yang sulit ditebak.
- **Hadiah otomatis:** setiap undian mencatat pengeluaran sebesar total iuran putaran itu. Menghapus undian ikut membatalkan catatannya.
- **Batas login:** 5 kali gagal per username+IP dikunci 15 menit.
- **Ganti password:** tombol di sidebar untuk semua anggota.
- Skema database diperbarui otomatis saat aplikasi pertama kali jalan setelah deploy, tanpa langkah manual.

## Keamanan
Password di-hash (scrypt), sesi memakai cookie HttpOnly bertanda tangan HMAC, semua perubahan data hanya untuk admin dan dicek ulang ke database di setiap request. Seluruh teks pengguna di-escape di tampilan.
