import ExcelJS from 'exceljs';

const palette = {
  navy: 'FF203C63',
  blue: 'FFE9EFF6',
  green: 'FFE7F2E6',
  greenText: 'FF227556',
  red: 'FFFCE9E7',
  redText: 'FFB83B42',
  amber: 'FFFFF2D8',
  amberText: 'FF996515',
  violet: 'FFEFEAF6',
  ink: 'FF1D2F40',
  muted: 'FF6F7D87',
  line: 'FFDCE3E8',
  white: 'FFFFFFFF',
  paper: 'FFF6F8FA',
};

const amountFormat = '"Rp" #,##0;[Red]-"Rp" #,##0;0';

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateForExcel(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asNumber(value) {
  return Number(value || 0);
}

function newWorkbook(title, subject) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cashflow SKG';
  workbook.lastModifiedBy = 'Cashflow SKG';
  workbook.title = title;
  workbook.subject = subject;
  workbook.company = 'PT Swatama Karya Gemilang';
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

function styleTitle(sheet, title, subtitle, columnCount) {
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: palette.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.navy } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 34;

  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Aptos', size: 10, color: { argb: palette.muted }, italic: true };
  subtitleCell.alignment = { vertical: 'middle' };
  sheet.getRow(2).height = 24;
}

function styleMetadata(sheet, rowNumber, pairs) {
  const row = sheet.getRow(rowNumber);
  for (const [labelColumn, label, valueColumn, value] of pairs) {
    const labelCell = row.getCell(labelColumn);
    labelCell.value = label;
    labelCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: palette.muted } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.blue } };
    labelCell.alignment = { vertical: 'middle' };
    const valueCell = row.getCell(valueColumn);
    valueCell.value = value ?? '-';
    valueCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: palette.ink } };
    valueCell.alignment = { vertical: 'middle', wrapText: true };
  }
  row.height = 24;
}

function styleSummary(sheet, rowNumber, summaries) {
  summaries.forEach(({ column, label, value, tone = 'blue' }) => {
    sheet.mergeCells(rowNumber, column, rowNumber, column + 1);
    sheet.mergeCells(rowNumber + 1, column, rowNumber + 1, column + 1);
    const labelCell = sheet.getCell(rowNumber, column);
    const valueCell = sheet.getCell(rowNumber + 1, column);
    const fill = tone === 'income' ? palette.green : tone === 'expense' ? palette.red : tone === 'outstanding' ? palette.amber : palette.blue;
    const color = tone === 'income' ? palette.greenText : tone === 'expense' ? palette.redText : tone === 'outstanding' ? palette.amberText : palette.navy;
    labelCell.value = label;
    labelCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: color } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    labelCell.alignment = { vertical: 'middle', wrapText: true };
    valueCell.value = value;
    valueCell.font = { name: 'Aptos', size: 12, bold: true, color: { argb: palette.ink } };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    valueCell.alignment = { vertical: 'middle' };
    if (tone !== 'count') valueCell.numFmt = amountFormat;
  });
  sheet.getRow(rowNumber).height = 23;
  sheet.getRow(rowNumber + 1).height = 28;
}

function styleTableHeader(sheet, rowNumber, columnCount) {
  const row = sheet.getRow(rowNumber);
  row.height = 32;
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    if (column > columnCount) return;
    cell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: palette.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: palette.navy } } };
  });
}

function styleBodyRows(sheet, startRow, endRow, columnCount, wrapColumns = []) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      if (column > columnCount) return;
      cell.font = { name: 'Aptos', size: 10, color: { argb: palette.ink } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? palette.white : palette.paper } };
      cell.alignment = { vertical: 'middle', wrapText: wrapColumns.includes(column) };
      cell.border = { bottom: { style: 'hair', color: { argb: palette.line } } };
    });
  }
}

function setSheetDefaults(sheet, zoomScale = 90) {
  sheet.views = [{ state: 'normal', showGridLines: false, zoomScale }];
  sheet.properties.defaultRowHeight = 22;
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

async function downloadWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
}

export async function downloadCashflowExcel(rows, cashbook, month, monthLabel) {
  const workbook = newWorkbook('Cashflow', 'Rekap transaksi arus kas');
  const sheet = workbook.addWorksheet('Cashflow');
  setSheetDefaults(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 7, topLeftCell: 'A8', showGridLines: false, zoomScale: 85 }];
  sheet.columns = [
    { width: 16 }, { width: 17 }, { width: 20 }, { width: 24 }, { width: 42 },
    { width: 22 }, { width: 24 }, { width: 19 }, { width: 19 }, { width: 19 }, { width: 23 },
  ];
  styleTitle(sheet, 'REKAPITULASI CASHFLOW', 'PT Swatama Karya Gemilang - Data mengikuti filter aktif saat diekspor.', 11);
  styleMetadata(sheet, 3, [
    [1, 'Periode', 2, monthLabel], [4, 'Buku kas', 5, cashbook?.name || 'Semua buku kas'], [7, 'Bank / rekening', 8, cashbook?.bank_name || '—'],
  ]);
  const income = rows.filter((row) => row.kind === 'credit').reduce((sum, row) => sum + asNumber(row.amount), 0);
  const expense = rows.filter((row) => row.kind === 'debit').reduce((sum, row) => sum + asNumber(row.amount), 0);
  styleSummary(sheet, 5, [
    { column: 1, label: 'TOTAL UANG MASUK', value: income, tone: 'income' },
    { column: 3, label: 'TOTAL UANG KELUAR', value: expense, tone: 'expense' },
    { column: 5, label: 'ARUS BERSIH', value: income - expense, tone: income === expense ? 'blue' : income > expense ? 'income' : 'expense' },
    { column: 8, label: 'JUMLAH TRANSAKSI', value: rows.length, tone: 'count' },
  ]);
  const headers = ['Tanggal', 'Jenis arus', 'Kategori', 'Pengaju / sumber', 'Keterangan', 'Buku kas', 'Bank / rekening', 'Uang masuk', 'Uang keluar', 'Arus bersih', 'Bukti ke office'];
  const headerRow = 7;
  const head = sheet.getRow(headerRow);
  headers.forEach((label, index) => { head.getCell(index + 1).value = label; });
  rows.forEach((row) => {
    const amount = asNumber(row.amount);
    const incoming = row.kind === 'credit' ? amount : null;
    const outgoing = row.kind === 'debit' ? amount : null;
    const net = row.kind === 'credit' ? amount : -amount;
    sheet.addRow([
      dateForExcel(row.transaction_date), row.kind === 'credit' ? 'Uang masuk' : 'Uang keluar', row.category || '',
      row.requester || '', row.description || '', cashbook?.name || '', cashbook?.bank_name || '', incoming, outgoing, net,
      row.receipt_sent_to_office ? 'Sudah dikirim' : 'Belum dikirim',
    ]);
  });
  const lastRow = headerRow + rows.length;
  styleTableHeader(sheet, headerRow, headers.length);
  styleBodyRows(sheet, headerRow + 1, lastRow, headers.length, [5]);
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: headers.length } };
  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.getCell(1).numFmt = 'dd/mm/yyyy';
    [8, 9, 10].forEach((column) => { row.getCell(column).numFmt = amountFormat; row.getCell(column).alignment = { horizontal: 'right', vertical: 'middle' }; });
    const isIncome = row.getCell(2).value === 'Uang masuk';
    const flowCell = row.getCell(2);
    flowCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: isIncome ? palette.greenText : palette.redText } };
    flowCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isIncome ? palette.green : palette.red } };
    const amountColumn = isIncome ? 8 : 9;
    row.getCell(amountColumn).font = { name: 'Aptos', size: 10, bold: true, color: { argb: isIncome ? palette.greenText : palette.redText } };
    row.getCell(amountColumn).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isIncome ? palette.green : palette.red } };
    const netCell = row.getCell(10);
    netCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: isIncome ? palette.greenText : palette.redText } };
    netCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isIncome ? palette.green : palette.red } };
    const receiptCell = row.getCell(11);
    const sent = receiptCell.value === 'Sudah dikirim';
    receiptCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: sent ? palette.greenText : palette.amberText } };
    receiptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sent ? palette.green : palette.amber } };
  }
  sheet.getColumn(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn(8).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getColumn(9).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getColumn(10).alignment = { horizontal: 'right', vertical: 'middle' };
  return downloadWorkbook(workbook, `cashflow-skg-${month}.xlsx`);
}

export async function downloadInvoiceExcel(rows, date, periodLabel, paymentStatusLabel, contractStatusLabel) {
  const workbook = newWorkbook('Invoice customer', 'Rincian invoice dan posisi kontrak per customer');
  const sheet = workbook.addWorksheet('Invoice');
  setSheetDefaults(sheet);
  sheet.properties.tabColor = { argb: palette.navy };
  sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 7, topLeftCell: 'E8', showGridLines: false, zoomScale: 75 }];
  sheet.columns = [
    { width: 29 }, { width: 20 }, { width: 23 }, { width: 20 }, { width: 16 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 20 }, { width: 20 },
    { width: 20 }, { width: 21 }, { width: 23 },
  ];
  styleTitle(sheet, 'RINCIAN INVOICE CUSTOMER', 'Customer serta nilai kontrak, pembayaran, dan sisa kontrak digabung untuk baris invoice customer yang sama.', 13);
  styleMetadata(sheet, 3, [
    [1, 'Periode invoice', 2, periodLabel], [4, 'Status pembayaran', 5, paymentStatusLabel], [7, 'Tanggal ekspor', 8, dateForExcel(date)],
  ]);
  sheet.getCell(3, 8).numFmt = 'dd/mm/yyyy';
  styleMetadata(sheet, 4, [[1, 'Status kontrak', 2, contractStatusLabel]]);
  const total = rows.reduce((sum, row) => sum + asNumber(row.amount), 0);
  const paid = rows.reduce((sum, row) => sum + asNumber(row.paid_amount), 0);
  const outstanding = rows.reduce((sum, row) => sum + Math.max(asNumber(row.amount) - asNumber(row.paid_amount), 0), 0);
  styleSummary(sheet, 5, [
    { column: 1, label: 'TOTAL NILAI INVOICE', value: total },
    { column: 3, label: 'TOTAL DIBAYAR INVOICE', value: paid, tone: 'income' },
    { column: 5, label: 'SISA TAGIHAN INVOICE', value: outstanding, tone: 'outstanding' },
    { column: 8, label: 'JUMLAH INVOICE', value: rows.length, tone: 'count' },
  ]);
  const headers = [
    'Customer', 'Nilai kontrak', 'Sudah dibayar (kontrak)', 'Sisa kontrak',
    'Tanggal invoice', 'No. invoice', 'No. PO', 'Jatuh tempo', 'Nilai invoice',
    'Sudah dibayar (invoice)', 'Sisa tagihan invoice', 'Status pembayaran', 'Tanggal pembayaran terakhir',
  ];
  const headerRow = 7;
  const head = sheet.getRow(headerRow);
  headers.forEach((label, index) => { head.getCell(index + 1).value = label; });
  rows.forEach((row) => {
    sheet.addRow([
      row.customer || 'Customer belum dicatat', row.contractAmount ?? 'Belum dicatat', row.contractPaidAmount,
      row.contractRemaining, dateForExcel(row.invoice_date), row.invoice_number || '', row.po_number || '',
      dateForExcel(row.due_date), asNumber(row.amount), asNumber(row.paid_amount),
      Math.max(asNumber(row.amount) - asNumber(row.paid_amount), 0), row.statusLabel, dateForExcel(row.paid_date),
    ]);
  });
  const lastRow = headerRow + rows.length;
  styleTableHeader(sheet, headerRow, headers.length);
  styleBodyRows(sheet, headerRow + 1, lastRow, headers.length, [1, 2]);
  for (let rowNumber = headerRow + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    [5, 8, 13].forEach((column) => { row.getCell(column).numFmt = 'dd/mm/yyyy'; row.getCell(column).alignment = { horizontal: 'center', vertical: 'middle' }; });
    [2, 3, 4, 9, 10, 11].forEach((column) => { row.getCell(column).numFmt = amountFormat; row.getCell(column).alignment = { horizontal: 'right', vertical: 'middle' }; });
    if (row.getCell(2).value === 'Belum dicatat') {
      [2, 3, 4].forEach((column) => {
        row.getCell(column).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.paper } };
        row.getCell(column).font = { name: 'Aptos', size: 9, italic: true, color: { argb: palette.muted } };
      });
    } else {
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.blue } };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.green } };
      row.getCell(3).font = { name: 'Aptos', size: 10, color: { argb: palette.greenText } };
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.amber } };
      row.getCell(4).font = { name: 'Aptos', size: 10, bold: true, color: { argb: palette.amberText } };
    }
    row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.blue } };
    row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.green } };
    row.getCell(10).font = { name: 'Aptos', size: 10, color: { argb: palette.greenText } };
    row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.amber } };
    row.getCell(11).font = { name: 'Aptos', size: 10, bold: true, color: { argb: palette.amberText } };
    const statusCell = row.getCell(12);
    const statusTone = row.getCell(11).value <= 0 ? 'paid' : row.getCell(12).value === 'Jatuh tempo' ? 'late' : row.getCell(12).value === 'Sebagian dibayar' ? 'partial' : 'open';
    const statusColors = statusTone === 'paid' ? [palette.green, palette.greenText]
      : statusTone === 'late' ? [palette.red, palette.redText]
        : statusTone === 'partial' ? [palette.violet, 'FF775D92'] : [palette.amber, palette.amberText];
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColors[0] } };
    statusCell.font = { name: 'Aptos', size: 9, bold: true, color: { argb: statusColors[1] } };
    statusCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
  let customerStartIndex = 0;
  while (customerStartIndex < rows.length) {
    const customerKey = String(rows[customerStartIndex].customer || '').trim().toLocaleLowerCase('id-ID');
    let customerEndIndex = customerStartIndex + 1;
    while (customerEndIndex < rows.length
      && String(rows[customerEndIndex].customer || '').trim().toLocaleLowerCase('id-ID') === customerKey) {
      customerEndIndex += 1;
    }
    const customerStartRow = headerRow + 1 + customerStartIndex;
    const customerEndRow = headerRow + customerEndIndex;
    if (customerEndRow > customerStartRow) {
      sheet.mergeCells(customerStartRow, 1, customerEndRow, 1);
      sheet.getCell(customerStartRow, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }

    let contractStartIndex = customerStartIndex;
    while (contractStartIndex < customerEndIndex) {
      const contractKey = rows[contractStartIndex].contractGroupKey || '';
      let contractEndIndex = contractStartIndex + 1;
      while (contractEndIndex < customerEndIndex
        && (rows[contractEndIndex].contractGroupKey || '') === contractKey) {
        contractEndIndex += 1;
      }
      const contractStartRow = headerRow + 1 + contractStartIndex;
      const contractEndRow = headerRow + contractEndIndex;
      if (contractEndRow > contractStartRow) {
        [2, 3, 4].forEach((column) => sheet.mergeCells(contractStartRow, column, contractEndRow, column));
      }
      [2, 3, 4].forEach((column) => {
        sheet.getCell(contractStartRow, column).alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      });
      contractStartIndex = contractEndIndex;
    }
    customerStartIndex = customerEndIndex;
  }
  sheet.getColumn(5).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn(6).alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getColumn(7).alignment = { vertical: 'middle', horizontal: 'left' };
  return downloadWorkbook(workbook, `invoice-customer-${periodLabel === 'Semua periode' ? 'semua-periode' : periodLabel.replaceAll(' ', '-')}-${date}.xlsx`);
}
