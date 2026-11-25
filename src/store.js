// Estado em memória da empresa aberta + cálculos derivados (sem DOM).
import { DAY, age, daysSince, sum, pl, brl, brlc, pct, esc } from './lib.js';

export const state = {
  user: null,
  orgs: [], // [{id, name, document, plan, role}]
  org: null,
  products: [], customers: [], sales: [], campaigns: [], automations: [], aiLog: [],
  stats: new Map(), // customer_id -> {total, count, last, lastProduct}
  theme: 'system',
};

export const ORIGINS = ['Instagram', 'WhatsApp', 'Indicação', 'Google', 'Loja física', 'Outro'];
export const AUTOS = {
  a1: { name: 'Reativar clientes parados', trigger: 'Cliente sem compra há mais de 90 dias', condition: 'Já gastou mais de R$ 100 no total', action: 'Cria rascunho de campanha de reativação (envio só com aprovação)' },
  a2: { name: 'Alerta de estoque baixo', trigger: 'Produto ativo com 5 unidades ou menos', condition: 'Produto está ativo no catálogo', action: 'Mostra alerta em "O que fazer agora" no painel' },
  a3: { name: 'Boas-vindas a novos leads', trigger: 'Novo contato cadastrado como lead', condition: 'Tem telefone e chegou nos últimos 7 dias', action: 'Cria rascunho de mensagem de boas-vindas' },
};
export const TPL = {
  reactivation: 'Oi, {nome}! Aqui é da {empresa}. Faz um tempo que você não aparece por aqui. Sua última compra foi {ultimo_produto}. Chegaram novidades e separei algumas opções que combinam com você. Quer que eu te mande?',
  leads: 'Oi, {nome}! Obrigado pelo contato com a {empresa}. Posso te mostrar os produtos mais procurados desta semana e tirar suas dúvidas por aqui?',
};
export const STATUS = { lead: ['Lead', 'info'], potencial: ['Potencial', 'info'], cliente: ['Cliente', 'acc'], recorrente: ['Recorrente', 'pos'], inativo: ['Inativo', 'neg'] };

export const isAdmin = () => state.org && (state.org.role === 'owner' || state.org.role === 'admin');
export const prod = (id) => state.products.find((p) => p.id === id) || null;
export const cust = (id) => state.customers.find((c) => c.id === id) || null;
export const saleTotal = (s) => sum(s.items.map((i) => i.qty * i.price));
export const paid = () => state.sales.filter((s) => s.status === 'pago');
export const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);
export const itemsText = (s) => s.items.map((i) => { const p = prod(i.productId); return i.qty + '× ' + esc(p ? p.name : 'Produto removido'); }).join(', ');

export function custStats(c) {
  const st = state.stats.get(c.id);
  const count = st ? st.count : 0, last = st ? st.last : null;
  let status;
  if (!count) status = c.stage === 'potencial' ? 'potencial' : 'lead';
  else if (daysSince(last) > 90) status = 'inativo';
  else status = count >= 2 ? 'recorrente' : 'cliente';
  return { total: st ? st.total : 0, last, count, status, lastProduct: st ? st.lastProduct || 'Produto removido' : null };
}

export function metrics() {
  const P = paid();
  const cur = P.filter((s) => age(s.date) < 30);
  const prev = P.filter((s) => { const a = age(s.date); return a >= 30 && a < 60; });
  const revenue = sum(cur.map(saleTotal)), prevRevenue = sum(prev.map(saleTotal));
  const pending = state.sales.filter((s) => s.status === 'pendente');
  const stats = state.customers.map((c) => ({ ...custStats(c), c }));
  const inactive = stats.filter((x) => x.status === 'inativo').sort((a, b) => b.total - a.total);
  const active = stats.filter((x) => x.status === 'cliente' || x.status === 'recorrente');
  const leads = stats.filter((x) => x.status === 'lead' || x.status === 'potencial');
  const buyers = stats.filter((x) => x.count > 0).length;
  const agg = (list) => { const m = {}; list.forEach((s) => s.items.forEach((i) => { const e = m[i.productId] || (m[i.productId] = { id: i.productId, qty: 0, revenue: 0 }); e.qty += i.qty; e.revenue += i.qty * i.price; })); return m; };
  const curAgg = agg(cur), prevAgg = agg(prev);
  const top = Object.keys(curAgg).map((k) => { const e = curAgg[k], p = prod(k); return { id: k, qty: e.qty, revenue: e.revenue, name: p ? p.name : 'Produto removido' }; }).sort((a, b) => b.revenue - a.revenue);
  const declining = Object.keys(prevAgg).filter((k) => !curAgg[k]).map(prod).filter(Boolean);
  const lowStock = state.products.filter((p) => p.active && p.stock <= 5).sort((a, b) => a.stock - b.stock);
  return {
    revenue, prevRevenue, change: prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue * 100 : null,
    count: cur.length, ticket: cur.length ? revenue / cur.length : null, pending, pendingValue: sum(pending.map(saleTotal)),
    stats, inactive, active, leads, buyers,
    conversion: state.customers.length ? buyers / state.customers.length * 100 : null,
    top, declining, lowStock, curAgg,
  };
}

export function weekly() {
  const P = paid(), out = [];
  for (let w = 7; w >= 0; w--) {
    const lo = w * 7, hi = lo + 7;
    const total = sum(P.filter((s) => { const a = age(s.date); return a >= lo && a < hi; }).map(saleTotal));
    const start = new Date(Date.now() - (hi - 1) * DAY);
    out.push({ total, label: w === 0 ? 'Atual' : String(start.getDate()).padStart(2, '0') + '/' + String(start.getMonth() + 1).padStart(2, '0') });
  }
  return out;
}

// Faturamento pago por dia da semana corrente (segunda a domingo).
export function thisWeek() {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const P = paid();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const end = new Date(d); end.setDate(d.getDate() + 1);
    const total = sum(P.filter((s) => { const t = new Date(s.date); return t >= d && t < end; }).map(saleTotal));
    return { d, total, today: +d === +today, future: d > today };
  });
}

export const niceMax = (v) => { if (v <= 0) return 100; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; };

export function findings(m) {
  const f = [];
  if (m.inactive.length) f.push({ stat: String(m.inactive.length), text: pl(m.inactive.length, 'cliente está', 'clientes estão') + ' sem comprar há mais de 90 dias. Juntos, já gastaram ' + brl(sum(m.inactive.map((x) => x.total))) + ' com você.', label: 'Criar campanha', action: 'campaign-reactivation' });
  const rule = state.automations.find((a) => a.key === 'a2');
  if (rule && rule.enabled && m.lowStock.length) { const p0 = m.lowStock[0]; f.push({ stat: String(m.lowStock.length), text: pl(m.lowStock.length, 'produto', 'produtos') + ' com estoque baixo ou zerado, como ' + esc(p0.name) + ' (' + p0.stock + ' un).', label: 'Ver estoque', action: 'goto', v: 'produtos', f: 'baixo' }); }
  if (m.pending.length) f.push({ stat: brlc(m.pendingValue), text: 'em ' + m.pending.length + ' ' + pl(m.pending.length, 'venda pendente', 'vendas pendentes') + ' aguardando pagamento.', label: 'Ver pendentes', action: 'goto', v: 'vendas', f: 'pendente' });
  if (m.declining.length) { const d0 = m.declining[0]; f.push({ stat: String(m.declining.length), text: pl(m.declining.length, 'produto vendeu', 'produtos venderam') + ' no mês anterior e não teve venda nos últimos 30 dias, como ' + esc(d0.name) + '.', label: 'Revisar preço', action: 'goto', v: 'precificacao', p: d0.id }); }
  if (m.change !== null && Math.abs(m.change) >= 15) f.push({ stat: pct(m.change), text: m.change > 0 ? 'de faturamento em relação aos 30 dias anteriores. Bom momento para reforçar o que funciona.' : 'de faturamento em relação aos 30 dias anteriores. Vale investigar a causa.', label: 'Analisar com a Ipê', action: 'goto', v: 'ia', q: 'Analise minhas vendas dos últimos 30 dias e me diga a causa mais provável da variação.' });
  return f.slice(0, 4);
}

export function personalize(msg, c) {
  const st = custStats(c);
  return msg.replace(/\{nome\}/g, c.name.split(' ')[0]).replace(/\{empresa\}/g, state.org ? state.org.name : '').replace(/\{ultimo_produto\}/g, st.lastProduct || 'nossos produtos');
}

export function audienceFor(pub, ids) {
  const m = metrics();
  if (pub === 'inativos') return m.inactive.map((x) => x.c.id);
  if (pub === 'leads') return m.leads.map((x) => x.c.id);
  if (pub === 'clientes_ativos') return m.active.map((x) => x.c.id);
  return (Array.isArray(ids) ? ids : []).map(String).filter((id, i, a) => cust(id) && a.indexOf(id) === i);
}
