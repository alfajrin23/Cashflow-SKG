import { CASH_CATEGORIES, esc, formatDate, icon, inMonth, money, monthName, number } from './helpers.js';

const button = (label, action, kind = 'primary', glyph = 'plus') =>
  `<button class="button ${kind}" type="button" data-act="${action}">${icon(glyph, 17)}<span>${esc(label)}</span></button>`;
const card = (label, value, glyph, tone, caption) =>
  `<article class="metric-card tone-${tone}"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon">${icon(glyph, 18)}</span></div><strong>${value}</strong><small>${caption}</small></article>`;
const panelTitle = (eyebrow, title, copy = '') =>
  `<div class="panel-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${copy ? `<p>${esc(copy)}</p>` : ''}</div></div>`;

function signIn(state) {
  const signup = state.authMode === 'signup';
  return `<main class="auth-screen"><section class="auth-card">
    <img src="/brand-mark.png" alt="Logo PT Swatama Karya Gemilang" class="auth-logo">
    <p class="eyebrow">PT SWATAMA KARYA GEMILANG</p><h1>${signup ? 'Buat akun staff' : 'Selamat datang'}</h1>
    <p class="auth-copy">Kelola arus kas perusahaan dengan satu catatan yang bisa diakses tim.</p>
    ${state.authMessage ? `<div class="notice notice-${state.authMessageType}">${icon('alert', 17)}<span>${esc(state.authMessage)}</span></div>` : ''}
    <form data-form="auth" data-mode="${signup ? 'signup' : 'login'}" class="form-stack">
      <label class="field"><span>Email</span><input required autocomplete="email" type="email" name="email" placeholder="nama@perusahaan.com"></label>
      <label class="field"><span>Kata sandi</span><input required minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" type="password" name="password" placeholder="Minimal 8 karakter"></label>
      <button class="button primary button-wide" type="submit" ${state.busy ? 'disabled' : ''}>${icon('check', 17)}<span>${state.busy ? 'Memproses…' : signup ? 'Buat akun' : 'Masuk'}</span></button>
    </form>
    <p class="auth-switch">${signup ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'} <button type="button" data-act="auth-mode" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Masuk' : 'Daftar akun'}</button></p>
  </section></main>`;
}

function periodHead(month, title, description, action = '') {
  return `<section class="page-heading"><div><p class="eyebrow">ARUS KAS · ${esc(monthName(month))}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="heading-actions"><label class="month-control"><span>Periode</span><input type="month" data-filter="month" value="${esc(month)}"></label>${action}</div></section>`;
}

function filteredTransactions(state, category = '', kind = '') {
  const term = state.search.trim().toLocaleLowerCase('id-ID');
  return state.transactions.filter((row) => inMonth(row.transaction_date, state.month)
    && (!category || row.category === category)
    && (!kind || row.kind === kind)
    && (!term || `${row.category} ${row.requester} ${row.description}`.toLocaleLowerCase('id-ID').includes(term)));
}

function tableRows(rows, actionButtons = true) {
  return rows.map((row) => `<tr><td>${formatDate(row.transaction_date)}</td>
    <td><span class="tag">${esc(row.category)}</span></td><td>${esc(row.requester || '—')}</td>
    <td class="description-cell">${esc(row.description || '—')}</td>
    <td><span class="flow-pill ${row.kind === 'credit' ? 'income' : 'expense'}">${row.kind === 'credit' ? 'Masuk' : 'Keluar'}</span></td>
    <td class="numeric ${row.kind === 'credit' ? 'credit' : 'debit'}">${row.kind === 'credit' ? '+' : '−'} ${money(row.amount)}</td>
    ${actionButtons ? `<td class="row-actions"><button class="icon-button" type="button" data-act="edit" data-id="${row.id}" aria-label="Edit">${icon('edit', 16)}</button><button class="icon-button danger-icon" type="button" data-act="delete" data-id="${row.id}" aria-label="Hapus">${icon('trash', 16)}</button></td>` : ''}</tr>`).join('');
}

function transactionTable(rows, emptyText = 'Belum ada transaksi pada periode ini.') {
  return rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Pengaju</th><th>Keterangan</th><th>Arus</th><th class="numeric">Nominal</th><th class="actions-heading">Aksi</th></tr></thead><tbody>${tableRows(rows)}</tbody></table></div>`
    : `<div class="empty-state"><div class="empty-icon">${icon('wallet', 26)}</div><h3>Belum ada transaksi</h3><p>${esc(emptyText)}</p><button class="button primary" type="button" data-act="new-transaction">${icon('plus', 17)}<span>Tambah transaksi</span></button></div>`;
}

function totals(rows) {
  const income = rows.filter((row) => row.kind === 'credit').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expense = rows.filter((row) => row.kind === 'debit').reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { income, expense, net: income - expense };
}

function balanceAt(data, date) {
  const settings = data.settings || {};
  return Number(settings.opening_balance || 0) + data.transactions
    .filter((row) => (!settings.opening_balance_date || row.transaction_date >= settings.opening_balance_date)
      && row.transaction_date <= date)
    .reduce((sum, row) => sum + (row.kind === 'credit' ? 1 : -1) * Number(row.amount || 0), 0);
}

function monthEnd(month) {
  const [year, number] = month.split('-').map(Number);
  return `${year}-${String(number).padStart(2, '0')}-${String(new Date(year, number, 0).getDate()).padStart(2, '0')}`;
}

function trendChart(transactions, selectedMonth) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date), ...totals(transactions.filter((row) => inMonth(row.transaction_date, key))) };
  });
  const ceiling = Math.max(1, ...months.flatMap((item) => [item.income, item.expense]));
  const chartBars = months.map((item) => {
    const incomeHeight = Math.max(2, item.income / ceiling * 112);
    const expenseHeight = Math.max(2, item.expense / ceiling * 112);
    return `<div class="chart-month"><div class="bar-pair"><i class="bar-income" style="height:${incomeHeight}px" title="Masuk ${money(item.income)}"></i><i class="bar-expense" style="height:${expenseHeight}px" title="Keluar ${money(item.expense)}"></i></div><small>${esc(item.label)}</small></div>`;
  }).join('');
  return `<div class="trend-chart"><div class="chart-y"><span>${money(ceiling)}</span><span>${money(ceiling / 2)}</span><span>Rp0</span></div><div class="chart-bars">${chartBars}</div></div><div class="chart-legend"><span><i class="legend-income"></i> Uang masuk</span><span><i class="legend-expense"></i> Uang keluar</span></div>`;
}

function categoryBreakdown(rows) {
  const expenses = rows.filter((row) => row.kind === 'debit').reduce((map, row) => {
    map.set(row.category, (map.get(row.category) || 0) + Number(row.amount || 0)); return map;
  }, new Map());
  const ranked = [...expenses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  const max = ranked[0]?.[1] || 1;
  return ranked.length ? ranked.map(([name, amount], index) => `<div class="category-row"><div class="category-row-meta"><span><i class="category-dot dot-${index % 6}"></i>${esc(name)}</span><strong>${money(amount)}</strong></div><div class="category-track"><i class="dot-bg-${index % 6}" style="width:${Math.max(3, amount / max * 100)}%"></i></div></div>`).join('')
    : '<div class="quiet-empty">Belum ada pengeluaran untuk periode ini.</div>';
}

function dashboard(state) {
  const rows = state.transactions.filter((row) => inMonth(row.transaction_date, state.month));
  const sums = totals(rows);
  const endBalance = balanceAt(state, monthEnd(state.month));
  const recent = [...rows].sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || '')).slice(0, 6);
  return `${periodHead(state.month, 'Ringkasan kas', 'Posisi saldo, pemasukan, dan pengeluaran perusahaan dalam satu pandangan.', button('Catat transaksi', 'new-transaction'))}
    <div class="metric-grid">${card('Saldo akhir periode', money(endBalance), 'wallet', 'green', `Saldo per ${formatDate(monthEnd(state.month))}`)}${card('Uang masuk', money(sums.income), 'arrow', 'blue', `${number(rows.filter((row) => row.kind === 'credit').length)} transaksi`)}${card('Uang keluar', money(sums.expense), 'arrow', 'orange', `${number(rows.filter((row) => row.kind === 'debit').length)} transaksi`)}${card('Arus bersih', money(sums.net), 'chart', sums.net < 0 ? 'red' : 'violet', 'Pemasukan dikurangi pengeluaran')}</div>
    <section class="focus-grid"><article class="panel"> ${panelTitle('TREN ENAM BULAN', 'Uang masuk & keluar', 'Perbandingan arus kas per bulan.')}${trendChart(state.transactions, state.month)}</article>
      <article class="panel"> ${panelTitle('PENGELUARAN', 'Kategori terbesar', `Rincian biaya pada ${monthName(state.month)}.`)}<div class="category-breakdown">${categoryBreakdown(rows)}</div></article></section>
    <section class="panel">${panelTitle('AKTIVITAS TERBARU', 'Transaksi bulan ini', `Menampilkan ${recent.length} dari ${number(rows.length)} transaksi.`)}
      ${recent.length ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Pengaju</th><th>Keterangan</th><th>Arus</th><th class="numeric">Nominal</th></tr></thead><tbody>${tableRows(recent, false)}</tbody></table></div>` : '<div class="quiet-empty">Belum ada transaksi pada periode ini.</div>'}
      <div class="panel-footer"><button class="text-button" type="button" data-act="navigate" data-tab="cashflow">Buka buku kas ${icon('arrow', 15)}</button></div>
    </section>`;
}

function cashflow(state) {
  const rows = filteredTransactions(state, state.category, state.kind);
  const monthRows = state.transactions.filter((row) => inMonth(row.transaction_date, state.month));
  const sums = totals(monthRows);
  const currentBalance = balanceAt(state, '9999-12-31');
  const categories = [...new Set([...CASH_CATEGORIES, ...state.transactions.map((row) => row.category).filter(Boolean)])];
  return `${periodHead(state.month, 'Buku kas', 'Catat dan telusuri setiap uang masuk dan keluar.', button('Tambah transaksi', 'new-transaction'))}
    <section class="opening-card"><div><p class="eyebrow">SALDO AWAL</p><h2>${money(state.settings?.opening_balance || 0)}</h2><p>Saldo per ${formatDate(state.settings?.opening_balance_date)}</p></div>${button('Atur saldo awal', 'edit-opening', 'secondary', 'edit')}</section>
    <div class="summary-grid"><div class="summary-item"><span>Saldo berjalan</span><strong>${money(currentBalance)}</strong></div><div class="summary-item"><span>Uang masuk bulan ini</span><strong class="credit">${money(sums.income)}</strong></div><div class="summary-item"><span>Uang keluar bulan ini</span><strong class="debit">${money(sums.expense)}</strong></div><div class="summary-item"><span>Arus bersih bulan ini</span><strong>${money(sums.net)}</strong></div></div>
    <section class="panel"> ${panelTitle('KATEGORI', 'Pengeluaran bulan ini', monthName(state.month))}<div class="category-breakdown"> ${categoryBreakdown(monthRows)}</div></section>
    <section class="panel"> ${panelTitle('BUKU KAS', 'Daftar transaksi', `${number(rows.length)} transaksi sesuai filter.`)}
      <div class="toolbar"><label class="search-field">${icon('search', 17)}<input data-filter="search" value="${esc(state.search)}" placeholder="Cari pengaju atau keterangan"></label>
        <select class="select-compact" data-filter="category"><option value="">Semua kategori</option>${categories.map((item) => `<option value="${esc(item)}" ${item === state.category ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select>
        <select class="select-compact" data-filter="kind"><option value="">Semua arus</option><option value="credit" ${state.kind === 'credit' ? 'selected' : ''}>Uang masuk</option><option value="debit" ${state.kind === 'debit' ? 'selected' : ''}>Uang keluar</option></select>
        <button class="button secondary" type="button" data-act="export">${icon('download', 16)}<span>Export CSV</span></button>
      </div>${transactionTable(rows)}
    </section>`;
}

function logSummary(changes = {}) {
  const details = Object.entries(changes).map(([field, value]) => {
    const display = (item) => item === null || item === undefined ? '—'
      : typeof item === 'object' ? JSON.stringify(item) : String(item);
    if (value && typeof value === 'object' && ('sebelum' in value || 'sesudah' in value)) {
      return `${field}: ${display(value.sebelum)} → ${display(value.sesudah)}`;
    }
    return `${field}: ${display(value)}`;
  });
  return esc(details.join(' · ') || 'Data diperbarui');
}

function logTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function logs(state) {
  const rows = state.inputLogs;
  return `${periodHead(state.month, 'Log input', 'Riwayat perubahan data kas untuk pengawasan internal.')}
    <section class="panel">${panelTitle('AUDIT TRAIL', 'Aktivitas tercatat', 'Maksimal 500 aktivitas untuk periode yang dipilih.')}
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Perubahan</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${logTime(row.created_at)}</td><td>${esc(row.actor_email || '—')}</td><td><span class="flow-pill ${row.action === 'delete' ? 'expense' : 'income'}">${row.action === 'insert' ? 'Tambah' : row.action === 'update' ? 'Ubah' : 'Hapus'}</span></td><td class="log-change"><strong>${esc(row.table_name === 'cashflow_settings' ? 'Saldo awal' : row.table_name === 'profiles' ? 'Akses akun' : 'Transaksi kas')}</strong><small>${logSummary(row.changes)}</small></td></tr>`).join('')}</tbody></table></div>` : '<div class="quiet-empty">Belum ada aktivitas tercatat untuk periode ini.</div>'}
    </section>`;
}

function accountAccess(state) {
  const pending = state.profiles.filter((profile) => !profile.workspace_id).length;
  const currentUserId = state.session.user.id;
  const rows = state.profiles.map((profile) => {
    const hasAccess = Boolean(profile.workspace_id);
    const isCurrentUser = profile.user_id === currentUserId;
    return `<tr><td><strong class="account-name">${esc(profile.email || 'Akun tanpa email')}</strong><small class="account-created">Terdaftar ${formatDate(profile.created_at)}</small></td>
      <td><span class="flow-pill ${hasAccess ? 'income' : 'expense'}">${hasAccess ? 'Aktif' : 'Menunggu akses'}</span></td>
      <td colspan="2"><form class="account-role-form" data-form="account-role"><input type="hidden" name="user_id" value="${esc(profile.user_id)}"><div class="account-role-controls"><select class="select-compact" name="role" aria-label="Role ${esc(profile.email)}" ${state.busy || isCurrentUser ? 'disabled' : ''}><option value="staff" ${profile.role === 'staff' ? 'selected' : ''}>Staff</option><option value="developer" ${profile.role === 'developer' ? 'selected' : ''}>Developer</option></select><button class="button ${hasAccess ? 'secondary' : 'primary'} account-save" type="submit" ${state.busy || isCurrentUser ? 'disabled' : ''}>${hasAccess ? 'Simpan role' : 'Berikan akses'}</button>${isCurrentUser ? '<small class="account-self-note">Role Anda</small>' : ''}</div></form></td></tr>`;
  }).join('');
  return `<section class="page-heading"><div><p class="eyebrow">PENGELOLAAN DEVELOPER</p><h1>Akun &amp; akses</h1><p>Hubungkan akun baru ke workspace dan atur peran staff atau developer.</p></div></section>
    <div class="summary-grid"><div class="summary-item"><span>Total akun</span><strong>${number(state.profiles.length)}</strong></div><div class="summary-item"><span>Menunggu akses</span><strong>${number(pending)}</strong></div></div>
    <section class="panel">${panelTitle('ANGGOTA WORKSPACE', 'Kelola akun', 'Akun yang menunggu akses berasal dari pendaftaran baru. Role Anda sendiri tidak dapat diubah di sini.')}
      ${rows ? `<div class="table-wrap"><table><thead><tr><th>Akun</th><th>Akses workspace</th><th colspan="2">Role / tindakan</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="quiet-empty">Belum ada akun terdaftar.</div>'}
    </section>`;
}

function modal(state) {
  if (!state.modal) return '';
  const { type, row = {} } = state.modal;
  const opening = type === 'opening';
  const categoryOptions = CASH_CATEGORIES.map((category) => `<option value="${esc(category)}" ${row.category === category ? 'selected' : ''}>${esc(category)}</option>`).join('');
  const body = opening
    ? `<div class="form-grid"><label class="field"><span>Nominal saldo awal</span><input name="opening_balance" type="number" min="0" step="1" required value="${esc(row.opening_balance ?? 0)}"></label><label class="field"><span>Saldo per tanggal</span><input name="opening_balance_date" type="date" required value="${esc(row.opening_balance_date || state.today)}"></label></div><p class="form-hint">Saldo awal menjadi dasar perhitungan saldo berjalan.</p>`
    : `<div class="form-grid"><label class="field"><span>Tanggal transaksi</span><input name="transaction_date" type="date" required value="${esc(row.transaction_date || state.today)}"></label><label class="field"><span>Jenis arus</span><select name="kind"><option value="debit" ${row.kind !== 'credit' ? 'selected' : ''}>Uang keluar</option><option value="credit" ${row.kind === 'credit' ? 'selected' : ''}>Uang masuk</option></select></label><label class="field"><span>Kategori</span><select name="category" required>${categoryOptions}</select></label><label class="field"><span>Nama pengajuan / sumber</span><input name="requester" value="${esc(row.requester || '')}" placeholder="Nama pemohon atau sumber dana"></label><label class="field field-wide"><span>Nominal</span><input name="amount" type="number" min="1" step="1" required value="${esc(row.amount ?? '')}"></label><label class="field field-wide"><span>Keterangan</span><textarea name="description" rows="3" placeholder="Tujuan transaksi atau detail sumber dana">${esc(row.description || '')}</textarea></label></div>`;
  return `<div class="modal-backdrop" data-act="backdrop"><section class="modal-card" role="dialog" aria-modal="true"><header class="modal-heading"><div><p class="eyebrow">PT SWATAMA KARYA GEMILANG</p><h2>${opening ? 'Atur saldo awal' : row.id ? 'Edit transaksi kas' : 'Transaksi baru'}</h2></div><button class="icon-button" type="button" data-act="close-modal" aria-label="Tutup">${icon('close', 18)}</button></header><form class="form-stack modal-form" data-form="modal" data-kind="${opening ? 'opening' : 'transaction'}" data-id="${esc(row.id || '')}">${body}<div class="modal-actions"><button class="button secondary" type="button" data-act="close-modal">${icon('close', 16)}<span>Batal</span></button><button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>${icon('save', 16)}<span>Simpan</span></button></div></form></section></div>`;
}

export function renderApp(state) {
  if (!state.configured) return `<main class="auth-screen"><section class="auth-card"><p class="eyebrow">PENYIAPAN CASHFLOW SKG</p><h1>Hubungkan Supabase</h1><p class="auth-copy">Isi <code>.env.local</code> dengan URL dan anon key project Supabase, lalu muat ulang halaman.</p></section></main>`;
  if (!state.session) return signIn(state);
  if (state.profileLoading) return '<main class="auth-screen"><div class="loading-card">Memuat akun…</div></main>';
  if (state.profileError) return `<main class="auth-screen"><section class="auth-card"><h1>Akses akun belum siap</h1><div class="notice notice-warn"><span>${esc(state.profileError)}</span></div><button class="button secondary button-wide" type="button" data-act="signout">Keluar</button></section></main>`;
  if (!state.profile?.workspace_id) return `<main class="auth-screen"><section class="auth-card"><img src="/brand-mark.png" alt="" class="auth-logo"><p class="eyebrow">AKUN STAFF</p><h1>Akses menunggu developer</h1><p class="auth-copy">Akun ${esc(state.session.user.email)} sudah terdaftar. Developer perlu menghubungkan akun ke workspace Cashflow SKG melalui Supabase SQL Editor.</p><button class="button secondary button-wide" type="button" data-act="signout">Keluar</button></section></main>`;
  const isDeveloper = state.profile.role === 'developer';
  const tabs = [['dashboard', 'Ringkasan', 'home'], ['cashflow', 'Cashflow', 'wallet'], ...(isDeveloper ? [['accounts', 'Akun & akses', 'users'], ['logs-input', 'Log Input', 'file']] : [])];
  const tab = tabs.find(([key]) => key === state.tab) ? state.tab : 'dashboard';
  const content = tab === 'dashboard' ? dashboard(state) : tab === 'cashflow' ? cashflow(state) : tab === 'accounts' ? accountAccess(state) : logs(state);
  return `<div class="app-shell"><header class="topbar"><a class="brand" href="#" data-act="navigate" data-tab="dashboard"><img src="/brand-mark.png" alt="Logo PT Swatama Karya Gemilang"><span><strong>Cashflow SKG</strong><small>PT Swatama Karya Gemilang</small></span></a><nav class="main-nav" aria-label="Navigasi utama">${tabs.map(([key, label, glyph]) => `<button class="nav-tab ${tab === key ? 'active' : ''}" type="button" data-act="navigate" data-tab="${key}">${icon(glyph, 17)}<span>${label}</span></button>`).join('')}</nav><div class="account-menu"><span class="role-badge ${isDeveloper ? 'developer' : ''}">${isDeveloper ? 'Developer' : 'Staff'}</span><span class="account-email" title="${esc(state.session.user.email)}">${esc(state.session.user.email)}</span><button class="icon-button" type="button" data-act="signout" aria-label="Keluar">${icon('logout', 17)}</button></div></header><main class="workspace">${state.error ? `<div class="notice notice-warn load-notice">${icon('alert', 17)}<span>${esc(state.error)}</span><button type="button" data-act="retry">Coba lagi</button></div>` : ''}${state.loading ? '<div class="loading-line"><i></i> Memuat data kas…</div>' : ''}${content}</main>${modal(state)}<div class="toast-stack" aria-live="polite">${state.toast ? `<div class="toast ${state.toast.type}" role="status">${icon(state.toast.type === 'error' ? 'alert' : 'check', 17)}<span>${esc(state.toast.message)}</span></div>` : ''}</div></div>`;
}
