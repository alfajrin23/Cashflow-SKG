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

Setelah mendaftar dan memastikan akun sudah ada di Supabase Auth, jalankan `supabase/grant_developer_access.sql` di SQL Editor, atau gunakan query di bawah ini dengan email akun developer pertama:

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

Developer dapat mengelola akun berikutnya dari menu **Akun & akses**. Akun yang mendaftar muncul sebagai *Menunggu akses*; pilih role lalu tekan **Berikan akses**. Perubahan role akun aktif memakai tombol **Simpan role**. Akun developer yang sedang masuk tidak dapat mengubah rolenya sendiri.

Jika database sudah dibuat sebelum pengelolaan akun tersedia, jalankan `supabase/migrations/20261015_developer_account_access.sql` di SQL Editor. Untuk instalasi baru, fungsi tersebut sudah ada di `supabase/schema.sql`.

Menu **Invoice** menyimpan invoice customer pada workspace Cashflow SKG. Jika database sudah berjalan, jalankan `supabase/migrations/20261023_customer_invoices.sql` di SQL Editor sebelum membuka menu tersebut. Instalasi baru sudah mendapat tabel ini dari `supabase/schema.sql`.

Kategori Cashflow mendukung kategori bawaan dan kategori yang diketik pengguna. Jika database sudah berjalan, jalankan `supabase/migrations/20261026_cashflow_custom_categories.sql` di SQL Editor agar kategori bebas dapat disimpan. Instalasi baru perlu menjalankan migrasi ini setelah `supabase/schema.sql`.

Buku kas mendukung beberapa rekening dengan saldo awal masing-masing. Untuk database yang sudah berjalan, jalankan `supabase/migrations/20261030_cashflow_multiple_accounts_and_office_receipts.sql` di SQL Editor sebelum menggunakan fitur ini. Migrasi membuat buku kas awal **Rekening SKG**, memindahkan saldo awal lama, dan mengaitkan seluruh transaksi lama ke rekening tersebut. Instalasi baru perlu menjalankan migrasi ini setelah `supabase/schema.sql`. Status bukti yang sudah dikirim ke office disimpan pada setiap transaksi dan dapat diubah dari daftar transaksi.

## Kategori kas

Material; Upah / Kasbon Tukang; Upah Staff Pelaksana; Upah Tim Spesialis; Alat; Operasional; Giro; Subcont; Listrik; Lain-Lain; Fee; Kk; Pajak; Atk; Aset; Cost Subcont; Cost Listrik; Cost Lain Lain. Pengguna juga dapat mengetik kategori baru saat mencatat transaksi.

Arus **uang masuk/keluar** dipilih terpisah dari kategori agar daftar kategori mengikuti referensi.
