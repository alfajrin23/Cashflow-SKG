# Cashflow SKG

Web app pencatatan arus kas PT Swatama Karya Gemilang. Aplikasi berdiri sendiri dan memakai Supabase untuk autentikasi serta penyimpanan data.

## Jalankan secara lokal

1. Buat project Supabase, lalu buka **SQL Editor** dan jalankan seluruh isi `supabase/schema.sql`.
2. Isi URL project dan anon key Supabase di `.env.local`.
3. Jalankan `npm install`, lalu `npm run dev`.
4. Buat akun melalui **Daftar akun**. Akun baru belum mendapat akses workspace sampai developer mengaktifkannya.

Contoh format `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Gunakan **anon/publishable key**. Jangan masukkan `service_role` key ke aplikasi web.

## Bootstrap role pertama

Setelah mendaftar dan memastikan akun sudah ada di Supabase Auth, jalankan query ini di SQL Editor. Ganti email dengan email akun developer pertama:

```sql
update public.profiles p
set role = 'developer',
    workspace_id = 'c45f0000-0000-4000-8000-000000000001'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('developer@perusahaan.com');
```

Keluar lalu masuk kembali. Developer dapat membuka **Log Input**. Untuk memberi akses workspace kepada akun staff yang telah mendaftar, jalankan:

```sql
update public.profiles p
set role = 'staff',
    workspace_id = 'c45f0000-0000-4000-8000-000000000001'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('staff@perusahaan.com');
```

Role dan akses workspace dikelola melalui Supabase SQL Editor. Log input hanya bisa dibaca oleh developer; kebijakan Row Level Security Supabase tetap menolak pembacaan dari akun staff, termasuk bila endpoint dipanggil langsung.

## Kategori kas

Material; Upah / Kasbon Tukang; Upah Staff Pelaksana; Upah Tim Spesialis; Alat; Operasional; Subcont; Listrik; Lain-Lain; Fee; Kk; Pajak; Atk; Aset; Cost Subcont; Cost Listrik; Cost Lain Lain.

Arus **uang masuk/keluar** dipilih terpisah dari kategori agar daftar kategori mengikuti referensi.
