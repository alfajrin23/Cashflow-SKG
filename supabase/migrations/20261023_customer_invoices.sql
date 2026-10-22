create table if not exists public.cashflow_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  invoice_date date not null,
  due_date date,
  paid_date date,
  customer text not null,
  invoice_number text not null,
  po_number text not null default '',
  amount numeric(16, 2) not null check (amount > 0),
  paid_amount numeric(16, 2) not null default 0 check (paid_amount >= 0 and paid_amount <= amount),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create index if not exists cashflow_invoices_workspace_due_idx
  on public.cashflow_invoices (workspace_id, due_date, customer);

alter table public.cashflow_invoices enable row level security;
revoke all on public.cashflow_invoices from anon;
grant select, insert, update, delete on public.cashflow_invoices to authenticated;

drop policy if exists cashflow_workspace_member on public.cashflow_invoices;
create policy cashflow_workspace_member on public.cashflow_invoices
  for all to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

drop trigger if exists set_updated_at on public.cashflow_invoices;
create trigger set_updated_at before update on public.cashflow_invoices
  for each row execute function public.touch_updated_at();

drop trigger if exists capture_input_log on public.cashflow_invoices;
create trigger capture_input_log after insert or update or delete on public.cashflow_invoices
  for each row execute function public.write_input_log();
