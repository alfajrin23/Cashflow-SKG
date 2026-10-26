alter table public.cashflow_transactions
  drop constraint if exists cashflow_transactions_category_check;

alter table public.cashflow_transactions
  add constraint cashflow_transactions_category_check
  check (
    category = btrim(category)
    and char_length(category) between 1 and 80
  );
