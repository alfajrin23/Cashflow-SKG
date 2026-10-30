begin;

create table if not exists public.cashflow_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  bank_name text not null default '' check (char_length(bank_name) <= 120),
  account_number text not null default '' check (char_length(account_number) <= 80),
  opening_balance numeric(16, 2) not null default 0,
  opening_balance_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

-- Preserve the current shared balance and attach legacy transactions to the SKG account.
insert into public.cashflow_accounts (
  workspace_id, name, bank_name, account_number, opening_balance, opening_balance_date
)
select w.id, 'Rekening SKG', 'SKG', '', coalesce(s.opening_balance, 0), coalesce(s.opening_balance_date, current_date)
from public.workspaces w
left join public.cashflow_settings s on s.workspace_id = w.id
where not exists (
  select 1 from public.cashflow_accounts a where a.workspace_id = w.id
);

alter table public.cashflow_transactions
  add column if not exists account_id uuid,
  add column if not exists receipt_sent_to_office boolean not null default false;

update public.cashflow_transactions t
set account_id = (
  select a.id
  from public.cashflow_accounts a
  where a.workspace_id = t.workspace_id
  order by a.created_at, a.id
  limit 1
)
where t.account_id is null;

alter table public.cashflow_transactions
  alter column account_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cashflow_transactions_workspace_account_fkey'
      and conrelid = 'public.cashflow_transactions'::regclass
  ) then
    alter table public.cashflow_transactions
      add constraint cashflow_transactions_workspace_account_fkey
      foreign key (workspace_id, account_id)
      references public.cashflow_accounts (workspace_id, id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists cashflow_transactions_account_date_idx
  on public.cashflow_transactions (workspace_id, account_id, transaction_date desc, created_at desc);

alter table public.cashflow_accounts enable row level security;
revoke all on public.cashflow_accounts from anon;
grant select, insert, update, delete on public.cashflow_accounts to authenticated;

drop policy if exists cashflow_workspace_member on public.cashflow_accounts;
create policy cashflow_workspace_member on public.cashflow_accounts
  for all to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

drop trigger if exists set_updated_at on public.cashflow_accounts;
create trigger set_updated_at before update on public.cashflow_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists capture_input_log on public.cashflow_accounts;
create trigger capture_input_log after insert or update or delete on public.cashflow_accounts
  for each row execute function public.write_input_log();

commit;
