export const CASH_CATEGORIES = [
  'Material', 'Upah / Kasbon Tukang', 'Upah Staff Pelaksana', 'Upah Tim Spesialis',
  'Alat', 'Operasional', 'Giro', 'Subcont', 'Listrik', 'Lain-Lain', 'Fee', 'Kk', 'Pajak',
  'Atk', 'Aset', 'Cost Subcont', 'Cost Listrik', 'Cost Lain Lain',
];

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6m3-3h-6"/>',
  plus: '<path d="M12 5v14m-7-7h14"/>',
  arrow: '<path d="m7 17 10-10M7 7h10v10"/>',
  chart: '<path d="M3 3v18h18M18 17V9m-5 8V5m-5 12v-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18m-2 0-1 14H6L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01"/>',
};

export function icon(name, size = 18) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.wallet}</svg>`;
}

export function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export const money = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value) || 0);

export const number = (value) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value) || 0);
export const formatAmountInput = (value) => String(value ?? '')
  .replace(/\D/g, '')
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const parseAmountInput = (value) => Number(String(value ?? '').replace(/\D/g, '')) || 0;
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', ...options }).format(date);
}

export function monthName(value) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export const inMonth = (date, month) => String(date || '').slice(0, 7) === month;

export function statusForInvoice(invoice) {
  const balance = Math.max(Number(invoice.amount || 0) - Number(invoice.paid_amount || 0), 0);
  if (balance <= 0) return ['paid', 'Lunas'];
  if (Number(invoice.paid_amount || 0) > 0) return ['partial', 'Sebagian dibayar'];
  if (invoice.due_date && invoice.due_date < today()) return ['late', 'Jatuh tempo'];
  return ['open', 'Belum dibayar'];
}
