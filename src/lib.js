// Utilitários puros (sem DOM no import): formatação, escape, datas, ícones.
export const DAY = 864e5;

const fBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fBRLc = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
export const brl = (v) => fBRL.format(v || 0);
export const brlc = (v) => (Math.abs(v) >= 1000 ? fBRLc.format(v) : fBRL.format(v || 0).replace(/,00$/, ''));
export const pct = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + '%';
export const fmtPct = (v) => v.toFixed(1).replace('.', ',') + '%';
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const pl = (n, one, many) => (n === 1 ? one : many);
export const age = (iso) => (Date.now() - new Date(iso).getTime()) / DAY;
export const daysSince = (iso) => Math.floor(age(iso));
export const rel = (iso) => { const d = daysSince(iso); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : 'há ' + d + ' dias'; };
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('pt-BR');
export const isoDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const dec = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','));
export function parseDec(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return null;
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
export const monthLabel = () => new Date().toLocaleDateString('pt-BR', { month: 'long' });
export const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Datas comerciais brasileiras (fixas e móveis) para o calendário do painel.
function nthWeekday(y, m, wd, n) { const d = new Date(y, m, 1); const off = (wd - d.getDay() + 7) % 7; return new Date(y, m, 1 + off + (n - 1) * 7); }
function lastWeekday(y, m, wd) { const d = new Date(y, m + 1, 0); return new Date(y, m, d.getDate() - ((d.getDay() - wd + 7) % 7)); }
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
export function commercialDates(y) {
  return [
    ['Dia do Consumidor', new Date(y, 2, 15)], ['Páscoa', easter(y)], ['Dia das Mães', nthWeekday(y, 4, 0, 2)],
    ['Dia dos Namorados', new Date(y, 5, 12)], ['Dia dos Pais', nthWeekday(y, 7, 0, 2)], ['Dia do Cliente', new Date(y, 8, 15)],
    ['Dia das Crianças', new Date(y, 9, 12)], ['Black Friday', lastWeekday(y, 10, 5)], ['Natal', new Date(y, 11, 25)],
  ].map(([name, date]) => ({ name, date }));
}
export function nextCommercialDate(from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const list = commercialDates(today.getFullYear()).concat(commercialDates(today.getFullYear() + 1));
  const next = list.filter((x) => x.date >= today).sort((a, b) => a.date - b.date)[0];
  return { ...next, days: Math.round((next.date - today) / DAY) };
}

export const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2.5l2.6 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h.01M16 18.5h.01"/>',
  flow: '<rect x="3" y="3" width="8" height="8" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  up: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  down: '<path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
};
export const icon = (n) => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
export const LOGO = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" style="fill:var(--orange)"/><path d="M16 6.5l2.3 6.2 6.2 2.3-6.2 2.3L16 23.5l-2.3-6.2L7.5 15l6.2-2.3z" style="fill:var(--ink)"/></svg>';

// Markdown mínimo e seguro: escapa tudo antes de formatar.
export function md(src) {
  const out = []; let list = null;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const close = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  esc(src).split('\n').forEach((l) => {
    let mm;
    if ((mm = l.match(/^\s*[-•*]\s+(.*)$/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(mm[1]) + '</li>'); }
    else if ((mm = l.match(/^\s*(\d{1,3})[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out.push('<ol start="' + mm[1] + '">'); list = 'ol'; } out.push('<li>' + inline(mm[2]) + '</li>'); }
    else if ((mm = l.match(/^\s*#{1,6}\s+(.*)$/))) { close(); out.push('<p class="md-h">' + inline(mm[1]) + '</p>'); }
    else if (!l.trim()) close();
    else { close(); out.push('<p>' + inline(l) + '</p>'); }
  });
  close();
  return out.join('');
}

// Precificação: preço mínimo, recomendado e comercial.
export function calcPricing(v) {
  const opt = (x) => { const n = parseDec(x); return n === null ? 0 : n; };
  const cost = parseDec(v.cost), freight = opt(v.freight), fee = opt(v.fee), tax = opt(v.tax), margin = parseDec(v.margin);
  if (cost === null || Number.isNaN(cost) || cost < 0) return { error: 'Informe o custo do produto (valor igual ou maior que zero).' };
  if ([freight, fee, tax].some((n) => Number.isNaN(n) || n < 0)) return { error: 'Frete, taxa e imposto precisam ser números iguais ou maiores que zero.' };
  if (margin === null || Number.isNaN(margin) || margin < 0) return { error: 'Informe a margem desejada em %, por exemplo 30.' };
  const rate = (fee + tax) / 100, m = margin / 100, ct = cost + freight;
  if (rate >= 1) return { error: 'Taxa + imposto somam 100% ou mais. Nenhum preço cobre isso.' };
  if (rate + m >= 1) return { error: 'Taxa + imposto + margem somam ' + fmtPct((rate + m) * 100) + '. A soma precisa ficar abaixo de 100%.' };
  const min = ct / (1 - rate), rec = ct / (1 - rate - m), profit = rec * (1 - rate) - ct, charm = Math.ceil(rec - 0.9) + 0.9;
  return { ct, rate, min, rec, profit, markup: ct > 0 ? rec / ct : null, charm, margin };
}

export function toCSV(rows) {
  const cell = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return String.fromCharCode(0xfeff) + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}
