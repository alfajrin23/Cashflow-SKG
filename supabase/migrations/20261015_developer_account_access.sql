-- Jalankan di SQL Editor untuk menambahkan pengelolaan akun pada database yang sudah dibuat.
create or replace function public.list_workspace_users()
returns table (user_id uuid, email text, role text, workspace_id uuid, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  caller_workspace uuid;
  caller_role text;
begin
  select p.workspace_id, p.role
  into caller_workspace, caller_role
  from public.profiles p
  where p.id = (select auth.uid());

  if caller_role is distinct from 'developer' or caller_workspace is null then
    raise exception 'Akses developer diperlukan.' using errcode = '42501';
  end if;

  return query
    select p.id, p.email, p.role, p.workspace_id, p.created_at
    from public.profiles p
    where p.workspace_id is null or p.workspace_id = caller_workspace
    order by p.created_at desc;
end;
$$;

create or replace function public.set_workspace_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_workspace uuid;
  caller_role text;
  target_email text;
  previous_role text;
  previous_workspace uuid;
begin
  select p.workspace_id, p.role
  into caller_workspace, caller_role
  from public.profiles p
  where p.id = (select auth.uid());

  if caller_role is distinct from 'developer' or caller_workspace is null then
    raise exception 'Akses developer diperlukan.' using errcode = '42501';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Role akun aktif tidak dapat diubah dari menu ini.' using errcode = '42501';
  end if;
  if new_role is null or new_role not in ('developer', 'staff') then
    raise exception 'Peran tidak dikenal.' using errcode = '22023';
  end if;

  select p.email, p.role, p.workspace_id
  into target_email, previous_role, previous_workspace
  from public.profiles p
  where p.id = target_user_id
    and (p.workspace_id is null or p.workspace_id = caller_workspace);
  if not found then
    raise exception 'Akun tidak ditemukan atau sudah terhubung ke ruang kerja lain.' using errcode = '22023';
  end if;

  if previous_role = new_role and previous_workspace = caller_workspace then
    return;
  end if;

  update public.profiles p
  set role = new_role, workspace_id = caller_workspace
  where p.id = target_user_id
    and (p.workspace_id is null or p.workspace_id = caller_workspace);
  if not found then
    raise exception 'Akun tidak ditemukan atau sudah terhubung ke ruang kerja lain.' using errcode = '22023';
  end if;

  insert into public.input_logs (workspace_id, actor_id, actor_email, table_name, record_id, action, changes)
  values (
    caller_workspace,
    (select auth.uid()),
    coalesce(auth.jwt() ->> 'email', ''),
    'profiles',
    target_user_id,
    'update',
    jsonb_build_object(
      'email', target_email,
      'role', jsonb_build_object('sebelum', previous_role, 'sesudah', new_role),
      'workspace_access', jsonb_build_object('sebelum', previous_workspace, 'sesudah', caller_workspace)
    )
  );
end;
$$;

revoke all on function public.list_workspace_users() from public, anon;
grant execute on function public.list_workspace_users() to authenticated;
revoke all on function public.set_workspace_user_role(uuid, text) from public, anon;
grant execute on function public.set_workspace_user_role(uuid, text) to authenticated;
