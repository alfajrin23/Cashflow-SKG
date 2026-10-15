import {
  deleteTransaction, isConfigured, loadInputLogs, loadProfile, loadSettings,
  loadTransactions, loadWorkspaceUsers, saveSettings, saveTransaction,
  setWorkspaceId, setWorkspaceUserRole, supabase,
} from './db.js';
import { today } from './helpers.js';
import { renderApp } from './views.js';
import './style.css';

const now = today();
const state = {
  configured: isConfigured, session: null, profile: null, profileLoading: false,
  profileError: '', authMode: 'login', authMessage: '', authMessageType: 'info',
  month: now.slice(0, 7), today: now, tab: 'dashboard', transactions: [],
  settings: null, inputLogs: [], profiles: [], category: '', kind: '', search: '',
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

async function loadData({ withLogs = false, withUsers = false } = {}) {
  if (!state.profile?.workspace_id) return;
  const userId = state.session?.user?.id;
  state.loading = true;
  state.error = '';
  render();
  try {
    const [settings, transactions, logs, profiles] = await Promise.all([
      loadSettings(),
      loadTransactions(),
      withLogs && state.profile.role === 'developer' ? loadInputLogs(state.month) : Promise.resolve(null),
      withUsers && state.profile.role === 'developer' ? loadWorkspaceUsers() : Promise.resolve(null),
    ]);
    if (state.session?.user?.id !== userId) return;
    state.settings = settings;
    state.transactions = transactions;
    if (logs) state.inputLogs = logs;
    if (profiles) state.profiles = profiles;
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
    if (profile.workspace_id) await loadData();
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

async function handleClick(event) {
  const button = event.target.closest('[data-act]');
  if (!button) return;
  const { act, tab } = button.dataset;
  if (act === 'navigate') {
    if (['logs-input', 'accounts'].includes(tab) && state.profile?.role !== 'developer') return;
    state.tab = tab;
    state.search = '';
    await loadData({ withLogs: tab === 'logs-input', withUsers: tab === 'accounts' });
    return;
  }
  if (act === 'auth-mode') {
    state.authMode = button.dataset.mode;
    state.authMessage = '';
    render();
    return;
  }
  if (act === 'new-transaction') { openTransaction(); return; }
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
  if (act === 'retry') {
    await loadData({ withLogs: state.tab === 'logs-input', withUsers: state.tab === 'accounts' });
    return;
  }
  if (act === 'signout') {
    if (supabase) await supabase.auth.signOut();
  }
}

function handleInput(event) {
  const target = event.target;
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
  if (target.matches('[data-filter="category"]')) { state.category = target.value; render(); return; }
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
  state.busy = true;
  render();
  try {
    if (form.dataset.kind === 'opening') {
      state.settings = await saveSettings({
        opening_balance: Number(values.opening_balance) || 0,
        opening_balance_date: values.opening_balance_date,
      });
      state.inputLogs = [];
    } else {
      const row = await saveTransaction({
        transaction_date: values.transaction_date,
        kind: values.kind,
        category: values.category,
        requester: values.requester.trim(),
        description: values.description.trim(),
        amount: Number(values.amount),
      }, form.dataset.id || null);
      state.transactions = [row, ...state.transactions.filter((item) => item.id !== row.id)]
        .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
      state.inputLogs = [];
    }
    state.modal = null;
    state.busy = false;
    render();
    notify(form.dataset.id ? 'Perubahan berhasil disimpan.' : 'Data berhasil disimpan.');
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
