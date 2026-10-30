function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function asNumber(value) {
  return Number(value || 0);
}

export function downloadCashflowCsv(rows, cashbook, month) {
  const header = ['Tanggal', 'Jenis arus', 'Kategori', 'Pengaju / sumber', 'Keterangan', 'Buku kas', 'Bank / rekening', 'Uang masuk', 'Uang keluar', 'Arus bersih', 'Bukti dikirim ke office'];
  const data = rows.map((row) => {
    const amount = asNumber(row.amount);
    const incoming = row.kind === 'credit' ? amount : '';
    const outgoing = row.kind === 'debit' ? amount : '';
    const net = row.kind === 'credit' ? amount : -amount;
    return [row.transaction_date || '', row.kind === 'credit' ? 'Uang masuk' : 'Uang keluar', row.category || '', row.requester || '', row.description || '', cashbook?.name || '', cashbook?.bank_name || '', incoming, outgoing, net, row.receipt_sent_to_office ? 'Sudah dikirim' : 'Belum dikirim'];
  });
  const csv = '\ufeff' + [header, ...data].map((line) => line.map(csvCell).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `cashflow-skg-${month}.csv`);
}

export function downloadInvoiceCsv(rows, date, period) {
  const header = ['Customer', 'No. invoice', 'No. PO', 'Tanggal invoice', 'Jatuh tempo', 'Nilai invoice', 'Sudah dibayar', 'Sisa tagihan', 'Status pembayaran', 'Tanggal pembayaran terakhir'];
  const data = rows.map((row) => [row.customer || '', row.invoice_number || '', row.po_number || '', row.invoice_date || '', row.due_date || '', asNumber(row.amount), asNumber(row.paid_amount), Math.max(asNumber(row.amount) - asNumber(row.paid_amount), 0), row.statusLabel, row.paid_date || '']);
  const csv = '\ufeff' + [header, ...data].map((line) => line.map(csvCell).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `invoice-customer-${period || 'semua-periode'}-${date}.csv`);
}
