// Telas do app (HTML gerado a partir do estado; todo texto vindo de dados passa por esc()).
import { state, metrics, weekly, thisWeek, findings, niceMax, custStats, saleTotal, paid, byDateDesc, itemsText, prod, cust, personalize, isAdmin, STATUS } from './store.js';
import { brl, brlc, pct, fmtPct, esc, sum, pl, age, rel, fmtDate, initials, dec, norm, icon, md, calcPricing, nextCommercialDate } from './lib.js';
import { chat, MODES, PROP_ICON, suggestions } from './ipe.js';

export const ui = {
  prodQ: '', prodCat: '', prodFilter: 'todos', custQ: '', custTab: 'todos', saleTab: 'todas', saleLimit: 15, openCampaign: null,
  pricing: { productId: '', cost: '', freight: '0', fee: '4,99', tax: '0', margin: '30' },
};

export const statusChip = (s) => { const x = STATUS[s]; return '<span class="chip ' + x[1] + '">' + x[0] + '</span>'; };
export const saleChip = (s) => (s === 'pago' ? '<span class="chip pos">Pago</span>' : s === 'pendente' ? '<span class="chip warn">Pendente</span>' : '<span class="chip">Cancelado</span>');
export const dataAttrs = (o) => ['v', 'f', 'p', 'q', 'c'].filter((k) => o[k] != null).map((k) => 'data-' + k + '="' + esc(o[k]) + '"').join(' ');
const R = (i) => ' style="--i:' + i + '"';
const TINTS = ['t-mint', 't-peach', 't-sand', 't-sky'];

function kpi(i, label, value, foot, bar) {
  return '<div class="card kpi lift rise"' + R(i) + '><p class="kpi-label">' + label + '</p><p class="kpi-value">' + value + '</p>' +
    (bar != null ? '<div class="thin' + (bar.tone ? ' ' + bar.tone : '') + '" aria-hidden="true"><i style="width:' + Math.max(0, Math.min(100, bar.v)).toFixed(1) + '%"></i></div>' : '') +
    '<div class="kpi-foot">' + foot + '</div></div>';
}
const empty = (title, text, btn) => '<div class="card empty-card rise"><span class="empty-ic">' + icon('sparkles') + '</span><p class="card-title">' + title + '</p><p class="muted">' + text + '</p>' + (btn || '') + '</div>';

/* ---------- painel ---------- */
export function viewDashboard() {
  const m = metrics(), F = findings(m), W = weekly(), wk = thisWeek(), next = nextCommercialDate();
  const h = new Date().getHours(), hi = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const first = String((state.user && state.user.user_metadata && state.user.user_metadata.full_name) || '').split(' ')[0];
  const maxW = niceMax(Math.max(...W.map((w) => w.total)));
  const topMax = Math.max(1, ...m.top.map((t) => t.revenue));
  const faces = m.stats.filter((x) => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 4);
  const ev = [];
  state.sales.slice(0, 40).forEach((s) => ev.push({ t: s.date, k: 'sale', s }));
  state.customers.slice(0, 20).forEach((c) => ev.push({ t: c.createdAt, k: 'cust', c }));
  state.campaigns.slice(0, 20).forEach((c) => ev.push({ t: c.createdAt, k: 'camp', c }));
  state.aiLog.forEach((a) => ev.push({ t: a.at, k: 'ia', text: a.text }));
  ev.sort((a, b) => new Date(b.t) - new Date(a.t));
  const total = state.customers.length || 1;
  const segs = [[m.active.length, 'var(--accent)', 'Ativos'], [m.inactive.length, 'var(--orange)', 'Inativos'], [m.leads.length, 'var(--info)', 'Leads']];
  const wkMax = Math.max(1, ...wk.map((d) => d.total));
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const hero = '<section class="hero rise"' + R(0) + '><div class="hero-main"><p class="hero-eyebrow">' + esc(state.org.name) + ' · últimos 30 dias</p>' +
    '<h1 class="hero-title">' + hi + (first ? ', ' + esc(first) : '') + '. ' + (F.length ? F.length + ' ' + pl(F.length, 'ponto pede', 'pontos pedem') + ' atenção hoje.' : 'Tudo em dia por aqui.') + '</h1>' +
    '<p class="hero-sub">A Ipê lê os números da sua empresa antes de sugerir qualquer coisa, e nada muda no sistema sem a sua aprovação.</p>' +
    '<div class="hero-cta"><a class="btn btn-orange" href="#ia">' + icon('sparkles') + 'Perguntar à Ipê</a><button type="button" class="btn btn-on-ink" data-action="sale-new">' + icon('plus') + 'Nova venda</button></div></div>' +
    (faces.length ? '<div class="hero-side"><div class="av-stack" aria-label="Clientes que mais compraram">' + faces.map((x, i) => '<span class="av ' + TINTS[i % 4] + '" title="' + esc(x.c.name) + '">' + esc(initials(x.c.name)) + '</span>').join('') + '</div><p class="hero-note"><span class="live-dot"></span>' + m.active.length + ' ' + pl(m.active.length, 'cliente ativo', 'clientes ativos') + '</p></div>' : '') +
  '</section>';

  const week = '<section class="card week lift rise"' + R(1) + ' aria-label="Esta semana"><div class="week-head"><h2>' + esc(month.charAt(0).toUpperCase() + month.slice(1)) + '</h2><a class="link" href="#vendas">Vendas</a></div>' +
    '<ol class="days">' + wk.map((d) => '<li class="day' + (d.today ? ' today' : '') + (d.future ? ' future' : '') + '"><span class="day-w">' + d.d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + '</span><span class="day-n">' + d.d.getDate() + '</span><span class="day-bar" aria-hidden="true"><i style="height:' + (d.total / wkMax * 100).toFixed(0) + '%"></i></span><span class="day-v">' + (d.future ? '·' : d.total ? (d.total >= 1000 ? brlc(d.total) : 'R$ ' + Math.round(d.total)) : '—') + '</span></li>').join('') + '</ol>' +
    '<p class="week-foot">' + icon('calendar') + '<span>Próxima data comercial: <strong>' + esc(next.name) + '</strong>, ' + next.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' · ' + (next.days === 0 ? 'hoje' : next.days === 1 ? 'amanhã' : 'em ' + next.days + ' dias') + '</span></p>' +
    '<a class="btn btn-ghost btn-sm" href="#ia" data-action="goto" data-v="ia" data-q="' + esc('Monte um plano de vendas para ' + next.name + ' com base nos meus produtos e clientes.') + '">' + icon('sparkles') + 'Planejar com a Ipê</a></section>';

  const kpis = '<section class="kpis" aria-label="Indicadores">' +
    kpi(2, 'Faturamento', brl(m.revenue), m.change === null ? '<span class="kpi-note">sem base de comparação</span>' : '<span class="chip ' + (m.change >= 0 ? 'pos' : 'neg') + '">' + icon(m.change >= 0 ? 'up' : 'down') + pct(m.change) + '</span><span class="kpi-note">vs. 30 dias antes</span>', null) +
    kpi(3, 'Vendas pagas', String(m.count), '<span class="kpi-note">' + m.pending.length + ' ' + pl(m.pending.length, 'pendente', 'pendentes') + '</span>', m.count + m.pending.length ? { v: m.count / (m.count + m.pending.length) * 100 } : null) +
    kpi(4, 'Ticket médio', m.ticket === null ? '—' : brl(m.ticket), '<span class="kpi-note">por venda paga</span>', null) +
    kpi(5, 'Conversão', m.conversion === null ? '—' : fmtPct(m.conversion), '<span class="kpi-note">' + m.buyers + ' de ' + state.customers.length + ' contatos compraram</span>', m.conversion === null ? null : { v: m.conversion, tone: 'orange' }) +
  '</section>';

  const todo = '<section class="card todo-card rise"' + R(6) + '><div class="card-head"><h2>O que fazer agora</h2><a class="link" href="#ia" data-action="goto" data-v="ia" data-q="Analise os dados da empresa e me diga as 3 prioridades desta semana para vender mais, com um plano dia a dia.">Plano da semana com a Ipê</a></div>' +
    (F.length ? '<ul class="todo">' + F.map((f, i) => '<li class="todo-item ' + TINTS[i % 4] + '"><span class="todo-stat">' + esc(f.stat) + '</span><p class="todo-text">' + f.text + '</p><button type="button" class="btn btn-sm btn-ink" data-action="' + f.action + '" ' + dataAttrs(f) + '>' + esc(f.label) + icon('arrow') + '</button></li>').join('') + '</ul>'
      : '<p class="empty">' + (state.sales.length ? 'Nenhum cliente parado, estoque baixo ou venda pendente.' : 'Cadastre produtos, clientes e vendas para os alertas aparecerem aqui.') + '</p>') + '</section>';

  const chart = '<section class="card c-chart rise"' + R(7) + '><div class="card-head"><h2>Faturamento por semana</h2><span class="muted small">Vendas pagas · 8 semanas</span></div>' +
    '<div class="chart" role="img" aria-label="Faturamento semanal das últimas 8 semanas. Semana atual: ' + esc(brl(W[7].total)) + '.">' +
      '<div class="y-axis"><span style="top:0">' + brlc(maxW) + '</span><span style="top:50%">' + brlc(maxW / 2) + '</span><span style="top:100%">R$ 0</span></div>' +
      '<div class="plot"><div class="gridlines"><i></i><i></i><i></i></div><div class="bars">' + W.map((w, i) => { const hh = w.total ? Math.max(2, w.total / maxW * 100) : 0; return '<div class="bar-col"><div class="bar' + (i === 7 ? ' cur' : '') + '" style="height:' + hh.toFixed(1) + '%" title="' + w.label + ': ' + esc(brl(w.total)) + '">' + (i === 7 && w.total ? '<span class="bar-val">' + brlc(w.total) + '</span>' : '') + '</div></div>'; }).join('') + '</div></div>' +
      '<div class="x-axis">' + W.map((w, i) => '<span class="' + (i === 7 ? 'cur' : '') + '">' + w.label + '</span>').join('') + '</div>' +
    '</div><p class="muted small chart-note">Cada barra soma as vendas pagas de 7 dias. O rótulo é o dia em que a semana começa.</p></section>';

  const top = '<section class="card c-top rise"' + R(8) + '><div class="card-head"><h2>Mais vendidos</h2><a class="link" href="#produtos">Catálogo</a></div>' +
    (m.top.length ? '<ol class="rank">' + m.top.slice(0, 5).map((t, i) => '<li><div class="rank-row"><span class="rank-pos">' + (i + 1) + '</span><span class="rank-name">' + esc(t.name) + '</span><span class="rank-val">' + brl(t.revenue) + '</span></div><div class="thin' + (i ? '' : ' orange') + '"><i style="width:' + (t.revenue / topMax * 100).toFixed(1) + '%"></i></div><span class="rank-sub">' + t.qty + ' ' + pl(t.qty, 'unidade vendida', 'unidades vendidas') + '</span></li>').join('') + '</ol>' : '<p class="empty">Nenhuma venda paga nos últimos 30 dias.</p>') +
  '</section>';

  const base = '<section class="card c-base rise"' + R(9) + '><div class="card-head"><h2>Base de clientes</h2><a class="link" href="#clientes">Abrir CRM</a></div><div class="base">' +
    '<div class="base-bar" aria-hidden="true">' + segs.map((s) => '<i style="width:' + (s[0] / total * 100).toFixed(1) + '%;background:' + s[1] + '"></i>').join('') + '</div>' +
    '<div class="base-legend">' + segs.map((s) => '<div><strong>' + s[0] + '</strong><span><i class="dot" style="background:' + s[1] + '"></i>' + s[2] + '</span></div>').join('') + '</div>' +
    '<p class="muted small">Inativo: já comprou, mas não nos últimos 90 dias. Lead: ainda não comprou.</p></div></section>';

  const feed = '<section class="card c-feed rise"' + R(10) + '><div class="card-head"><h2>Atividade recente</h2><a class="link" href="#vendas">Ver vendas</a></div>' +
    (ev.length ? '<ul class="feed">' + ev.slice(0, 7).map((e) => {
      if (e.k === 'sale') { const c = e.s.customerId ? cust(e.s.customerId) : null; const lbl = e.s.status === 'pago' ? 'Venda paga' : e.s.status === 'pendente' ? 'Venda pendente' : 'Venda cancelada'; return '<li><span class="feed-dot t-mint">' + icon('cart') + '</span><span class="feed-txt">' + lbl + ' de <strong>' + brl(saleTotal(e.s)) + '</strong>' + (c ? '<span class="feed-sub">' + esc(c.name) + '</span>' : '') + '</span><time>' + rel(e.t) + '</time></li>'; }
      if (e.k === 'cust') return '<li><span class="feed-dot t-sky">' + icon('user') + '</span><span class="feed-txt">Novo contato: ' + esc(e.c.name) + '<span class="feed-sub">Origem: ' + esc(e.c.origin || 'não informada') + '</span></span><time>' + rel(e.t) + '</time></li>';
      if (e.k === 'ia') return '<li><span class="feed-dot t-peach">' + icon('sparkles') + '</span><span class="feed-txt">' + esc(e.text) + '<span class="feed-sub">Ação da Ipê aprovada</span></span><time>' + rel(e.t) + '</time></li>';
      return '<li><span class="feed-dot t-sand">' + icon('megaphone') + '</span><span class="feed-txt">Campanha criada<span class="feed-sub">' + esc(e.c.name) + '</span></span><time>' + rel(e.t) + '</time></li>';
    }).join('') + '</ul>' : '<p class="empty">Nada por aqui ainda.</p>') + '</section>';

  const onboarding = !state.products.length ? '<section class="card start rise"' + R(2) + '><h2>Primeiros passos</h2><ol class="steps"><li class="' + (state.products.length ? 'done' : '') + '"><span>1</span>Cadastre seus produtos com preço, custo e estoque <button type="button" class="btn btn-sm btn-ink" data-action="product-new">Cadastrar produto</button></li><li class="' + (state.customers.length ? 'done' : '') + '"><span>2</span>Cadastre seus clientes e de onde vieram <button type="button" class="btn btn-sm btn-ghost" data-action="cust-new">Cadastrar cliente</button></li><li><span>3</span>Registre as vendas: o estoque baixa sozinho</li><li><span>4</span>Pergunte à Ipê o que fazer para vender mais</li></ol></section>' : '';

  return '<div class="dash">' + '<div class="dash-top">' + hero + week + '</div>' + onboarding + kpis +
    '<div class="dash-cols"><div class="col">' + todo + chart + '</div><div class="col">' + top + base + feed + '</div></div></div>';
}

/* ---------- Ipê ---------- */
export function viewIA() {
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Assistente de vendas</p><h1>Ipê</h1><p class="lede">Análises, estratégias de venda, textos para clientes e redes, respostas a reclamações e planos. A Ipê lê os dados da sua empresa a cada pergunta e só mexe no sistema com a sua aprovação.</p></div></div>' +
    '<section class="chat rise"' + R(1) + ' aria-label="Conversa com a Ipê">' +
      '<header class="chat-head"><span class="ai-badge">' + icon('sparkles') + '</span><div class="grow"><strong>Ipê · ' + esc(state.org.name) + '</strong><span class="chat-sub" id="ipe-sub">' + ipeSub() + '</span></div>' +
        '<div class="chat-tools"><div class="seg-mini" role="group" aria-label="Profundidade da resposta">' + MODES.map((o) => '<button type="button" data-action="ai-mode" data-v="' + o[0] + '" aria-pressed="' + (chat.mode === o[0]) + '">' + o[1] + '</button>').join('') + '</div>' +
        '<button type="button" class="head-btn" data-action="chat-clear">Limpar</button></div></header>' +
      '<div class="chat-log" id="chat-log" aria-live="polite"></div>' +
      '<div class="suggest">' + suggestions().map((s) => '<button type="button" class="pill" data-action="chat-suggest" data-q="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
      '<form class="chat-form" id="chat-form"><label class="sr-only" for="chat-input">Sua mensagem</label><textarea id="chat-input" rows="1" maxlength="4000" placeholder="Pergunte à Ipê sobre suas vendas"></textarea>' +
        '<button class="btn btn-primary icon-only" type="submit" id="chat-send" aria-label="Enviar">' + icon('send') + '</button></form>' +
      '<p class="chat-fine">A Ipê pode errar. Confira números e textos antes de usar com clientes.</p>' +
    '</section></div>';
}
export const ipeSub = () => (chat.busy ? 'Lendo os dados da empresa…' : 'Só vendas, marketing e gestão comercial' + (chat.remaining != null ? ' · ' + chat.remaining + ' ' + pl(chat.remaining, 'pergunta restante', 'perguntas restantes') + ' hoje' : ''));

function propHTML(m, x, i) {
  const st = x.status === 'aprovada' ? '<span class="chip pos">' + icon('check') + 'Executada</span>' : x.status === 'descartada' ? '<span class="chip">Descartada</span>' : x.status === 'erro' ? '<span class="chip neg">Não executada</span>' : x.status === 'rodando' ? '<span class="chip">Executando…</span>' : '<span class="chip warn">Aguarda aprovação</span>';
  return '<div class="prop' + (x.status !== 'pendente' ? ' done' : '') + '"><div class="prop-head">' + icon(PROP_ICON[x.data.tipo] || 'sparkles') + '<strong>' + esc(x.title) + '</strong>' + st + '</div><div class="prop-body">' +
    '<ul class="prop-lines">' + x.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' +
    (x.result ? '<p class="prop-res">' + esc(x.result) + '</p>' : '') +
    (x.status === 'pendente' ? '<div class="row-actions start"><button type="button" class="btn btn-primary btn-sm" data-action="ai-approve" data-m="' + m.id + '" data-i="' + i + '">' + icon('check') + 'Aprovar e executar</button><button type="button" class="btn btn-ghost btn-sm" data-action="ai-dismiss" data-m="' + m.id + '" data-i="' + i + '">Descartar</button></div>' : '') +
    (x.go ? '<div class="row-actions start"><button type="button" class="btn btn-ghost btn-sm" data-action="goto" data-v="' + x.go.v + '"' + (x.go.c ? ' data-c="' + esc(x.go.c) + '"' : '') + '>' + esc(x.go.label) + icon('arrow') + '</button></div>' : '') +
  '</div></div>';
}
export function msgHTML(m) {
  if (m.role === 'user') return '<div class="msg user"><div class="bubble">' + esc(m.text) + '</div></div>';
  if (m.pending) return '<div class="msg ai" id="' + m.id + '"><div class="bubble typing"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span class="think">Lendo os dados da empresa…</span></div></div>';
  const foot = (m.text && m.id !== 'intro' ? '<button type="button" class="btn btn-subtle btn-sm" data-action="chat-copy" data-m="' + m.id + '">' + icon('copy') + 'Copiar</button>' : '') + (m.retryable ? '<button type="button" class="btn btn-subtle btn-sm" data-action="chat-retry" data-m="' + m.id + '">Tentar de novo</button>' : '');
  return '<div class="msg ai' + (m.guard ? ' guard' : '') + '" id="' + m.id + '"><div class="bubble">' + (m.guard === 'fora' ? '<span class="guard-tag">' + icon('shield') + 'Fora do escopo</span>' : '') +
    (m.text ? '<div class="md">' + md(m.text) + '</div>' : '') +
    (m.error ? '<p class="err-note">' + esc(m.error) + '</p>' : '') +
    (m.actions && m.actions.length ? '<div class="props">' + m.actions.map((x, i) => propHTML(m, x, i)).join('') + '</div>' : '') +
    (foot ? '<div class="msg-foot">' + foot + '</div>' : '') + '</div></div>';
}

/* ---------- produtos ---------- */
export function viewProdutos() {
  const cats = Array.from(new Set(state.products.map((p) => p.category).filter(Boolean))).sort();
  const tabs = [['todos', 'Todos'], ['baixo', 'Estoque baixo'], ['esgotado', 'Esgotados']];
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Catálogo</p><h1>Produtos</h1><p class="lede">Preço, custo, margem e estoque. Toda venda registrada baixa o estoque automaticamente.</p></div><div class="head-actions"><button type="button" class="btn btn-primary" data-action="product-new">' + icon('plus') + 'Novo produto</button></div></div>' +
    '<div class="toolbar rise"' + R(1) + '><label class="search"><span class="sr-only">Buscar produto</span>' + icon('search') + '<input id="prod-q" type="search" placeholder="Buscar por nome ou SKU" value="' + esc(ui.prodQ) + '"></label>' +
    '<select id="prod-cat" aria-label="Categoria" class="select-auto"><option value="">Todas as categorias</option>' + cats.map((c) => '<option' + (ui.prodCat === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
    '<div class="tabs">' + tabs.map((t) => '<button type="button" class="tab' + (ui.prodFilter === t[0] ? ' on' : '') + '" data-action="prod-filter" data-v="' + t[0] + '" aria-pressed="' + (ui.prodFilter === t[0]) + '">' + t[1] + '</button>').join('') + '</div></div>' +
    (state.products.length ? '<div class="card table-card rise"' + R(2) + '><table class="tbl"><thead><tr><th>Produto</th><th>Categoria</th><th class="num">Preço</th><th class="num">Custo</th><th class="num">Margem</th><th class="num">Estoque</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody id="prod-rows">' + prodRows() + '</tbody></table></div>'
      : empty('Nenhum produto ainda', 'Cadastre o primeiro produto com preço, custo e estoque para a Ipê e o painel começarem a trabalhar.', '<button type="button" class="btn btn-primary" data-action="product-new">' + icon('plus') + 'Cadastrar produto</button>')) + '</div>';
}
export function prodRows() {
  const q = norm(ui.prodQ);
  const list = state.products.filter((p) => {
    if (q && norm(p.name + ' ' + (p.sku || '')).indexOf(q) < 0) return false;
    if (ui.prodCat && p.category !== ui.prodCat) return false;
    if (ui.prodFilter === 'baixo') return p.active && p.stock <= 5;
    if (ui.prodFilter === 'esgotado') return p.stock <= 0;
    return true;
  });
  if (!list.length) return '<tr><td class="empty-row" colspan="7">Nenhum produto encontrado com esses filtros.</td></tr>';
  const admin = isAdmin();
  return list.map((p) => {
    const mg = p.price > 0 && p.cost != null ? (p.price - p.cost) / p.price * 100 : null;
    const mc = mg === null ? '' : mg >= 40 ? 'pos' : mg >= 20 ? '' : 'neg';
    const stock = !p.active ? '<span class="chip">Inativo</span>' : p.stock <= 0 ? '<span class="chip neg">Esgotado</span>' : p.stock <= 5 ? '<span class="chip warn">Baixo · ' + p.stock + ' un</span>' : '<span class="chip">' + p.stock + ' un</span>';
    return '<tr><td class="cell-main"><div class="ent"><span class="ent-text"><span class="ent-name">' + esc(p.name) + '</span><span class="ent-sub mono">' + esc(p.sku || 'sem SKU') + '</span></span></div></td>' +
      '<td data-label="Categoria">' + esc(p.category || '—') + '</td>' +
      '<td class="num" data-label="Preço">' + brl(p.price) + '</td>' +
      '<td class="num" data-label="Custo">' + (p.cost == null ? '—' : brl(p.cost)) + '</td>' +
      '<td class="num" data-label="Margem"><span class="chip ' + mc + '">' + (mg === null ? '—' : fmtPct(mg)) + '</span></td>' +
      '<td class="num" data-label="Estoque">' + stock + '</td>' +
      '<td class="act"><div class="row-actions"><button type="button" class="btn btn-subtle btn-sm" data-action="product-edit" data-id="' + p.id + '">Editar</button><button type="button" class="btn btn-subtle btn-sm" data-action="goto" data-v="precificacao" data-p="' + p.id + '">Precificar</button>' + (admin ? '<button type="button" class="btn btn-subtle btn-sm danger" data-action="product-del" data-id="' + p.id + '">Excluir</button>' : '') + '</div></td></tr>';
  }).join('');
}

/* ---------- clientes ---------- */
export function viewClientes() {
  const m = metrics();
  const counts = { todos: state.customers.length, leads: m.leads.length, ativos: m.active.length, inativos: m.inactive.length };
  const tabs = [['todos', 'Todos'], ['leads', 'Leads'], ['ativos', 'Ativos'], ['inativos', 'Inativos']];
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">CRM</p><h1>Clientes</h1><p class="lede">O status muda sozinho conforme as compras. Inativo é quem já comprou, mas não compra há mais de 90 dias.</p></div><div class="head-actions"><button type="button" class="btn btn-primary" data-action="cust-new">' + icon('plus') + 'Novo cliente</button></div></div>' +
    '<div class="toolbar rise"' + R(1) + '><label class="search"><span class="sr-only">Buscar cliente</span>' + icon('search') + '<input id="cust-q" type="search" placeholder="Buscar por nome, e-mail, telefone ou tag" value="' + esc(ui.custQ) + '"></label>' +
    '<div class="tabs">' + tabs.map((t) => '<button type="button" class="tab' + (ui.custTab === t[0] ? ' on' : '') + '" data-action="cust-tab" data-v="' + t[0] + '" aria-pressed="' + (ui.custTab === t[0]) + '">' + t[1] + ' <span class="count">' + counts[t[0]] + '</span></button>').join('') + '</div></div>' +
    (state.customers.length ? '<div class="card table-card rise"' + R(2) + '><table class="tbl"><thead><tr><th>Cliente</th><th>Origem</th><th>Status</th><th class="num">Total gasto</th><th>Última compra</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody id="cust-rows">' + custRows() + '</tbody></table></div>'
      : empty('Nenhum cliente ainda', 'Cadastre seus clientes e de onde eles vieram. O status de cada um é calculado pelas compras.', '<button type="button" class="btn btn-primary" data-action="cust-new">' + icon('plus') + 'Cadastrar cliente</button>')) + '</div>';
}
export function custRows() {
  const q = norm(ui.custQ), admin = isAdmin();
  const rows = state.customers.map((c) => ({ ...custStats(c), c })).filter((x) => {
    const c = x.c;
    if (q && norm([c.name, c.email, c.phone, (c.tags || []).join(' ')].join(' ')).indexOf(q) < 0) return false;
    if (ui.custTab === 'leads') return x.status === 'lead' || x.status === 'potencial';
    if (ui.custTab === 'ativos') return x.status === 'cliente' || x.status === 'recorrente';
    if (ui.custTab === 'inativos') return x.status === 'inativo';
    return true;
  }).sort((a, b) => { if (ui.custTab === 'inativos') return b.total - a.total; const la = a.last ? new Date(a.last).getTime() : 0, lb = b.last ? new Date(b.last).getTime() : 0; return lb - la || a.c.name.localeCompare(b.c.name, 'pt-BR'); });
  if (!rows.length) return '<tr><td class="empty-row" colspan="6">Nenhum cliente encontrado.</td></tr>';
  return rows.slice(0, 500).map((x) => { const c = x.c;
    return '<tr><td class="cell-main"><button type="button" class="ent ent-btn" data-action="cust-view" data-id="' + c.id + '"><span class="avatar">' + esc(initials(c.name)) + '</span><span class="ent-text"><span class="ent-name">' + esc(c.name) + '</span><span class="ent-sub">' + esc(c.email || c.phone || 'sem contato') + '</span></span></button></td>' +
      '<td data-label="Origem">' + esc(c.origin || '—') + '</td>' +
      '<td data-label="Status">' + statusChip(x.status) + '</td>' +
      '<td class="num" data-label="Total gasto">' + brl(x.total) + '</td>' +
      '<td data-label="Última compra">' + (x.last ? fmtDate(x.last) + '<span class="ent-sub">' + rel(x.last) + '</span>' : '—') + '</td>' +
      '<td class="act"><div class="row-actions"><button type="button" class="btn btn-subtle btn-sm" data-action="cust-view" data-id="' + c.id + '">Ver</button><button type="button" class="btn btn-subtle btn-sm" data-action="cust-edit" data-id="' + c.id + '">Editar</button>' + (admin ? '<button type="button" class="btn btn-subtle btn-sm danger" data-action="cust-del" data-id="' + c.id + '">Excluir</button>' : '') + '</div></td></tr>';
  }).join('') + (rows.length > 500 ? '<tr><td class="empty-row" colspan="6">Mostrando 500 de ' + rows.length + '. Use a busca para encontrar os demais.</td></tr>' : '');
}
export function custDetail(c) {
  const st = custStats(c);
  const ss = state.sales.filter((s) => s.customerId === c.id).sort(byDateDesc);
  return '<div class="detail-top"><span class="avatar lg">' + esc(initials(c.name)) + '</span><div>' + statusChip(st.status) + '<span class="muted small">Desde ' + fmtDate(c.createdAt) + ' · origem: ' + esc(c.origin || '—') + '</span></div></div>' +
    '<dl class="facts"><div><dt>Total gasto</dt><dd>' + brl(st.total) + '</dd></div><div><dt>Compras pagas</dt><dd>' + st.count + '</dd></div><div><dt>Última compra</dt><dd>' + (st.last ? rel(st.last) : '—') + '</dd></div></dl>' +
    '<dl class="contact"><div><dt>E-mail</dt><dd>' + esc(c.email || '—') + '</dd></div><div><dt>Telefone</dt><dd>' + esc(c.phone || '—') + '</dd></div></dl>' +
    (c.tags && c.tags.length ? '<div class="chips">' + c.tags.map((t) => '<span class="chip acc">' + esc(t) + '</span>').join('') + '</div>' : '') +
    (c.notes ? '<div class="note"><span class="label">Observações</span><p>' + esc(c.notes) + '</p></div>' : '') +
    '<h3 class="sub-h">Compras recentes</h3>' +
    (ss.length ? '<ul class="history">' + ss.slice(0, 30).map((s) => '<li><div><strong>' + brl(saleTotal(s)) + '</strong> <span class="muted small">' + fmtDate(s.date) + '</span></div>' + saleChip(s.status) + '<span class="muted small">' + itemsText(s) + '</span></li>').join('') + '</ul>' : '<p class="empty">Nenhuma compra registrada nos últimos 400 dias.</p>') +
    '<div class="row-actions start"><button type="button" class="btn btn-primary btn-sm" data-action="sale-new" data-c="' + c.id + '">' + icon('plus') + 'Registrar venda</button><button type="button" class="btn btn-ghost btn-sm" data-action="cust-edit" data-id="' + c.id + '">Editar dados</button></div>';
}

/* ---------- vendas ---------- */
export function viewVendas() {
  const P = paid(), cur = P.filter((s) => age(s.date) < 30);
  const pend = state.sales.filter((s) => s.status === 'pendente');
  const canc = state.sales.filter((s) => s.status === 'cancelado' && age(s.date) < 30);
  const tabs = [['todas', 'Todas'], ['pago', 'Pagas'], ['pendente', 'Pendentes'], ['cancelado', 'Canceladas']];
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Caixa</p><h1>Vendas</h1><p class="lede">Registre pedidos, confirme pagamentos e acompanhe o que entrou no caixa.</p></div><div class="head-actions"><button type="button" class="btn btn-primary" data-action="sale-new">' + icon('plus') + 'Nova venda</button></div></div>' +
    '<section class="kpis" aria-label="Resumo">' +
      kpi(1, 'Pago nos últimos 30 dias', brl(sum(cur.map(saleTotal))), '<span class="kpi-note">' + cur.length + ' ' + pl(cur.length, 'venda', 'vendas') + '</span>', null) +
      kpi(2, 'Aguardando pagamento', brl(sum(pend.map(saleTotal))), '<span class="kpi-note">' + pend.length + ' ' + pl(pend.length, 'venda', 'vendas') + '</span>', null) +
      kpi(3, 'Canceladas (30 dias)', String(canc.length), '<span class="kpi-note">' + brl(sum(canc.map(saleTotal))) + ' em vendas canceladas</span>', null) +
      kpi(4, 'Itens vendidos (30 dias)', String(sum(cur.map((s) => sum(s.items.map((i) => i.qty))))), '<span class="kpi-note">unidades pagas</span>', null) +
    '</section>' +
    '<div class="toolbar rise"' + R(5) + '><div class="tabs">' + tabs.map((t) => '<button type="button" class="tab' + (ui.saleTab === t[0] ? ' on' : '') + '" data-action="sale-tab" data-v="' + t[0] + '" aria-pressed="' + (ui.saleTab === t[0]) + '">' + t[1] + '</button>').join('') + '</div></div>' +
    '<div class="card table-card rise"' + R(6) + '><table class="tbl"><thead><tr><th>Cliente e data</th><th>Itens</th><th class="num">Total</th><th>Status</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>' + saleRows() + '</tbody></table></div>' +
    '<p class="muted small">Mostrando vendas dos últimos 400 dias.</p></div>';
}
function saleRows() {
  let list = state.sales.filter((s) => ui.saleTab === 'todas' || s.status === ui.saleTab).sort(byDateDesc);
  if (!list.length) return '<tr><td class="empty-row" colspan="5">Nenhuma venda neste filtro.</td></tr>';
  const more = list.length - ui.saleLimit; list = list.slice(0, ui.saleLimit);
  return list.map((s) => { const c = s.customerId ? cust(s.customerId) : null;
    const acts = (s.status === 'pendente' ? '<button type="button" class="btn btn-subtle btn-sm" data-action="sale-pay" data-id="' + s.id + '">' + icon('check') + 'Marcar como paga</button>' : '') + (s.status !== 'cancelado' ? '<button type="button" class="btn btn-subtle btn-sm danger" data-action="sale-cancel" data-id="' + s.id + '">Cancelar</button>' : '');
    return '<tr><td class="cell-main"><div class="ent"><span class="ent-text"><span class="ent-name">' + esc(c ? c.name : 'Venda avulsa') + '</span><span class="ent-sub">' + fmtDate(s.date) + ' · ' + rel(s.date) + '</span></span></div></td>' +
      '<td data-label="Itens">' + itemsText(s) + '</td>' +
      '<td class="num" data-label="Total"><strong>' + brl(saleTotal(s)) + '</strong></td>' +
      '<td data-label="Status">' + saleChip(s.status) + '</td>' +
      '<td class="act"><div class="row-actions">' + acts + '</div></td></tr>';
  }).join('') + (more > 0 ? '<tr><td class="empty-row" colspan="5"><button type="button" class="btn btn-ghost btn-sm" data-action="sale-more">Mostrar mais ' + Math.min(15, more) + ' (' + more + ' ' + pl(more, 'restante', 'restantes') + ')</button></td></tr>' : '');
}

/* ---------- marketing ---------- */
export function viewMarketing() {
  const list = state.campaigns;
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Crescimento</p><h1>Marketing</h1><p class="lede">Campanhas montadas a partir dos seus clientes. Nada é enviado sem a sua aprovação.</p></div><div class="head-actions"><button type="button" class="btn btn-ghost" data-action="campaign-leads">Converter leads</button><button type="button" class="btn btn-primary" data-action="campaign-reactivation">' + icon('plus') + 'Reativar inativos</button></div></div>' +
    '<div class="notice rise"' + R(1) + '>' + icon('info') + '<p><strong>O envio é feito por você.</strong> Depois de aprovar, copie cada mensagem e envie pelo seu WhatsApp, e-mail ou Instagram, só para quem autorizou contato (LGPD).</p></div>' +
    (list.length ? list.map((c, i) => campaignHTML(c, i + 2)).join('') : empty('Nenhuma campanha ainda', 'Crie uma campanha de reativação para os clientes parados ou uma de boas-vindas para os leads.', '')) + '</div>';
}
function campaignHTML(c, i) {
  const aud = c.audience.map(cust).filter(Boolean), draft = c.status === 'rascunho';
  return '<article class="card camp rise"' + R(Math.min(i, 8)) + ' id="camp-' + c.id + '">' +
    '<header class="camp-head"><div><h2>' + esc(c.name) + '</h2><p class="muted small">' + esc(c.objective) + '</p></div><div class="chips">' + (draft ? '<span class="chip warn">Rascunho · aguarda aprovação</span>' : '<span class="chip pos">' + icon('check') + 'Aprovada</span>') + '<span class="chip">' + icon('chat') + esc(c.channel) + '</span><span class="chip">' + aud.length + ' ' + pl(aud.length, 'contato', 'contatos') + '</span>' + (c.origin === 'automação' ? '<span class="chip info">Automação</span>' : c.origin === 'IA' ? '<span class="chip ipe">' + icon('sparkles') + 'Sugerida pela Ipê</span>' : '') + '</div></header>' +
    '<div class="field"><label for="msg-' + c.id + '">Mensagem base</label><textarea id="msg-' + c.id + '" rows="4" maxlength="1200" data-camp="' + c.id + '"' + (draft ? '' : ' readonly') + '>' + esc(c.message) + '</textarea><span class="hint">Use {nome}, {empresa} e {ultimo_produto}. Cada contato recebe a versão personalizada abaixo.' + (draft ? ' Alterações são salvas automaticamente.' : '') + '</span></div>' +
    '<details class="previews"' + (ui.openCampaign === c.id ? ' open' : '') + '><summary>Ver as ' + aud.length + ' mensagens personalizadas</summary><ul>' + aud.slice(0, 300).map((a) => { const pid = 'pv-' + c.id + '-' + a.id; return '<li><div class="pv-head"><div class="pv-who"><strong>' + esc(a.name) + '</strong><span class="muted small">' + esc(c.channel === 'E-mail' ? (a.email || 'sem e-mail cadastrado') : (a.phone || 'sem telefone cadastrado')) + '</span></div><button type="button" class="btn btn-subtle btn-sm" data-action="copy" data-target="' + pid + '">' + icon('copy') + 'Copiar</button></div><p class="pv-text" id="' + pid + '" data-cust="' + a.id + '">' + esc(personalize(c.message, a)) + '</p></li>'; }).join('') + '</ul></details>' +
    '<footer class="camp-foot"><span class="muted small">Criada ' + rel(c.createdAt) + (c.approvedAt ? ' · aprovada em ' + fmtDate(c.approvedAt) : '') + '</span><div class="row-actions">' + (draft ? '<button type="button" class="btn btn-primary btn-sm" data-action="campaign-approve" data-id="' + c.id + '">' + icon('check') + 'Aprovar campanha</button>' : '') + (isAdmin() ? '<button type="button" class="btn btn-subtle btn-sm danger" data-action="campaign-del" data-id="' + c.id + '">Excluir</button>' : '') + '</div></footer>' +
  '</article>';
}

/* ---------- precificação ---------- */
export function pricingOut() {
  const r = calcPricing(ui.pricing);
  if (r.error) return '<h2 class="card-title">Resultado</h2><p class="form-error" style="margin-top:12px">' + esc(r.error) + '</p>';
  const p = ui.pricing.productId ? prod(ui.pricing.productId) : null;
  let html = '';
  if (p) { const curM = (p.price * (1 - r.rate) - r.ct) / p.price * 100;
    html = '<div class="compare"><p>Hoje <strong>' + esc(p.name) + '</strong> sai por ' + brl(p.price) + '. Descontando custo, frete, taxa e imposto, sobra <strong class="' + (curM >= r.margin ? 'txt-pos' : 'txt-neg') + '">' + fmtPct(curM) + '</strong> do preço' + (curM < r.margin ? ', abaixo da margem que você quer.' : '.') + '</p>' +
      '<div class="row-actions start"><button type="button" class="btn btn-primary btn-sm" data-action="pricing-apply" data-price="' + r.charm.toFixed(2) + '">Aplicar ' + brl(r.charm) + '</button><button type="button" class="btn btn-ghost btn-sm" data-action="pricing-apply" data-price="' + r.rec.toFixed(2) + '">Aplicar ' + brl(r.rec) + '</button></div></div>'; }
  return '<h2 class="card-title" style="margin-bottom:10px">Resultado</h2><dl class="price-list">' +
    '<div><dt>Custo total por unidade</dt><dd>' + brl(r.ct) + '</dd></div>' +
    '<div><dt>Preço mínimo (lucro zero)</dt><dd>' + brl(r.min) + '</dd></div>' +
    '<div class="hl"><dt>Preço recomendado</dt><dd>' + brl(r.rec) + '</dd></div>' +
    '<div><dt>Preço comercial sugerido</dt><dd>' + brl(r.charm) + '</dd></div>' +
    '<div><dt>Lucro por unidade no recomendado</dt><dd>' + brl(r.profit) + '</dd></div>' +
    '<div><dt>Markup sobre o custo</dt><dd>' + (r.markup === null ? '—' : r.markup.toFixed(2).replace('.', ',') + '×') + '</dd></div>' +
  '</dl>' + html;
}
export function setPricingProduct(id) {
  const p = prod(id); ui.pricing.productId = p ? id : '';
  if (p && p.cost != null) ui.pricing.cost = dec(p.cost);
}
export function viewPrecificacao() {
  const v = ui.pricing;
  const fld = (id, label, val, hint) => '<div class="field"><label for="pr-' + id + '">' + label + '</label><input id="pr-' + id + '" data-k="' + id + '" type="text" inputmode="decimal" value="' + esc(val) + '">' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Margem</p><h1>Precificação</h1><p class="lede">Descubra o preço mínimo, o preço recomendado e quanto sobra por unidade depois da taxa da maquininha e do frete.</p></div></div>' +
    '<div class="split">' +
      '<form class="card form-stack rise"' + R(1) + ' id="pricing-form" novalidate>' +
        '<div class="field"><label for="pr-prod">Produto (opcional)</label><select id="pr-prod"><option value="">Preencher manualmente</option>' + state.products.map((p) => '<option value="' + p.id + '"' + (v.productId === p.id ? ' selected' : '') + '>' + esc(p.name) + ' · ' + brl(p.price) + '</option>').join('') + '</select></div>' +
        '<div class="grid2 wide">' + fld('cost', 'Custo do produto (R$)', v.cost, 'Quanto você paga por unidade.') + fld('freight', 'Frete e embalagem (R$)', v.freight, 'Por unidade vendida.') + '</div>' +
        '<div class="grid2 wide">' + fld('fee', 'Taxa de venda (%)', v.fee, 'Maquininha, marketplace ou link de pagamento.') + fld('tax', 'Imposto (%)', v.tax, 'MEI paga DAS fixo por mês: use 0.') + '</div>' +
        fld('margin', 'Margem desejada (%)', v.margin, 'Quanto do preço final deve sobrar como lucro.') +
      '</form>' +
      '<section class="card rise"' + R(2) + ' id="pricing-out" aria-live="polite">' + pricingOut() + '</section>' +
    '</div>' +
    '<section class="card form-stack rise"' + R(3) + '><h2 class="card-title">Como o cálculo é feito</h2><dl class="formula-list"><div><dt>custo_total</dt><dd>= custo + frete</dd></div><div><dt>preço_mínimo</dt><dd>= custo_total ÷ (1 − taxa − imposto)</dd></div><div><dt>preço_recomendado</dt><dd>= custo_total ÷ (1 − taxa − imposto − margem)</dd></div><div><dt>lucro_unitário</dt><dd>= preço × (1 − taxa − imposto) − custo_total</dd></div><div><dt>preço_comercial</dt><dd>= próximo valor terminado em ,90 acima do recomendado</dd></div></dl><p class="muted small">Estimativa para apoiar a sua decisão. Não é garantia de venda nem de lucro.</p></section>' +
  '</div>';
}

/* ---------- automações ---------- */
export function viewAutomacoes() {
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Rotinas</p><h1>Automações</h1><p class="lede">Regras de gatilho, condição e ação. Rodam quando você toca em "Executar agora". Toda ação que fala com cliente cria um rascunho e espera a sua aprovação.</p></div></div>' +
    '<div class="auto-list">' + state.automations.map((a, i) => '<article class="card auto lift rise"' + R(i + 1) + '><div class="auto-head"><h2>' + esc(a.name) + '</h2><button type="button" class="switch" role="switch" aria-checked="' + a.enabled + '" data-action="auto-toggle" data-id="' + a.key + '"' + (a.missing ? ' disabled' : '') + '><span class="sr-only">' + (a.enabled ? 'Desativar ' : 'Ativar ') + esc(a.name) + '</span></button></div>' +
      '<ol class="flow"><li class="t-mint"><span class="flow-k">Gatilho</span>' + esc(a.trigger) + '</li><li class="t-sand"><span class="flow-k">Condição</span>' + esc(a.condition) + '</li><li class="t-peach"><span class="flow-k">Ação</span>' + esc(a.action) + '</li></ol>' +
      '<footer class="auto-foot"><span class="muted small">' + (a.lastRun ? 'Última execução ' + rel(a.lastRun) + ': ' + esc(a.lastResult) : a.enabled ? 'Ativa · ainda não executada' : 'Desativada') + '</span><button type="button" class="btn btn-ghost btn-sm" data-action="auto-run" data-id="' + a.key + '"' + (a.enabled ? '' : ' disabled') + '>Executar agora</button></footer></article>').join('') + '</div></div>';
}

/* ---------- configurações ---------- */
export function viewConfig() {
  const th = state.theme, admin = isAdmin(), roles = { owner: 'Dono', admin: 'Administrador', employee: 'Funcionário' };
  return '<div class="stack"><div class="page-head rise"><div><p class="eyebrow">Conta</p><h1>Configurações</h1><p class="lede">Dados da empresa, aparência, acesso e seus dados.</p></div></div>' +
    '<div class="split">' +
      '<form class="card form-stack rise"' + R(1) + ' id="org-form" novalidate><h2 class="card-title">Empresa</h2>' +
        '<div class="field"><label for="org-name">Nome da empresa</label><input id="org-name" type="text" maxlength="80" value="' + esc(state.org.name) + '"' + (admin ? '' : ' readonly') + '></div>' +
        '<div class="field"><label for="org-doc">CNPJ ou CPF</label><input id="org-doc" type="text" maxlength="20" value="' + esc(state.org.document) + '"' + (admin ? '' : ' readonly') + '></div>' +
        '<p class="muted small">Seu papel nesta empresa: <strong>' + (roles[state.org.role] || state.org.role) + '</strong> · Plano ' + esc(state.org.plan === 'free' ? 'Free' : state.org.plan) + '</p>' +
        '<p class="form-error" id="org-err" hidden></p>' + (admin ? '<div><button type="submit" class="btn btn-primary">Salvar dados da empresa</button></div>' : '') + '</form>' +
      '<section class="card form-stack rise"' + R(2) + '><h2 class="card-title">Aparência</h2><div class="segmented" role="group" aria-label="Tema">' + [['system', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map((o) => '<button type="button" data-action="theme" data-v="' + o[0] + '" aria-pressed="' + (th === o[0]) + '">' + o[1] + '</button>').join('') + '</div><p class="muted small">Automático segue o tema do seu aparelho.</p>' +
        '<h2 class="card-title" style="margin-top:8px">Empresas</h2>' +
        (state.orgs.length > 1 ? '<div class="field"><label for="org-switch">Empresa aberta</label><select id="org-switch">' + state.orgs.map((o) => '<option value="' + o.id + '"' + (o.id === state.org.id ? ' selected' : '') + '>' + esc(o.name) + '</option>').join('') + '</select></div>' : '<p class="muted small">Você pode ter até 3 empresas na mesma conta, cada uma com dados separados.</p>') +
        '<div><button type="button" class="btn btn-ghost" data-action="org-new">' + icon('plus') + 'Criar outra empresa</button></div></section>' +
    '</div>' +
    '<div class="split">' +
      '<form class="card form-stack rise"' + R(3) + ' id="pass-form" novalidate><h2 class="card-title">Acesso</h2><p class="muted small">Conectado como <strong>' + esc(state.user.email) + '</strong></p>' +
        '<div class="field"><label for="new-pass">Nova senha</label><input id="new-pass" type="password" autocomplete="new-password" minlength="8" maxlength="72"><span class="hint">Mínimo de 8 caracteres, com letras e números.</span></div>' +
        '<p class="form-error" id="pass-err" hidden></p><div class="row-actions start"><button type="submit" class="btn btn-ghost">Trocar senha</button><button type="button" class="btn btn-subtle danger" data-action="logout-all">Sair de todos os aparelhos</button></div></form>' +
      '<section class="card form-stack rise"' + R(4) + '><h2 class="card-title">Seus dados (LGPD)</h2><p class="muted small">Baixe uma cópia dos dados desta empresa em planilha (CSV). Para corrigir dados pessoais ou pedir a exclusão da conta, veja a <a href="#privacidade">Política de Privacidade</a>.</p>' +
        '<div class="row-actions start"><button type="button" class="btn btn-ghost btn-sm" data-action="export" data-v="clientes">' + icon('download') + 'Clientes</button><button type="button" class="btn btn-ghost btn-sm" data-action="export" data-v="produtos">' + icon('download') + 'Produtos</button><button type="button" class="btn btn-ghost btn-sm" data-action="export" data-v="vendas">' + icon('download') + 'Vendas</button></div></section>' +
    '</div></div>';
}

export const VIEWS = {
  dashboard: { title: 'Painel', icon: 'grid', render: viewDashboard },
  ia: { title: 'Ipê', icon: 'sparkles', render: viewIA },
  clientes: { title: 'Clientes', icon: 'users', render: viewClientes },
  produtos: { title: 'Produtos', icon: 'box', render: viewProdutos },
  vendas: { title: 'Vendas', icon: 'cart', render: viewVendas },
  marketing: { title: 'Marketing', icon: 'megaphone', render: viewMarketing },
  precificacao: { title: 'Precificação', icon: 'calc', render: viewPrecificacao },
  automacoes: { title: 'Automações', icon: 'flow', render: viewAutomacoes },
  configuracoes: { title: 'Configurações', icon: 'gear', render: viewConfig },
};
export const NAV = ['dashboard', 'ia', 'clientes', 'produtos', 'vendas', 'marketing', 'precificacao', 'automacoes'];
