create table if not exists public.cashflow_customer_contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  customer text not null check (length(trim(customer)) > 0),
  contract_amount numeric(16, 2) not null check (contract_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, customer)
);

create index if not exists cashflow_customer_contracts_workspace_customer_idx
  on public.cashflow_customer_contracts (workspace_id, customer);

alter table public.cashflow_customer_contracts enable row level security;
revoke all on public.cashflow_customer_contracts from anon;
grant select, insert, update, delete on public.cashflow_customer_contracts to authenticated;

drop policy if exists cashflow_workspace_member on public.cashflow_customer_contracts;
create policy cashflow_workspace_member on public.cashflow_customer_contracts
  for all to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

drop trigger if exists set_updated_at on public.cashflow_customer_contracts;
create trigger set_updated_at before update on public.cashflow_customer_contracts
  for each row execute function public.touch_updated_at();

drop trigger if exists capture_input_log on public.cashflow_customer_contracts;
create trigger capture_input_log after insert or update or delete on public.cashflow_customer_contracts
  for each row execute function public.write_input_log();

alter table public.cashflow_invoices
  add column if not exists contract_id uuid references public.cashflow_customer_contracts(id) on delete set null;

create index if not exists cashflow_invoices_contract_idx
  on public.cashflow_invoices (workspace_id, contract_id, invoice_date);
