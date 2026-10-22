import { createClient } from '@supabase/supabase-js';

const url = __SUPABASE_URL__;
const anonKey = __SUPABASE_ANON_KEY__;

export const isConfigured = Boolean(url && anonKey);
export const supabase = isConfigured ? createClient(url, anonKey) : null;

let workspaceId = null;

export function setWorkspaceId(value) {
  workspaceId = value || null;
}

export async function loadProfile(userId) {
  const { data, error } = await supabase.from('profiles')
    .select('id, email, role, workspace_id').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function loadSettings() {
  const { data, error } = await supabase.from('cashflow_settings')
    .select('id, opening_balance, opening_balance_date').maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSettings(values) {
  const { data, error } = await supabase.from('cashflow_settings')
    .upsert({ ...values, workspace_id: workspaceId }, { onConflict: 'workspace_id' })
    .select('id, opening_balance, opening_balance_date').single();
  if (error) throw error;
  return data;
}

export async function loadTransactions() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('cashflow_transactions')
      .select('id, transaction_date, kind, category, requester, description, amount, created_at')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function saveTransaction(values, id) {
  const query = id
    ? supabase.from('cashflow_transactions').update(values).eq('id', id)
    : supabase.from('cashflow_transactions').insert({ ...values, workspace_id: workspaceId });
  const { data, error } = await query.select('id, transaction_date, kind, category, requester, description, amount, created_at').single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('cashflow_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function loadInvoices() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('cashflow_invoices')
      .select('id, contract_id, invoice_date, due_date, paid_date, customer, invoice_number, po_number, amount, paid_amount, created_at')
      .order('customer', { ascending: true })
      .order('invoice_date', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function loadCustomerContracts() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('cashflow_customer_contracts')
      .select('id, customer, contract_amount, created_at')
      .order('customer', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function saveCustomerContract(values, id) {
  const query = id
    ? supabase.from('cashflow_customer_contracts').update(values).eq('id', id)
    : supabase.from('cashflow_customer_contracts').insert({ ...values, workspace_id: workspaceId });
  const { data, error } = await query
    .select('id, customer, contract_amount, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function saveInvoice(values, id) {
  const query = id
    ? supabase.from('cashflow_invoices').update(values).eq('id', id)
    : supabase.from('cashflow_invoices').insert({ ...values, workspace_id: workspaceId });
  const { data, error } = await query
    .select('id, contract_id, invoice_date, due_date, paid_date, customer, invoice_number, po_number, amount, paid_amount, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('cashflow_invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function loadInputLogs(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, monthNumber, 1)).toISOString();
  const { data, error } = await supabase.from('input_logs')
    .select('id, actor_email, table_name, record_id, action, changes, created_at')
    .gte('created_at', from).lt('created_at', to)
    .order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data || [];
}

export async function loadWorkspaceUsers() {
  const { data, error } = await supabase.rpc('list_workspace_users');
  if (error) throw error;
  return data || [];
}

export async function setWorkspaceUserRole(userId, role) {
  const { error } = await supabase.rpc('set_workspace_user_role', {
    target_user_id: userId,
    new_role: role,
  });
  if (error) throw error;
}
