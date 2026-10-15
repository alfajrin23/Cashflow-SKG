-- Jalankan satu kali di SQL Editor project Supabase Cashflow SKG.
-- Memberi dev@skg.com role developer dan akses ke workspace perusahaan.
update public.profiles p
set role = 'developer',
    workspace_id = 'c45f0000-0000-4000-8000-000000000001'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('dev@skg.com')
returning p.email, p.role, p.workspace_id;
