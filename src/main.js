import {
  deleteInvoice, deleteTransaction, isConfigured, loadInputLogs, loadInvoices, loadProfile, loadSettings,
  loadTransactions, loadWorkspaceUsers, saveInvoice, saveSettings, saveTransaction,
  setWorkspaceId, setWorkspaceUserRole, supabase,
} from './db.js';
import { formatAmountInput, parseAmountInput, statusForInvoice, today } from './helpers.js';
import { renderApp } from './views.js';
import './style.css';

const now = today();
const state = {
  configured: isConfigured, session: null, profile: null, profileLoading: false,
  profileError: '', authMode: 'login', authMessage: '', authMessageType: 'info',
  month: now.slice(0, 7), today: now, tab: 'dashboard', transactions: [], invoices: [],
  settings: null, inputLogs: [], profiles: [], category: '', kind: '', search: '', invoiceStatus: '',
  expandedInvoiceCustomer: null, invoicePeriod: '',
  incomeWeek: '', incomePlanPeriod: 'week',
  loading: false, busy: false, error: '', modal: null, toast: null,
};
const app = document.querySelector('#app');
let authGeneration = 0;

function render() {
  app.innerHTML = renderApp(state);
}

function notify(message, type = 'success') {
  state.toast = { message, type };
  render();
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => { state.toast = null; render(); }, 3500);
}

function message(error) {
  const text = String(error?.message || error || 'Terjadi kesalahan.');
  if (/row-level security|permission denied|42501/i.test(text)) return 'Akses ditolak. Pastikan akun sudah terhubung ke workspace Cashflow SKG.';
  if (/failed to fetch|network/i.test(text)) return 'Tidak dapat terhubung ke Supabase. Periksa koneksi dan konfigurasi .env.local.';
  return text;
}

async function loadData({ withLogs = false, withUsers = false, withInvoices = false } = {}) {
  if (!state.profile?.workspace_id) return;
  const userId = state.session?.user?.id;
  state.loading = true;
  state.error = '';
  render();
  try {
    const [settings, transactions, logs, profiles, invoices] = await Promise.all([
      loadSettings(),
      loadTransactions(),
      withLogs && state.profile.role === 'developer' ? loadInputLogs(state.month) : Promise.resolve(null),
      withUsers && state.profile.role === 'developer' ? loadWorkspaceUsers() : Promise.resolve(null),
      withInvoices ? loadInvoices() : Promise.resolve(null),
    ]);
    if (state.session?.user?.id !== userId) return;
    state.settings = settings;
    state.transactions = transactions;
    if (logs) state.inputLogs = logs;
    if (profiles) state.profiles = profiles;
    if (invoices) state.invoices = invoices;
  } catch (error) {
    if (state.session?.user?.id === userId) state.error = message(error);
  } finally {
    if (state.session?.user?.id === userId) {
      state.loading = false;
      render();
    }
  }
}

async function activateSession(session) {
  const request = ++authGeneration;
  state.session = session;
  state.profile = null;
  state.modal = null;
  state.error = '';
  state.inputLogs = [];
  state.profiles = [];
  state.transactions = [];
  state.invoices = [];
  state.settings = null;
  setWorkspaceId(null);
  if (!session) {
    state.profileLoading = false;
    render();
    return;
  }
  state.profileLoading = true;
  render();
  try {
    const profile = await loadProfile(session.user.id);
    if (request !== authGeneration) return;
    state.profile = profile;
    state.profileLoading = false;
    setWorkspaceId(profile.workspace_id);
    if (profile.workspace_id) await loadData({
      withLogs: state.tab === 'logs-input',
      withUsers: state.tab === 'accounts',
      withInvoices: state.tab === 'tagihan',
    });
    else render();
  } catch (error) {
    if (request !== authGeneration) return;
    state.profileLoading = false;
    state.profileError = message(error);
    render();
  }
}

function openTransaction(row = {}) {
  state.modal = { type: 'transaction', row };
  render();
}

function openInvoice(row = {}) {
  state.modal = { type: 'invoice', row };
  render();
}

function exportCsv() {
  const filtered = state.transactions.filter((row) => row.transaction_date?.slice(0, 7) === state.month
    && (!state.category || row.category === state.category)
    && (!state.kind || row.kind === state.kind)
    && (!state.search || `${row.category} ${row.requester} ${row.description}`.toLocaleLowerCase('id-ID').includes(state.search.toLocaleLowerCase('id-ID'))));
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [['Tanggal', 'Jenis', 'Kategori', 'Pengaju / Sumber', 'Keterangan', 'Nominal'],
    ...filtered.map((row) => [row.transaction_date, row.kind === 'credit' ? 'Uang masuk' : 'Uang keluar', row.category, row.requester, row.description, row.amount])];
  const csv = '\ufeff' + lines.map((line) => line.map(quote).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `cashflow-skg-${state.month}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportInvoicesCsv() {
  const term = state.search.trim().toLocaleLowerCase('id-ID');
  const rows = state.invoices.filter((row) => (!state.invoicePeriod || row.invoice_date?.slice(0, 7) === state.invoicePeriod)
    && (!state.invoiceStatus || statusForInvoice(row)[0] === state.invoiceStatus)
    && (!term || `${row.customer} ${row.invoice_number} ${row.po_number}`.toLocaleLowerCase('id-ID').includes(term)));
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [['Customer', 'No. invoice', 'No. PO', 'Tanggal invoice', 'Jatuh tempo', 'Nilai invoice', 'Sudah dibayar', 'Sisa', 'Status'],
    ...rows.map((row) => [row.customer, row.invoice_number, row.po_number, row.invoice_date, row.due_date,
      row.amount, row.paid_amount, Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0), statusForInvoice(row)[1]])];
  const csv = '\ufeff' + lines.map((line) => line.map(quote).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `invoice-customer-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function handleClick(event) {
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const { act, tab } = button.dataset;
  if (act === 'navigate') {
    if (['logs-input', 'accounts'].includes(tab) && state.profile?.role !== 'developer') return;
    state.tab = tab;
    state.search = '';
    state.invoiceStatus = '';
    if (tab === 'tagihan') state.expandedInvoiceCustomer = null;
    await loadData({ withLogs: tab === 'logs-input', withUsers: tab === 'accounts', withInvoices: tab === 'tagihan' });
    return;
  }
  if (act === 'auth-mode') {
    state.authMode = button.dataset.mode;
    state.authMessage = '';
    render();
    return;
  }
  if (act === 'new-transaction') { openTransaction(); return; }
  if (act === 'new-invoice') { openInvoice(); return; }
  if (act === 'edit-invoice') {
    const row = state.invoices.find((item) => item.id === button.dataset.id);
    if (row) openInvoice(row);
    return;
  }
  if (act === 'toggle-invoice-customer') {
    const key = button.dataset.customerKey;
    const isOpen = state.expandedInvoiceCustomer === key
      || (state.expandedInvoiceCustomer === null && button.dataset.defaultOpen === 'true');
    state.expandedInvoiceCustomer = isOpen ? '' : key;
    render();
    return;
  }
  if (act === 'record-customer-payment') {
    const key = button.dataset.customerKey;
    const rows = state.invoices.filter((row) => String(row.customer || 'Customer belum dicatat').trim().toLocaleLowerCase('id-ID') === key
      && Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0) > 0)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '') || (a.invoice_date || '').localeCompare(b.invoice_date || ''));
    if (!rows.length) return;
    state.expandedInvoiceCustomer = key;
    state.modal = rows.length === 1
      ? { type: 'invoice-payment', row: rows[0] }
      : { type: 'customer-payment', row: { customer: button.dataset.customer, customerKey: key } };
    render();
    return;
  }
  if (act === 'record-invoice-payment') {
    const row = state.invoices.find((item) => item.id === button.dataset.id);
    if (row) { state.modal = { type: 'invoice-payment', row }; render(); }
    return;
  }
  if (act === 'delete-invoice') {
    const row = state.invoices.find((item) => item.id === button.dataset.id);
    if (!row || !window.confirm(`Hapus invoice ${row.invoice_number} milik ${row.customer}?`)) return;
    try {
      await deleteInvoice(row.id);
      state.invoices = state.invoices.filter((item) => item.id !== row.id);
      render();
      notify('Invoice dihapus.');
    } catch (error) { notify(message(error), 'error'); }
    return;
  }
  if (act === 'edit') {
    const row = state.transactions.find((item) => item.id === button.dataset.id);
    if (row) openTransaction(row);
    return;
  }
  if (act === 'delete') {
    const row = state.transactions.find((item) => item.id === button.dataset.id);
    if (!row || !window.confirm(`Hapus transaksi ${row.category} sebesar Rp ${Number(row.amount).toLocaleString('id-ID')}?`)) return;
    try {
      await deleteTransaction(row.id);
      state.transactions = state.transactions.filter((item) => item.id !== row.id);
      state.inputLogs = [];
      render();
      notify('Transaksi dihapus.');
    } catch (error) { notify(message(error), 'error'); }
    return;
  }
  if (act === 'edit-opening') {
    state.modal = { type: 'opening', row: state.settings || {} };
    render();
    return;
  }
  if (act === 'close-modal' || (act === 'backdrop' && event.target === button)) {
    state.modal = null;
    render();
    return;
  }
  if (act === 'export') { exportCsv(); return; }
  if (act === 'export-invoices') { exportInvoicesCsv(); return; }
  if (act === 'retry') {
    await loadData({ withLogs: state.tab === 'logs-input', withUsers: state.tab === 'accounts', withInvoices: state.tab === 'tagihan' });
    return;
  }
  if (act === 'signout') {
    if (supabase) await supabase.auth.signOut();
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.matches('[data-money-input]')) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const digitsBeforeStart = target.value.slice(0, start).replace(/\D/g, '').length;
    const digitsBeforeEnd = target.value.slice(0, end).replace(/\D/g, '').length;
    target.value = formatAmountInput(target.value);
    const caretForDigits = (count) => {
      if (count === 0) return 0;
      let seen = 0;
      for (let index = 0; index < target.value.length; index += 1) {
        if (/\d/.test(target.value[index])) seen += 1;
        if (seen === count) return index + 1;
      }
      return target.value.length;
    };
    target.setSelectionRange(caretForDigits(digitsBeforeStart), caretForDigits(digitsBeforeEnd));
    return;
  }
  if (target.matches('[data-filter="search"]')) {
    state.search = target.value;
    const start = target.selectionStart;
    render();
    const input = app.querySelector('[data-filter="search"]');
    input?.focus();
    input?.setSelectionRange(start, start);
  }
}

async function handleChange(event) {
  const target = event.target;
  if (target.matches('[data-customer-payment-invoice]')) {
    const invoice = state.invoices.find((row) => row.id === target.value);
    const amountInput = target.form?.querySelector('[name="payment_amount"]');
    if (invoice && amountInput) amountInput.value = formatAmountInput(Math.max(Number(invoice.amount || 0) - Number(invoice.paid_amount || 0), 0));
    return;
  }
  if (target.matches('[data-filter="month"]')) {
    if (!target.value) return;
    state.month = target.value;
    if (state.tab === 'logs-input' && state.profile?.role === 'developer') {
      try { state.inputLogs = await loadInputLogs(state.month); }
      catch (error) { state.error = message(error); }
    }
    render();
    return;
  }
  if (target.matches('[data-filter="invoicePeriod"]')) {
    state.invoicePeriod = target.value;
    state.expandedInvoiceCustomer = null;
    render();
    return;
  }
  if (target.matches('[data-filter="category"]')) { state.category = target.value; render(); return; }
  if (target.matches('[data-filter="invoiceStatus"]')) { state.invoiceStatus = target.value; render(); return; }
  if (target.matches('[data-filter="incomeWeek"]')) {
    if (target.value === 'month') state.incomePlanPeriod = 'month';
    else { state.incomePlanPeriod = 'week'; state.incomeWeek = target.value; }
    render();
    return;
  }
  if (target.matches('[data-filter="kind"]')) { state.kind = target.value; render(); }
}

async function handleSubmit(event) {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === 'auth') {
    const values = Object.fromEntries(new FormData(form).entries());
    state.busy = true;
    state.authMessage = '';
    render();
    try {
      if (form.dataset.mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: values.email, password: values.password });
        if (error) throw error;
        if (!data.session) {
          state.authMessage = 'Akun staff dibuat. Setelah konfirmasi email, developer perlu menghubungkan akun ini ke workspace.';
          state.authMessageType = 'info';
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
        if (error) throw error;
      }
    } catch (error) {
      state.authMessage = message(error);
      state.authMessageType = 'warn';
    } finally {
      state.busy = false;
      render();
    }
    return;
  }
  if (form.dataset.form === 'account-role') {
    if (state.profile?.role !== 'developer') return;
    const values = Object.fromEntries(new FormData(form).entries());
    state.busy = true;
    render();
    try {
      await setWorkspaceUserRole(values.user_id, values.role);
      const [profiles, logs] = await Promise.all([
        loadWorkspaceUsers(),
        loadInputLogs(state.month),
      ]);
      state.profiles = profiles;
      state.inputLogs = logs;
      state.error = '';
      notify('Akses akun berhasil diperbarui.');
    } catch (error) {
      notify(message(error), 'error');
    } finally {
      state.busy = false;
      render();
    }
    return;
  }
  if (form.dataset.form !== 'modal') return;
  const values = Object.fromEntries(new FormData(form).entries());
  if (form.dataset.kind === 'transaction' && parseAmountInput(values.amount) < 1) {
    notify('Nominal transaksi harus lebih dari 0.', 'error');
    return;
  }
  if (form.dataset.kind === 'invoice') {
    const amount = parseAmountInput(values.amount);
    const paidAmount = parseAmountInput(values.paid_amount);
    if (amount < 1) { notify('Nilai invoice harus lebih dari 0.', 'error'); return; }
    if (paidAmount > amount) { notify('Pembayaran tidak boleh melebihi nilai invoice.', 'error'); return; }
    if (paidAmount > 0 && !values.paid_date) { notify('Tanggal pembayaran wajib diisi jika ada pembayaran.', 'error'); return; }
  }
  if (form.dataset.kind === 'invoice-payment') {
    const invoice = state.invoices.find((row) => row.id === form.dataset.id);
    const balance = Math.max(Number(invoice?.amount || 0) - Number(invoice?.paid_amount || 0), 0);
    const payment = parseAmountInput(values.payment_amount);
    if (!invoice) { notify('Invoice tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'error'); return; }
    if (payment < 1) { notify('Nominal pembayaran harus lebih dari 0.', 'error'); return; }
    if (payment > balance) { notify(`Pembayaran melebihi sisa invoice Rp ${balance.toLocaleString('id-ID')}.`, 'error'); return; }
  }
  if (form.dataset.kind === 'customer-payment') {
    const invoice = state.invoices.find((row) => row.id === values.invoice_id);
    const balance = Math.max(Number(invoice?.amount || 0) - Number(invoice?.paid_amount || 0), 0);
    const payment = parseAmountInput(values.payment_amount);
    if (!invoice) { notify('Invoice tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'error'); return; }
    if (payment < 1) { notify('Nominal pembayaran harus lebih dari 0.', 'error'); return; }
    if (payment > balance) { notify(`Pembayaran melebihi sisa invoice Rp ${balance.toLocaleString('id-ID')}.`, 'error'); return; }
  }
  state.busy = true;
  render();
  try {
    if (form.dataset.kind === 'opening') {
      state.settings = await saveSettings({
        opening_balance: parseAmountInput(values.opening_balance),
        opening_balance_date: values.opening_balance_date,
      });
      state.inputLogs = [];
    } else if (form.dataset.kind === 'invoice') {
      const invoice = await saveInvoice({
        invoice_date: values.invoice_date,
        due_date: values.due_date || null,
        paid_date: values.paid_date || null,
        customer: values.customer.trim(),
        invoice_number: values.invoice_number.trim(),
        po_number: values.po_number.trim(),
        amount: parseAmountInput(values.amount),
        paid_amount: parseAmountInput(values.paid_amount),
      }, form.dataset.id || null);
      state.invoices = [invoice, ...state.invoices.filter((item) => item.id !== invoice.id)]
        .sort((a, b) => (a.customer || '').localeCompare(b.customer || '', 'id-ID', { sensitivity: 'base' })
          || (a.invoice_date || '').localeCompare(b.invoice_date || ''));
      state.inputLogs = [];
    } else if (['invoice-payment', 'customer-payment'].includes(form.dataset.kind)) {
      const invoiceId = form.dataset.kind === 'customer-payment' ? values.invoice_id : form.dataset.id;
      const previous = state.invoices.find((item) => item.id === invoiceId);
      const invoice = await saveInvoice({
        paid_amount: Number(previous.paid_amount || 0) + parseAmountInput(values.payment_amount),
        paid_date: values.paid_date,
      }, previous.id);
      state.invoices = state.invoices.map((item) => item.id === invoice.id ? invoice : item);
      state.inputLogs = [];
    } else {
      const row = await saveTransaction({
        transaction_date: values.transaction_date,
        kind: values.kind,
        category: values.category,
        requester: values.requester.trim(),
        description: values.description.trim(),
        amount: parseAmountInput(values.amount),
      }, form.dataset.id || null);
      state.transactions = [row, ...state.transactions.filter((item) => item.id !== row.id)]
        .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
      state.inputLogs = [];
    }
    state.modal = null;
    state.busy = false;
    render();
    notify(['invoice-payment', 'customer-payment'].includes(form.dataset.kind) ? 'Pembayaran invoice berhasil dicatat.'
      : form.dataset.kind === 'invoice' ? (form.dataset.id ? 'Perubahan invoice berhasil disimpan.' : 'Invoice berhasil disimpan.')
        : form.dataset.id ? 'Perubahan berhasil disimpan.' : 'Data berhasil disimpan.');
  } catch (error) {
    state.busy = false;
    render();
    notify(message(error), 'error');
  }
}

app.addEventListener('click', handleClick);
app.addEventListener('input', handleInput);
app.addEventListener('change', handleChange);
app.addEventListener('submit', handleSubmit);

if (isConfigured) {
  supabase.auth.onAuthStateChange((_event, session) => { void activateSession(session); });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      state.authMessage = message(error);
      state.authMessageType = 'warn';
      render();
    } else if (!state.session) void activateSession(data.session);
  }).catch((error) => {
    state.authMessage = message(error);
    state.authMessageType = 'warn';
    render();
  });
}

render();
