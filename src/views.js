import { CASH_CATEGORIES, esc, formatAmountInput, formatDate, icon, inMonth, money, monthName, number, statusForInvoice } from './helpers.js';

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

function calendarWeekRanges(month) {
  const [year, monthNumber] = String(month || '').split('-').map(Number);
  if (!year || monthNumber < 1 || monthNumber > 12) return [];
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstDayOffset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const weeks = [];
  let startDay = 1;
  let endDay = 7 - firstDayOffset;
  while (startDay <= daysInMonth) {
    const lastDay = Math.min(endDay, daysInMonth);
    weeks.push({
      number: weeks.length + 1, startDay, endDay: lastDay,
      startDate: `${month}-${String(startDay).padStart(2, '0')}`,
      endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
      amount: 0, rows: [],
    });
    startDay = lastDay + 1;
    endDay += 7;
  }
  return weeks;
}

function invoiceIncomePlan(state) {
  const weeks = calendarWeekRanges(state.month);
  const openInvoices = state.invoices.filter((row) => Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0) > 0);
  const missingDue = openInvoices.filter((row) => !row.due_date);
  const missingAmount = missingDue.reduce((sum, row) => sum + Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0), 0);
  const groups = new Map();
  openInvoices.filter((row) => row.due_date?.slice(0, 7) === state.month).forEach((row) => {
    const date = row.due_date.slice(0, 10);
    const customer = String(row.customer || 'Customer belum dicatat').trim() || 'Customer belum dicatat';
    const key = `${date}::${customer.toLocaleLowerCase('id-ID')}`;
    const group = groups.get(key) || { date, customer, count: 0, amount: 0, invoiceNumbers: [] };
    group.count += 1;
    group.amount += Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0);
    if (row.invoice_number) group.invoiceNumbers.push(row.invoice_number);
    groups.set(key, group);
  });
  [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.customer.localeCompare(b.customer, 'id-ID')).forEach((row) => {
    const day = Number(row.date.slice(8, 10));
    const index = weeks.findIndex((week) => day >= week.startDay && day <= week.endDay);
    if (index < 0) return;
    weeks[index].rows.push({ ...row, dateLabel: formatDate(row.date), invoiceNumbers: row.invoiceNumbers.sort((a, b) => a.localeCompare(b, 'id-ID')) });
    weeks[index].amount += row.amount;
  });
  const total = weeks.reduce((sum, week) => sum + week.amount, 0);
  const currentMonth = state.today.slice(0, 7);
  const todayDay = Number(state.today.slice(8, 10));
  const currentWeek = Math.max(weeks.findIndex((week) => todayDay >= week.startDay && todayDay <= week.endDay), 0);
  const requestedWeek = Number(state.incomeWeek);
  const weekIndex = Math.max(0, Math.min(weeks.length - 1,
    state.incomeWeek !== '' && Number.isInteger(requestedWeek) ? requestedWeek : state.month === currentMonth ? currentWeek : 0));
  const monthly = state.incomePlanPeriod === 'month';
  const selectedWeeks = monthly ? weeks : weeks.slice(weekIndex, weekIndex + 1);
  const selectedAmount = monthly ? total : weeks[weekIndex]?.amount || 0;
  const rows = selectedWeeks.flatMap((week) => week.rows);
  const title = monthly ? `Rincian bulan ${monthName(state.month)}` : `Rincian pekan ${weeks[weekIndex]?.number || 1}`;
  const empty = monthly ? `Belum ada rencana uang masuk pada ${monthName(state.month)}.` : 'Belum ada rencana uang masuk pada pekan ini.';
  const rowMarkup = rows.map((row) => `<div class="income-week-row"><div><strong>${esc(row.customer)}</strong><small>${esc(row.dateLabel)} · Sesuai tanggal jatuh tempo · No. invoice ${row.invoiceNumbers.map((item) => esc(item)).join(', ')} · ${number(row.count)} invoice</small></div><b>${money(row.amount)}</b></div>`).join('');
  const weekOptions = weeks.map((week, index) => `<option value="${index}" ${!monthly && index === weekIndex ? 'selected' : ''}>Pekan ${week.number} · ${formatDate(week.startDate, { day: 'numeric', month: 'short' })}–${formatDate(week.endDate)}</option>`).join('');
  return `<section class="panel income-plan-panel"><div class="panel-heading"><div><p class="eyebrow">PERENCANAAN KAS</p><h2>Rencana uang masuk · ${esc(monthName(state.month))}</h2><p>Estimasi pembayaran invoice outstanding berdasarkan tanggal jatuh tempo.</p></div><div class="income-plan-filters"><label class="income-week-control"><span>Tampilkan</span><select aria-label="Pilih periode rencana uang masuk" data-filter="incomeWeek"><option value="month" ${monthly ? 'selected' : ''}>Seluruh bulan · ${esc(monthName(state.month))}</option>${weekOptions}</select></label><label class="month-control"><span>Periode</span><input aria-label="Pilih periode invoice" data-filter="month" type="month" value="${esc(state.month)}"></label></div></div><div class="metric-grid income-plan-cards">${card('Rencana uang masuk', money(selectedAmount), 'wallet', 'green', monthly ? `Seluruh bulan · ${esc(monthName(state.month))}` : `Pekan ${weeks[weekIndex]?.number || 1} · ${formatDate(weeks[weekIndex]?.startDate, { day: 'numeric', month: 'short' })}–${formatDate(weeks[weekIndex]?.endDate)}`)}</div><section class="income-week-detail"><div class="income-week-detail-heading"><div><h3>${title}</h3><span>${formatDate(selectedWeeks[0]?.startDate, { day: 'numeric', month: 'short' })}–${formatDate(selectedWeeks[selectedWeeks.length - 1]?.endDate)}</span></div><strong>${money(selectedAmount)}</strong></div>${rowMarkup ? `<div class="income-week-rows">${rowMarkup}</div>` : `<p class="income-week-empty">${empty}</p>`}</section>${missingDue.length ? `<div class="notice notice-info">${icon('alert', 17)}<span>${number(missingDue.length)} invoice outstanding senilai ${money(missingAmount)} belum masuk rencana karena tanggal jatuh temponya belum diisi.</span></div>` : ''}</section>`;
}

function invoices(state) {
  const search = state.search.trim().toLocaleLowerCase('id-ID');
  const outstanding = (row) => Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0);
  const customerKey = (value) => String(value || '').trim().toLocaleLowerCase('id-ID');
  const paymentDate = (row) => row.paid_date || row.invoice_date || '';
  const invoiceMonths = [...new Set(state.invoices.filter((row) => Number(row.paid_amount || 0) > 0)
    .map((row) => paymentDate(row).slice(0, 7)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const periodPayments = state.invoices.filter((row) => Number(row.paid_amount || 0) > 0
    && (!state.invoicePeriod || paymentDate(row).slice(0, 7) === state.invoicePeriod));
  const periodPaidTotal = periodPayments.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
  const periodLabel = state.invoicePeriod ? monthName(state.invoicePeriod) : 'Semua periode';
  const paymentHistoryRows = periodPayments.filter((row) => !search
    || `${row.customer} ${row.invoice_number} ${row.po_number}`.toLocaleLowerCase('id-ID').includes(search))
    .sort((a, b) => paymentDate(b).localeCompare(paymentDate(a))
      || (a.customer || '').localeCompare(b.customer || '', 'id-ID', { sensitivity: 'base' }));
  const paymentHistory = paymentHistoryRows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Customer / proyek</th><th>Tanggal bayar</th><th>No. invoice</th><th>No. PO</th><th class="numeric">Nominal dibayar</th></tr></thead><tbody>${paymentHistoryRows.map((row) => `<tr><td><strong>${esc(row.customer || 'Customer belum dicatat')}</strong></td><td>${formatDate(paymentDate(row))}</td><td>${esc(row.invoice_number)}</td><td>${esc(row.po_number || '—')}</td><td class="numeric">${money(row.paid_amount)}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="invoice-payment-empty">Belum ada pembayaran ${state.invoicePeriod ? `pada ${esc(periodLabel)}` : 'yang tercatat'}.</p>`;
  const monthOptions = invoiceMonths.map((month) => `<option value="${esc(month)}" ${state.invoicePeriod === month ? 'selected' : ''}>${esc(monthName(month))}</option>`).join('');
  const contractGroups = state.contracts.map((contract) => {
    const key = customerKey(contract.customer);
    const rows = state.invoices.filter((row) => row.contract_id === contract.id
      || (!row.contract_id && customerKey(row.customer) === key));
    return { id: contract.id, key, customer: contract.customer, contractTotal: Number(contract.contract_amount || 0), rows, legacy: false };
  });
  const knownContractKeys = new Set(contractGroups.map((group) => group.key));
  const legacyCustomers = [...new Set(state.invoices
    .filter((row) => !row.contract_id && !knownContractKeys.has(customerKey(row.customer)))
    .map((row) => String(row.customer || 'Customer belum dicatat').trim() || 'Customer belum dicatat'))];
  const groups = [
    ...contractGroups,
    ...legacyCustomers.map((customer) => ({
      id: '', key: customerKey(customer), customer, contractTotal: 0,
      rows: state.invoices.filter((row) => !row.contract_id && customerKey(row.customer) === customerKey(customer)), legacy: true,
    })),
  ].map((group) => {
    const paidTotal = group.rows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
    return { ...group, paidTotal, balance: group.legacy ? 0 : Math.max(group.contractTotal - paidTotal, 0) };
  });
  const totalContract = contractGroups.reduce((sum, group) => sum + group.contractTotal, 0);
  const totalRemaining = contractGroups.reduce((sum, group) => sum + group.balance, 0);
  const activeContracts = contractGroups.filter((group) => group.balance > 0).length;
  const paidContracts = contractGroups.filter((group) => group.contractTotal > 0 && group.balance === 0).length;
  const visibleGroups = groups.filter((group) => {
    const matchesSearch = !search || group.customer.toLocaleLowerCase('id-ID').includes(search)
      || group.rows.some((row) => `${row.invoice_number} ${row.po_number}`.toLocaleLowerCase('id-ID').includes(search));
    const matchesStatus = !state.invoiceStatus
      || (state.invoiceStatus === 'open' && !group.legacy && group.balance > 0)
      || (state.invoiceStatus === 'partial' && group.paidTotal > 0 && group.balance > 0)
      || (state.invoiceStatus === 'paid' && !group.legacy && group.contractTotal > 0 && group.balance === 0)
      || (state.invoiceStatus === 'late' && group.rows.some((row) => outstanding(row) > 0 && row.due_date && row.due_date < state.today));
    return matchesSearch && matchesStatus;
  });
  const customerCards = visibleGroups.map((group, index) => {
    const recordSearch = !search || group.customer.toLocaleLowerCase('id-ID').includes(search);
    const rows = group.rows.filter((row) => (state.invoicePeriod
      ? Number(row.paid_amount || 0) > 0 && paymentDate(row).slice(0, 7) === state.invoicePeriod
      : true)
      && (recordSearch || `${row.invoice_number} ${row.po_number}`.toLocaleLowerCase('id-ID').includes(search)))
      .sort((a, b) => paymentDate(a).localeCompare(paymentDate(b))
        || (a.invoice_number || '').localeCompare(b.invoice_number || '', 'id-ID'));
    const expanded = state.expandedInvoiceCustomer === group.key
      || (state.expandedInvoiceCustomer === null && index === 0);
    const detailRows = rows.map((row) => {
      const [status, label] = statusForInvoice(row);
      const statusControl = outstanding(row) > 0
        ? `<button class="invoice-status invoice-status-action status-${status}" type="button" data-act="confirm-invoice-paid" data-id="${row.id}" title="Konfirmasi pembayaran">${esc(label)}</button>`
        : `<span class="invoice-status status-${status}">${esc(label)}</span>`;
      return `<tr class="invoice-${status}"><td data-label="Tanggal">${formatDate(paymentDate(row))}</td><td class="invoice-detail-description" data-label="No. invoice / PO"><strong>${esc(row.invoice_number)}</strong><small>${row.po_number ? `PO ${esc(row.po_number)} · ` : ''}${row.paid_date ? `Dibayar ${formatDate(row.paid_date)}` : 'Belum dibayar'}</small></td><td class="numeric" data-label="Nominal">${money(row.amount)}</td><td class="numeric" data-label="Dibayar">${Number(row.paid_amount || 0) > 0 ? money(row.paid_amount) : '—'}</td><td class="numeric" data-label="Sisa invoice">${money(outstanding(row))}</td><td data-label="Status">${statusControl}</td><td class="row-actions" data-label="Aksi"><button class="icon-button" type="button" data-act="edit-invoice" data-id="${row.id}" aria-label="Edit invoice">${icon('edit', 16)}</button>${outstanding(row) > 0 ? `<button class="icon-button invoice-payment-button" type="button" data-act="record-invoice-payment" data-id="${row.id}" aria-label="Catat pembayaran" title="Catat pembayaran">${icon('check', 16)}</button>` : ''}<button class="icon-button danger-icon" type="button" data-act="delete-invoice" data-id="${row.id}" aria-label="Hapus invoice">${icon('trash', 16)}</button></td></tr>`;
    }).join('');
    const progress = group.contractTotal > 0 ? Math.min(100, (group.paidTotal / group.contractTotal) * 100) : 0;
    const paymentAction = group.legacy
      ? `<button class="button secondary invoice-pay-customer" type="button" data-act="new-customer-contract" data-customer="${esc(group.customer)}">${icon('plus', 15)}<span>Tambah kontrak</span></button>`
      : group.balance > 0
        ? `<button class="button secondary invoice-pay-customer" type="button" data-act="record-contract-payment" data-contract-id="${esc(group.id)}">${icon('wallet', 15)}<span>Bayar</span></button>`
        : '<span class="invoice-settled">Lunas</span>';
    const editAction = group.legacy ? '' : `<button class="icon-button invoice-contract-edit" type="button" data-act="edit-contract" data-id="${esc(group.id)}" aria-label="Edit nilai kontrak ${esc(group.customer)}" title="Edit nilai kontrak">${icon('edit', 15)}</button>`;
    return `<article class="invoice-customer-card"><div class="invoice-customer-heading"><div class="invoice-customer-name"><p class="eyebrow">${group.legacy ? 'CUSTOMER' : 'KONTRAK'}</p><h2>${esc(group.customer)}</h2></div><div class="invoice-customer-balances"><div><span>Total nilai kontrak</span><strong>${group.legacy ? 'Belum dibuat' : money(group.contractTotal)}</strong></div><div><span>Sudah dibayar</span><strong>${money(group.paidTotal)}</strong></div><div><span>Sisa kontrak</span><strong class="invoice-balance">${group.legacy ? '—' : money(group.balance)}</strong></div></div></div>${group.legacy ? '' : `<div class="contract-progress" role="progressbar" aria-label="Progres pembayaran ${esc(group.customer)}" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div>`}<div class="invoice-customer-meta"><span>${group.legacy ? 'Kontrak belum dibuat' : `${Math.round(progress)}% dari nilai kontrak`}</span><span>${number(group.rows.length)} invoice</span></div><div class="invoice-customer-actions">${paymentAction}${editAction}<button class="text-button" type="button" data-act="toggle-invoice-customer" data-customer-key="${esc(group.key)}" data-default-open="${state.expandedInvoiceCustomer === null && index === 0}">${expanded ? 'Tutup riwayat' : 'Riwayat invoice'} ${icon('arrow', 14)}</button></div>${expanded ? `<div class="invoice-customer-detail"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>No. invoice / PO</th><th>Nominal</th><th>Dibayar</th><th>Sisa invoice</th><th>Status</th><th class="actions-heading">Aksi</th></tr></thead><tbody>${detailRows || `<tr><td colspan="7" class="quiet-empty">${group.rows.length ? 'Tidak ada invoice pada periode ini.' : 'Belum ada invoice untuk kontrak ini.'}</td></tr>`}</tbody></table></div></div>` : ''}</article>`;
  }).join('');
  return `<div class="invoice-page"><section class="page-heading"><div><p class="eyebrow invoice-page-eyebrow">KEUANGAN</p><h1>Invoice customer</h1><p>Kelola nilai kontrak dan catat pembayaran berdasarkan invoice customer.</p></div><div class="invoice-heading-actions"><label class="invoice-period-control"><span>Periode pembayaran</span><select class="select-compact" aria-label="Pilih periode pembayaran" data-filter="invoicePeriod"><option value="" ${state.invoicePeriod ? '' : 'selected'}>Semua periode</option>${monthOptions}</select></label><button class="button secondary" type="button" data-act="export-invoices">${icon('download', 16)}<span>Export CSV</span></button>${button('Tambah kontrak', 'new-contract')}</div></section>
    <section class="invoice-kpis"><article><span>Total nilai kontrak</span><strong>${money(totalContract)}</strong></article><article><span>${state.invoicePeriod ? `Pembayaran ${esc(monthName(state.invoicePeriod))}` : 'Total sudah dibayar'}</span><strong>${money(periodPaidTotal)}</strong></article><article><span>Sisa kontrak</span><strong>${money(totalRemaining)}</strong></article><article><span>Kontrak berjalan / lunas</span><strong>${number(activeContracts)} / ${number(paidContracts)}</strong></article></section>
    <section class="panel invoice-list-panel"><div class="toolbar invoice-toolbar"><label class="search-field">${icon('search', 17)}<input aria-label="Cari customer atau invoice" data-filter="search" value="${esc(state.search)}" placeholder="Cari customer, PO, atau invoice"></label><select class="select-compact" aria-label="Filter status kontrak" data-filter="invoiceStatus"><option value="">Semua kontrak</option><option value="open" ${state.invoiceStatus === 'open' ? 'selected' : ''}>Masih berjalan</option><option value="partial" ${state.invoiceStatus === 'partial' ? 'selected' : ''}>Sudah ada pembayaran</option><option value="paid" ${state.invoiceStatus === 'paid' ? 'selected' : ''}>Lunas</option><option value="late" ${state.invoiceStatus === 'late' ? 'selected' : ''}>Ada invoice jatuh tempo</option></select></div><section class="invoice-payment-history"><div class="invoice-payment-history-heading"><div><h2>Rekapan pembayaran</h2><p>${esc(periodLabel)} · ${number(paymentHistoryRows.length)} catatan</p></div><strong>${money(periodPaidTotal)}</strong></div>${paymentHistory}</section>${customerCards ? `<div class="invoice-customer-grid">${customerCards}</div>` : `<div class="empty-state"><div class="empty-icon">${icon('file', 26)}</div><h3>${state.contracts.length || state.invoices.length ? 'Tidak ada data sesuai filter' : 'Belum ada kontrak'}</h3><p>${state.contracts.length || state.invoices.length ? 'Ubah pencarian, periode invoice, atau filter status.' : 'Tambahkan kontrak customer untuk mulai mencatat pembayaran.'}</p>${state.contracts.length || state.invoices.length ? '' : button('Tambah kontrak', 'new-contract')}</div>`}</section>
    <details class="invoice-planning"><summary>Rencana uang masuk berdasarkan jatuh tempo</summary>${invoiceIncomePlan(state)}</details></div>`;
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
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Perubahan</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${logTime(row.created_at)}</td><td>${esc(row.actor_email || '—')}</td><td><span class="flow-pill ${row.action === 'delete' ? 'expense' : 'income'}">${row.action === 'insert' ? 'Tambah' : row.action === 'update' ? 'Ubah' : 'Hapus'}</span></td><td class="log-change"><strong>${esc(row.table_name === 'cashflow_settings' ? 'Saldo awal' : row.table_name === 'profiles' ? 'Akses akun' : row.table_name === 'cashflow_customer_contracts' ? 'Kontrak customer' : row.table_name === 'cashflow_invoices' ? 'Invoice' : 'Transaksi kas')}</strong><small>${logSummary(row.changes)}</small></td></tr>`).join('')}</tbody></table></div>` : '<div class="quiet-empty">Belum ada aktivitas tercatat untuk periode ini.</div>'}
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
  const invoice = type === 'invoice';
  const contract = type === 'contract';
  const contractPayment = type === 'contract-payment';
  const confirmInvoicePaid = type === 'confirm-invoice-paid';
  const invoicePayment = type === 'invoice-payment';
  const customerPayment = type === 'customer-payment';
  const customerPaymentRows = customerPayment ? state.invoices.filter((item) => String(item.customer || 'Customer belum dicatat').trim().toLocaleLowerCase('id-ID') === row.customerKey
    && Math.max(Number(item.amount || 0) - Number(item.paid_amount || 0), 0) > 0)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '') || (a.invoice_date || '').localeCompare(b.invoice_date || '')) : [];
  const firstCustomerInvoice = customerPaymentRows[0];
  const customerPaymentOptions = customerPaymentRows.map((item) => `<option value="${esc(item.id)}">${esc(item.invoice_number)} · Sisa ${money(Math.max(Number(item.amount || 0) - Number(item.paid_amount || 0), 0))}</option>`).join('');
  const contractPaymentRows = contractPayment ? state.invoices.filter((item) => item.contract_id === row.id
    || (!item.contract_id && String(item.customer || '').trim().toLocaleLowerCase('id-ID') === String(row.customer || '').trim().toLocaleLowerCase('id-ID'))) : [];
  const contractPaid = contractPaymentRows.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const contractRemaining = Math.max(Number(row.contract_amount || 0) - contractPaid, 0);
  const categoryOptions = CASH_CATEGORIES.map((category) => `<option value="${esc(category)}" ${row.category === category ? 'selected' : ''}>${esc(category)}</option>`).join('');
  const body = opening
    ? `<div class="form-grid"><label class="field"><span>Nominal saldo awal</span><input name="opening_balance" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(row.opening_balance ?? 0))}"></label><label class="field"><span>Saldo per tanggal</span><input name="opening_balance_date" type="date" required value="${esc(row.opening_balance_date || state.today)}"></label></div><p class="form-hint">Saldo awal menjadi dasar perhitungan saldo berjalan.</p>`
    : contract
      ? `<div class="form-grid"><label class="field field-wide"><span>Nama customer</span><input name="customer" required maxlength="180" value="${esc(row.customer || '')}" placeholder="Nama customer atau perusahaan" autocomplete="organization" ${row.id ? 'readonly' : ''}></label><label class="field field-wide"><span>Nilai kontrak</span><input name="contract_amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(row.contract_amount ?? ''))}"></label></div><p class="form-hint">${row.id ? 'Nilai kontrak tidak boleh lebih kecil dari jumlah yang sudah dibayar.' : 'Nilai kontrak menjadi batas total pembayaran yang dapat dicatat.'}</p>`
      : contractPayment
        ? `<div class="notice"><span>${esc(row.customer)} · Nilai kontrak ${money(row.contract_amount)} · Sudah dibayar ${money(contractPaid)} · Sisa ${money(contractRemaining)}</span></div><div class="form-grid"><label class="field"><span>No. invoice</span><input name="invoice_number" required value="" autocomplete="off"></label><label class="field"><span>Tanggal</span><input name="invoice_date" type="date" required value="${esc(state.today)}"></label><label class="field"><span>No. PO</span><input name="po_number" value="" autocomplete="off"></label><label class="field"><span>Nominal</span><input name="amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value=""></label><label class="field field-wide"><span>Status pembayaran</span><select name="payment_status" required><option value="">Pilih status pembayaran</option><option value="paid">Lunas</option><option value="unpaid">Belum dibayar</option></select></label></div><p class="form-hint">Untuk invoice belum dibayar, klik statusnya pada riwayat untuk mengonfirmasi pelunasan.</p>`
        : confirmInvoicePaid
          ? `<div class="notice"><span>Yakin invoice ${esc(row.invoice_number)} milik ${esc(row.customer)} sebesar ${money(row.amount)} sudah dibayar?</span></div><label class="field"><span>Tanggal pembayaran</span><input name="paid_date" type="date" required value="${esc(state.today)}"></label>`
        : invoice
      ? `<div class="form-grid"><label class="field"><span>Tanggal invoice</span><input name="invoice_date" type="date" required value="${esc(row.invoice_date || state.today)}"></label><label class="field"><span>Jatuh tempo</span><input name="due_date" type="date" value="${esc(row.due_date || '')}"></label><label class="field"><span>Nama customer</span><input name="customer" required value="${esc(row.customer || '')}" list="invoice-customer-suggestions" autocomplete="off" ${row.contract_id ? 'readonly' : ''}><datalist id="invoice-customer-suggestions">${[...new Set(state.invoices.map((item) => item.customer).filter(Boolean))].map((customer) => `<option value="${esc(customer)}"></option>`).join('')}</datalist></label><label class="field"><span>Nomor invoice</span><input name="invoice_number" required value="${esc(row.invoice_number || '')}"></label><label class="field"><span>Nomor PO</span><input name="po_number" value="${esc(row.po_number || '')}"></label><label class="field"><span>Nilai invoice</span><input name="amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(row.amount ?? ''))}"></label><label class="field"><span>Sudah dibayar</span><input name="paid_amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input value="${esc(formatAmountInput(row.paid_amount || 0))}"></label><label class="field"><span>Tanggal pembayaran terakhir</span><input name="paid_date" type="date" value="${esc(row.paid_date || '')}"></label></div><p class="form-hint">Status invoice mengikuti sisa tagihan dan tanggal jatuh tempo.</p>`
      : invoicePayment
        ? `<div class="notice"><span>${esc(row.customer)} · Invoice ${esc(row.invoice_number)} · Sisa tagihan ${money(Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0))}</span></div><div class="form-grid"><label class="field"><span>Nominal pembayaran</span><input name="payment_amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(Math.max(Number(row.amount || 0) - Number(row.paid_amount || 0), 0)))}"></label><label class="field"><span>Tanggal pembayaran</span><input name="paid_date" type="date" required value="${esc(state.today)}"></label></div>`
        : customerPayment
          ? `<div class="notice"><span>Pilih invoice milik ${esc(row.customer)} yang menerima pembayaran.</span></div><div class="form-grid"><label class="field field-wide"><span>Invoice</span><select name="invoice_id" data-customer-payment-invoice required>${customerPaymentOptions}</select></label><label class="field"><span>Nominal pembayaran</span><input name="payment_amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(Math.max(Number(firstCustomerInvoice?.amount || 0) - Number(firstCustomerInvoice?.paid_amount || 0), 0)))}"></label><label class="field"><span>Tanggal pembayaran</span><input name="paid_date" type="date" required value="${esc(state.today)}"></label></div>`
        : `<div class="form-grid"><label class="field"><span>Tanggal transaksi</span><input name="transaction_date" type="date" required value="${esc(row.transaction_date || state.today)}"></label><label class="field"><span>Jenis arus</span><select name="kind"><option value="debit" ${row.kind !== 'credit' ? 'selected' : ''}>Uang keluar</option><option value="credit" ${row.kind === 'credit' ? 'selected' : ''}>Uang masuk</option></select></label><label class="field"><span>Kategori</span><select name="category" required>${categoryOptions}</select></label><label class="field"><span>Nama pengajuan / sumber</span><input name="requester" value="${esc(row.requester || '')}" placeholder="Nama pemohon atau sumber dana"></label><label class="field field-wide"><span>Nominal</span><input name="amount" type="text" inputmode="numeric" pattern="[0-9.]*" data-money-input required value="${esc(formatAmountInput(row.amount ?? ''))}"></label><label class="field field-wide"><span>Keterangan</span><textarea name="description" rows="3" placeholder="Tujuan transaksi atau detail sumber dana">${esc(row.description || '')}</textarea></label></div>`;
  const title = opening ? 'Atur saldo awal' : contract ? (row.id ? 'Edit nilai kontrak' : 'Tambah kontrak') : contractPayment ? 'Catat pembayaran kontrak' : confirmInvoicePaid ? 'Konfirmasi pembayaran' : invoice ? 'Edit invoice customer' : invoicePayment ? 'Catat pembayaran invoice' : customerPayment ? 'Catat pembayaran customer' : row.id ? 'Edit transaksi kas' : 'Transaksi baru';
  const kind = opening ? 'opening' : contract ? 'contract' : contractPayment ? 'contract-payment' : confirmInvoicePaid ? 'confirm-invoice-paid' : invoice ? 'invoice' : invoicePayment ? 'invoice-payment' : customerPayment ? 'customer-payment' : 'transaction';
  const submit = contract ? (row.id ? 'Simpan perubahan' : 'Simpan kontrak') : confirmInvoicePaid ? 'Ya, sudah dibayar' : contractPayment || invoicePayment || customerPayment ? 'Catat pembayaran' : invoice ? 'Simpan perubahan' : 'Simpan';
  return `<div class="modal-backdrop" data-act="backdrop"><section class="modal-card" role="dialog" aria-modal="true"><header class="modal-heading"><div><p class="eyebrow">PT SWATAMA KARYA GEMILANG</p><h2>${title}</h2></div><button class="icon-button" type="button" data-act="close-modal" aria-label="Tutup">${icon('close', 18)}</button></header><form class="form-stack modal-form" data-form="modal" data-kind="${kind}" data-id="${esc(row.id || '')}" data-contract-id="${esc(contractPayment ? row.id : '')}">${body}<div class="modal-actions"><button class="button secondary" type="button" data-act="close-modal">${icon('close', 16)}<span>Batal</span></button><button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>${icon('save', 16)}<span>${submit}</span></button></div></form></section></div>`;
}

export function renderApp(state) {
  if (!state.configured) return `<main class="auth-screen"><section class="auth-card"><p class="eyebrow">PENYIAPAN CASHFLOW SKG</p><h1>Hubungkan Supabase</h1><p class="auth-copy">Isi <code>.env.local</code> dengan URL dan anon key project Supabase, lalu muat ulang halaman.</p></section></main>`;
  if (!state.session) return signIn(state);
  if (state.profileLoading) return '<main class="auth-screen"><div class="loading-card">Memuat akun…</div></main>';
  if (state.profileError) return `<main class="auth-screen"><section class="auth-card"><h1>Akses akun belum siap</h1><div class="notice notice-warn"><span>${esc(state.profileError)}</span></div><button class="button secondary button-wide" type="button" data-act="signout">Keluar</button></section></main>`;
  if (!state.profile?.workspace_id) return `<main class="auth-screen"><section class="auth-card"><img src="/brand-mark.png" alt="" class="auth-logo"><p class="eyebrow">AKUN STAFF</p><h1>Akses menunggu developer</h1><p class="auth-copy">Akun ${esc(state.session.user.email)} sudah terdaftar. Developer perlu menghubungkan akun ke workspace Cashflow SKG melalui Supabase SQL Editor.</p><button class="button secondary button-wide" type="button" data-act="signout">Keluar</button></section></main>`;
  const isDeveloper = state.profile.role === 'developer';
  const tabs = [['dashboard', 'Ringkasan', 'home'], ['cashflow', 'Cashflow', 'wallet'], ['tagihan', 'Invoice', 'file'], ...(isDeveloper ? [['accounts', 'Akun & akses', 'users'], ['logs-input', 'Log Input', 'file']] : [])];
  const tab = tabs.find(([key]) => key === state.tab) ? state.tab : 'dashboard';
  const content = tab === 'dashboard' ? dashboard(state) : tab === 'cashflow' ? cashflow(state) : tab === 'tagihan' ? invoices(state) : tab === 'accounts' ? accountAccess(state) : logs(state);
  return `<div class="app-shell"><header class="topbar"><a class="brand" href="#" data-act="navigate" data-tab="dashboard"><img src="/brand-mark.png" alt="Logo PT Swatama Karya Gemilang"><span><strong>Cashflow SKG</strong><small>PT Swatama Karya Gemilang</small></span></a><a class="copyright-link" href="https://github.com/alfajrin23" target="_blank" rel="noopener noreferrer">Copyright 2026 by Al Fajrin A Alamsyah</a><nav class="main-nav" aria-label="Navigasi utama">${tabs.map(([key, label, glyph]) => `<button class="nav-tab ${tab === key ? 'active' : ''}" type="button" data-act="navigate" data-tab="${key}">${icon(glyph, 17)}<span>${label}</span></button>`).join('')}</nav><div class="account-menu"><span class="role-badge ${isDeveloper ? 'developer' : ''}">${isDeveloper ? 'Developer' : 'Staff'}</span><span class="account-email" title="${esc(state.session.user.email)}">${esc(state.session.user.email)}</span><button class="icon-button" type="button" data-act="signout" aria-label="Keluar">${icon('logout', 17)}</button></div></header><main class="workspace">${state.error ? `<div class="notice notice-warn load-notice">${icon('alert', 17)}<span>${esc(state.error)}</span><button type="button" data-act="retry">Coba lagi</button></div>` : ''}${state.loading ? '<div class="loading-line"><i></i> Memuat data kas…</div>' : ''}${content}</main>${modal(state)}<div class="toast-stack" aria-live="polite">${state.toast ? `<div class="toast ${state.toast.type}" role="status">${icon(state.toast.type === 'error' ? 'alert' : 'check', 17)}<span>${esc(state.toast.message)}</span></div>` : ''}</div></div>`;
}
