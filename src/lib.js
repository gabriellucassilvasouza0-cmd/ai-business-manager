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

// Ícones: Lucide (importados um a um para o build incluir só os usados).
import { LayoutGrid, Sparkles, Users, Package, ShoppingCart, Megaphone, Calculator, Workflow, Settings, Plus, Search, Menu, X, LogOut, Copy, ArrowRight, Send, Check, TrendingUp, TrendingDown, Info, MessageSquare, User, TriangleAlert, ShieldCheck, Lock, Calendar, Download, ChevronRight, Tag } from 'lucide';
const LUCIDE = { grid: LayoutGrid, sparkles: Sparkles, users: Users, box: Package, cart: ShoppingCart, megaphone: Megaphone, calc: Calculator, flow: Workflow, gear: Settings, plus: Plus, search: Search, menu: Menu, x: X, logout: LogOut, copy: Copy, arrow: ArrowRight, send: Send, check: Check, up: TrendingUp, down: TrendingDown, info: Info, chat: MessageSquare, user: User, alert: TriangleAlert, shield: ShieldCheck, lock: Lock, calendar: Calendar, download: Download, chevron: ChevronRight, tag: Tag };
const svgNode = ([tag, attrs]) => '<' + tag + Object.entries(attrs).map(([k, v]) => ' ' + k + '="' + esc(v) + '"').join('') + '/>';
export const icon = (n) => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (LUCIDE[n] || []).map(svgNode).join('') + '</svg>';
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
