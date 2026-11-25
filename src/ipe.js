// Cliente da Ipê: histórico da conversa, leitura das ações propostas e execução só após aprovação.
import { state, prod, cust, audienceFor, ORIGINS } from './store.js';
import { brl, fmtPct, pl, EMAIL_RX } from './lib.js';
import * as db from './data.js';

export const PUB_LABEL = { inativos: 'clientes inativos', leads: 'leads', clientes_ativos: 'clientes ativos', selecionados: 'contatos escolhidos' };
export const PROP_ICON = { criar_campanha: 'megaphone', alterar_preco: 'calc', cadastrar_produto: 'box', cadastrar_cliente: 'user', anotar_cliente: 'users' };
export const MODES = [['rapida', 'Rápida'], ['equilibrada', 'Equilibrada'], ['profunda', 'Profunda']];

let seq = 0;
const nid = (p) => p + (++seq) + Math.random().toString(36).slice(2, 6);
export const INTRO = 'Oi! Eu sou a **Ipê**, a IA de vendas da sua empresa. Leio os números do sistema antes de responder e ajudo com estratégia de vendas, promoções, preços, estoque, atendimento, textos para Instagram e WhatsApp e planejamento. Quando uma ação no sistema ajudar, eu proponho e você aprova.\n\nSó trato de vendas, marketing e gestão comercial. Para outros assuntos, use um assistente geral.';
export const chat = { list: [], busy: false, mode: 'equilibrada', remaining: null };
export function resetChat() { chat.list = [{ role: 'ai', id: 'intro', text: INTRO }]; }
resetChat();
export const findMsg = (id) => chat.list.find((m) => m.id === id) || null;

export function suggestions() {
  const season = { 10: 'Monte um plano de vendas para a Black Friday', 11: 'Monte um plano de vendas para o Natal', 0: 'Como vender mais em janeiro, que costuma ser fraco?', 2: 'Monte uma ação para o Dia do Consumidor', 4: 'Monte uma ação para o Dia das Mães', 5: 'Monte uma ação para o Dia dos Namorados', 7: 'Monte uma ação para o Dia dos Pais', 9: 'Monte uma ação para o Dia das Crianças' }[new Date().getMonth()];
  const base = ['Monte um plano para vender mais nos próximos 7 dias', 'Crie 3 posts para o Instagram desta semana', 'Que kits ou combos posso montar com meus produtos?', 'Revise meus preços e margens', 'Recupere meus clientes inativos', 'Responda um cliente que reclamou do atraso na entrega', 'Quais produtos devo repor primeiro?'];
  return season ? [season, ...base] : base;
}

export function validateAction(d) {
  if (!d || typeof d !== 'object') return null;
  const t = String(d.tipo || ''), x = { id: nid('x'), status: 'pendente', data: null, title: '', lines: [] };
  if (t === 'criar_campanha') {
    const msg = String(d.mensagem || '').trim().slice(0, 1200); if (!msg) return null;
    const pub = PUB_LABEL[d.publico] ? String(d.publico) : 'selecionados', ids = audienceFor(pub, d.cliente_ids);
    const canal = ['WhatsApp', 'E-mail', 'Instagram'].includes(d.canal) ? d.canal : 'WhatsApp';
    x.data = { tipo: t, nome: String(d.nome || 'Campanha sugerida pela Ipê').slice(0, 80), objetivo: String(d.objetivo || '').slice(0, 200), publico: pub, cliente_ids: ids, canal, mensagem: msg };
    x.title = 'Criar campanha: ' + x.data.nome;
    x.lines = [canal + ' · ' + ids.length + ' ' + pl(ids.length, 'contato', 'contatos') + ' (' + PUB_LABEL[pub] + ')', 'Mensagem: ' + msg.slice(0, 240) + (msg.length > 240 ? '…' : '')];
    if (!ids.length) x.lines.push('Nenhum contato nesse público agora.');
    return x;
  }
  if (t === 'alterar_preco') {
    const p = prod(String(d.produto_id || '')); let np = Number(d.novo_preco);
    if (!p || !(np > 0) || np >= 1e6) return null;
    np = Math.round(np * 100) / 100;
    x.data = { tipo: t, produto_id: p.id, novo_preco: np };
    x.title = 'Alterar preço: ' + p.name;
    x.lines = [brl(p.price) + ' → ' + brl(np) + (p.cost != null ? ' (margem bruta ' + fmtPct((np - p.cost) / np * 100) + ')' : '')];
    if (d.motivo) x.lines.push('Motivo: ' + String(d.motivo).slice(0, 200));
    return x;
  }
  if (t === 'cadastrar_produto') {
    const nome = String(d.nome || '').trim().slice(0, 80), pr = Number(d.preco), cu = d.custo == null || d.custo === '' ? null : Number(d.custo), st = d.estoque == null || d.estoque === '' ? 0 : Number(d.estoque);
    if (nome.length < 2 || !(pr > 0) || pr >= 1e6 || (cu !== null && !(cu >= 0)) || !Number.isInteger(st) || st < 0) return null;
    x.data = { tipo: t, nome, categoria: String(d.categoria || '').slice(0, 40), preco: Math.round(pr * 100) / 100, custo: cu === null ? null : Math.round(cu * 100) / 100, estoque: st };
    x.title = 'Cadastrar produto: ' + nome;
    x.lines = [(x.data.categoria || 'Sem categoria') + ' · ' + brl(x.data.preco) + (cu !== null ? ' · custo ' + brl(x.data.custo) : '') + ' · ' + st + ' em estoque'];
    return x;
  }
  if (t === 'cadastrar_cliente') {
    const cn = String(d.nome || '').trim().slice(0, 80); if (cn.length < 2) return null;
    let em = String(d.email || '').trim(); if (em && !EMAIL_RX.test(em)) em = '';
    let tel = String(d.telefone || '').trim().slice(0, 20); if (!/^[0-9 ()+-]*$/.test(tel)) tel = '';
    x.data = { tipo: t, nome: cn, telefone: tel, email: em, origem: ORIGINS.includes(d.origem) ? d.origem : 'Outro', observacoes: String(d.observacoes || '').trim().slice(0, 400) };
    x.title = 'Cadastrar cliente: ' + cn;
    x.lines = [[x.data.origem, x.data.telefone, x.data.email].filter(Boolean).join(' · ')];
    if (x.data.observacoes) x.lines.push('Observação: ' + x.data.observacoes);
    return x;
  }
  if (t === 'anotar_cliente') {
    const c = cust(String(d.cliente_id || '')); if (!c) return null;
    const tag = String(d.tag || '').trim().toLowerCase().slice(0, 30), nota = String(d.nota || '').trim().slice(0, 300);
    if (!tag && !nota) return null;
    x.data = { tipo: t, cliente_id: c.id, tag, nota };
    x.title = 'Anotar no cliente: ' + c.name;
    if (tag) x.lines.push('Tag: ' + tag);
    if (nota) x.lines.push('Nota: ' + nota);
    return x;
  }
  return null;
}

export function splitActions(raw) {
  raw = String(raw || '');
  const i = raw.indexOf('<acoes>');
  if (i < 0) return { text: raw.trim(), actions: [] };
  const j = raw.indexOf('</acoes>', i);
  const inner = raw.slice(i + 7, j < 0 ? raw.length : j).replace(/```(?:json)?/g, '').trim();
  const text = (raw.slice(0, i) + (j < 0 ? '' : raw.slice(j + 8))).trim();
  let list = [];
  try { const v = JSON.parse(inner); list = Array.isArray(v) ? v : [v]; } catch { list = []; }
  return { text, actions: list.slice(0, 3).map(validateAction).filter(Boolean) };
}

// Executa uma ação aprovada pelo dono, pelos mesmos caminhos (e permissões) da interface.
export async function execAction(x) {
  const d = x.data; let msg, go = null;
  if (d.tipo === 'criar_campanha') {
    const ids = audienceFor(d.publico, d.cliente_ids);
    if (!ids.length) throw new Error('Nenhum contato nesse público agora. Nada foi criado.');
    const c = await db.insertCampaign({ kind: 'ia', origin: 'IA', name: d.nome, objective: d.objetivo || 'Sugerida pela Ipê', channel: d.canal, message: d.mensagem, audience: ids });
    msg = 'Campanha "' + d.nome + '" criada como rascunho para ' + ids.length + ' ' + pl(ids.length, 'contato', 'contatos') + '.';
    go = { v: 'marketing', c: c.id, label: 'Abrir campanha' };
  } else if (d.tipo === 'alterar_preco') {
    const p = prod(d.produto_id); if (!p) throw new Error('O produto não existe mais.');
    const old = p.price; await db.setProductPrice(p.id, d.novo_preco);
    msg = 'Preço de ' + p.name + ' alterado de ' + brl(old) + ' para ' + brl(d.novo_preco) + '.';
    go = { v: 'produtos', label: 'Ver produtos' };
  } else if (d.tipo === 'cadastrar_produto') {
    await db.saveProduct(null, { name: d.nome, sku: '', category: d.categoria, price: d.preco, cost: d.custo, stock: d.estoque, active: true });
    msg = 'Produto ' + d.nome + ' cadastrado por ' + brl(d.preco) + '.';
    go = { v: 'produtos', label: 'Ver produtos' };
  } else if (d.tipo === 'cadastrar_cliente') {
    await db.saveCustomer(null, { name: d.nome, email: d.email, phone: d.telefone, origin: d.origem, stage: 'lead', tags: [], notes: d.observacoes });
    msg = 'Cliente ' + d.nome + ' cadastrado como lead.';
    go = { v: 'clientes', label: 'Ver clientes' };
  } else if (d.tipo === 'anotar_cliente') {
    const c = cust(d.cliente_id); if (!c) throw new Error('O cliente não existe mais.');
    const tags = (c.tags || []).slice(); if (d.tag && !tags.includes(d.tag)) tags.push(d.tag);
    if (tags.length > 20) throw new Error('Este cliente já tem o máximo de 20 tags.');
    let notes = c.notes || '';
    if (d.nota) { const n = new Date(); notes = (notes ? notes + '\n' : '') + '[' + String(n.getDate()).padStart(2, '0') + '/' + String(n.getMonth() + 1).padStart(2, '0') + '] ' + d.nota; }
    await db.saveCustomer(c.id, { ...c, tags, notes: notes.slice(-2000) });
    msg = 'Anotação salva em ' + c.name + '.';
    go = { v: 'clientes', label: 'Ver clientes' };
  } else throw new Error('Ação não reconhecida.');
  await db.logAiAction(msg);
  return { msg, go };
}

// Histórico enviado ao servidor: só texto (o servidor monta os dados da empresa e aplica as barreiras).
export function history() {
  return chat.list.filter((m) => m.id !== 'intro' && !m.pending && m.text && !m.error).slice(-12).map((m) => {
    if (m.role === 'user') return { role: 'user', content: m.text };
    let s = m.text;
    if (m.actions && m.actions.length) s += '\n\n[Ações propostas nesta resposta: ' + m.actions.map((x) => x.title + ' → ' + (x.status === 'aprovada' ? 'aprovada e executada' : x.status === 'descartada' ? 'descartada pelo dono' : x.status === 'erro' ? 'falhou' : 'aguardando aprovação')).join('; ') + ']';
    return { role: 'assistant', content: s };
  });
}

export async function ask(text, onChange) {
  const um = { role: 'user', id: nid('u'), text: String(text).trim().slice(0, 4000) };
  const am = { role: 'ai', id: nid('a'), pending: true, text: '', userId: um.id };
  chat.list.push(um, am); chat.busy = true; onChange();
  try {
    const r = await db.askIpe(history().concat([]), chat.mode);
    const parts = splitActions(r.text || '');
    am.text = parts.text; am.actions = parts.actions; am.guard = r.guard || null;
    if (typeof r.remaining === 'number') chat.remaining = r.remaining;
  } catch (e) {
    am.error = e.message || 'A Ipê não respondeu agora.'; am.retryable = !e.limit && e.status !== 401 && e.status !== 403;
  } finally {
    am.pending = false; chat.busy = false; onChange();
  }
}
export function retry(id, onChange) {
  const am = findMsg(id); if (!am || chat.busy) return;
  const um = findMsg(am.userId);
  chat.list = chat.list.filter((m) => m !== am && m !== um);
  if (um) ask(um.text, onChange); else onChange();
}
