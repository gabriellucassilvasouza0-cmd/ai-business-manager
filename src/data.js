// Camada de dados: Supabase Auth + Postgres (RLS isola cada empresa) + RPCs transacionais.
import { createClient } from '@supabase/supabase-js';
import { state, AUTOS, metrics, TPL } from './store.js';
import { DAY, monthLabel } from './lib.js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ekpwpignywulmtaglgsb.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_eU1KQyVSwpCIvHgcTHCXNg_TsvSQzhZ';

export const sb = createClient(SB_URL, KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const PAGE = 1000;
const ORG_KEY = 'abm-org';

// Mensagens de erro em português, sem vazar detalhes internos.
export function errMsg(e) {
  const code = e && e.code, msg = (e && e.message) || '';
  if (code === 'P0001' || code === '22023') return msg;
  if (code === '42501' || /row-level security/i.test(msg)) return 'Você não tem permissão para fazer isso nesta empresa.';
  if (code === '23503') return 'Este registro está ligado a outros (por exemplo, a vendas) e não pode ser excluído.';
  if (code === '23505') return 'Já existe um registro com esse valor (por exemplo, o mesmo SKU).';
  if (code === '23514' || code === '22P02' || code === '22001') return 'Algum campo está fora do formato permitido. Confira os valores.';
  if (/fetch|network|Failed to|Load failed/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}
const must = ({ data, error }) => { if (error) throw error; return data; };
const denied = () => Object.assign(new Error('Você não tem permissão para fazer isso nesta empresa.'), { code: '42501' });

async function all(build) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = must(await build().range(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/* ---------- mapeamento banco → estado ---------- */
const mapProduct = (r) => ({ id: r.id, name: r.name, sku: r.sku || '', category: r.category || '', price: Number(r.price), cost: r.cost == null ? null : Number(r.cost), stock: r.stock, active: r.active, createdAt: r.created_at });
const mapCustomer = (r) => ({ id: r.id, name: r.name, email: r.email || '', phone: r.phone || '', origin: r.origin, stage: r.stage, tags: r.tags || [], notes: r.notes || '', createdAt: r.created_at });
const mapSale = (r) => ({ id: r.id, customerId: r.customer_id, status: r.status, date: r.sold_at, items: (r.sale_items || []).map((i) => ({ productId: i.product_id, qty: i.qty, price: Number(i.price) })) });
const mapCampaign = (r) => ({ id: r.id, kind: r.kind, name: r.name, objective: r.objective || '', channel: r.channel, status: r.status, message: r.message, audience: r.audience || [], origin: r.origin, approvedAt: r.approved_at, createdAt: r.created_at });

/* ---------- empresas ---------- */
export async function loadOrgs() {
  const rows = must(await sb.from('organization_members').select('role, organizations(id,name,document,plan)').eq('user_id', state.user.id));
  state.orgs = rows.filter((r) => r.organizations).map((r) => ({ ...r.organizations, role: r.role })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  let saved = null; try { saved = localStorage.getItem(ORG_KEY); } catch { /* sem storage */ }
  state.org = state.orgs.find((o) => o.id === saved) || state.orgs[0] || null;
  return state.org;
}
export function selectOrg(id) {
  state.org = state.orgs.find((o) => o.id === id) || state.org;
  try { localStorage.setItem(ORG_KEY, state.org.id); } catch { /* sem storage */ }
}
export async function createOrg(name, document) {
  const id = must(await sb.rpc('create_organization', { p_name: name, p_document: document }));
  await loadOrgs(); selectOrg(id); return id;
}
export async function updateOrg(name, document) {
  const rows = must(await sb.from('organizations').update({ name, document }).eq('id', state.org.id).select('id'));
  if (!rows.length) throw denied();
  state.org.name = name; state.org.document = document;
}

/* ---------- carga dos dados da empresa ---------- */
const org = () => state.org.id;
export async function loadProducts() { state.products = (await all(() => sb.from('products').select('*').eq('organization_id', org()).order('created_at', { ascending: false }).order('id'))).map(mapProduct); }
export async function loadCustomers() { state.customers = (await all(() => sb.from('customers').select('*').eq('organization_id', org()).order('created_at', { ascending: false }).order('id'))).map(mapCustomer); }
export async function loadSales() {
  const since = new Date(Date.now() - 400 * DAY).toISOString();
  state.sales = (await all(() => sb.from('sales').select('id,customer_id,status,sold_at,sale_items(product_id,qty,price)').eq('organization_id', org()).gte('sold_at', since).order('sold_at', { ascending: false }).order('id'))).map(mapSale);
}
export async function loadStats() {
  const rows = must(await sb.rpc('customer_stats', { p_org: org() }));
  state.stats = new Map(rows.map((r) => [r.customer_id, { total: Number(r.total), count: r.purchases, last: r.last_sale_at, lastProduct: r.last_product }]));
}
export async function loadCampaigns() { state.campaigns = must(await sb.from('campaigns').select('*').eq('organization_id', org()).order('created_at', { ascending: false }).limit(300)).map(mapCampaign); }
export async function loadAutomations() {
  const rows = must(await sb.from('automations').select('*').eq('organization_id', org()));
  state.automations = Object.keys(AUTOS).map((k) => { const r = rows.find((x) => x.key === k); return { key: k, ...AUTOS[k], enabled: r ? r.enabled : false, lastRun: r ? r.last_run : null, lastResult: r ? r.last_result : '', missing: !r }; });
}
export async function loadAiLog() {
  if (!(state.org.role === 'owner' || state.org.role === 'admin')) { state.aiLog = []; return; }
  const rows = must(await sb.from('audit_logs').select('detail,created_at').eq('organization_id', org()).eq('action', 'ia_acao').order('created_at', { ascending: false }).limit(20));
  state.aiLog = rows.map((r) => ({ at: r.created_at, text: r.detail }));
}
export async function loadAll() {
  await Promise.all([loadProducts(), loadCustomers(), loadSales(), loadStats(), loadCampaigns(), loadAutomations(), loadAiLog()]);
}

/* ---------- produtos ---------- */
const prodRow = (d) => ({ name: d.name, sku: d.sku, category: d.category, price: d.price, cost: d.cost, stock: d.stock, active: d.active });
export async function saveProduct(id, d) {
  if (id) { if (!must(await sb.from('products').update(prodRow(d)).eq('id', id).select('id')).length) throw denied(); }
  else must(await sb.from('products').insert({ ...prodRow(d), organization_id: org() }));
  await loadProducts();
}
export async function setProductPrice(id, price) {
  if (!must(await sb.from('products').update({ price }).eq('id', id).select('id')).length) throw denied();
  await loadProducts();
}
export async function deleteProduct(id) {
  if (!must(await sb.from('products').delete().eq('id', id).select('id')).length) throw denied();
  await loadProducts();
}

/* ---------- clientes ---------- */
const custRow = (d) => ({ name: d.name, email: d.email, phone: d.phone, origin: d.origin, stage: d.stage, tags: d.tags, notes: d.notes });
export async function saveCustomer(id, d) {
  if (id) { if (!must(await sb.from('customers').update(custRow(d)).eq('id', id).select('id')).length) throw denied(); }
  else must(await sb.from('customers').insert({ ...custRow(d), organization_id: org() }));
  await loadCustomers();
}
export async function deleteCustomer(id) {
  if (!must(await sb.from('customers').delete().eq('id', id).select('id')).length) throw denied();
  await Promise.all([loadCustomers(), loadCampaigns()]);
}

/* ---------- vendas (só por RPC: trava estoque e grava itens numa transação) ---------- */
export async function createSale(customerId, status, soldAt, items) {
  must(await sb.rpc('create_sale', { p_org: org(), p_customer: customerId || null, p_status: status, p_sold_at: soldAt, p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty })) }));
  await Promise.all([loadSales(), loadProducts(), loadStats()]);
}
export async function setSaleStatus(id, status) {
  must(await sb.rpc('set_sale_status', { p_sale: id, p_status: status }));
  await Promise.all([loadSales(), loadProducts(), loadStats()]);
}

/* ---------- campanhas ---------- */
export async function insertCampaign(c) {
  const row = must(await sb.from('campaigns').insert({ organization_id: org(), kind: c.kind, name: c.name.slice(0, 80), objective: (c.objective || '').slice(0, 200), channel: c.channel, message: c.message, audience: c.audience, origin: c.origin }).select('*').single());
  const mapped = mapCampaign(row); state.campaigns.unshift(mapped); return mapped;
}
export async function createCampaign(kind, opts = {}) {
  const m = metrics();
  let pool = kind === 'reactivation' ? m.inactive : m.leads;
  if (opts.filter) pool = pool.filter(opts.filter);
  const audience = pool.map((x) => x.c.id);
  if (!audience.length) return null;
  const key = audience.slice().sort().join(',');
  const dup = state.campaigns.find((c) => c.status === 'rascunho' && c.kind === kind && c.audience.slice().sort().join(',') === key);
  if (dup) return { c: dup, dup: true };
  const c = await insertCampaign({
    kind, origin: opts.origin || 'manual', channel: 'WhatsApp',
    name: opts.name || (kind === 'reactivation' ? 'Reativação de clientes · ' : 'Conversão de leads · ') + monthLabel(),
    objective: kind === 'reactivation' ? 'Trazer de volta clientes sem compra há mais de 90 dias' : 'Transformar contatos que ainda não compraram em clientes',
    message: kind === 'reactivation' ? TPL.reactivation : TPL.leads, audience,
  });
  return { c, dup: false };
}
export async function updateCampaignMessage(id, message) {
  if (!must(await sb.from('campaigns').update({ message }).eq('id', id).eq('status', 'rascunho').select('id')).length) throw denied();
}
export async function approveCampaign(id) {
  const row = must(await sb.from('campaigns').update({ status: 'aprovada', approved_at: new Date().toISOString() }).eq('id', id).select('*'));
  if (!row.length) throw denied();
  await loadCampaigns();
}
export async function deleteCampaign(id) {
  if (!must(await sb.from('campaigns').delete().eq('id', id).select('id')).length) throw denied();
  await loadCampaigns();
}

/* ---------- automações ---------- */
export async function updateAutomation(key, patch) {
  const row = {}; if ('enabled' in patch) row.enabled = patch.enabled; if ('lastRun' in patch) row.last_run = patch.lastRun; if ('lastResult' in patch) row.last_result = String(patch.lastResult).slice(0, 200);
  if (!must(await sb.from('automations').update(row).eq('organization_id', org()).eq('key', key).select('key')).length) throw denied();
  await loadAutomations();
}

/* ---------- registro das ações da Ipê aprovadas ---------- */
export async function logAiAction(text) {
  try { must(await sb.rpc('log_ai_action', { p_org: org(), p_text: text })); await loadAiLog(); } catch { /* o registro não pode impedir a ação já feita */ }
}

/* ---------- Ipê (Edge Function com barreiras no servidor) ---------- */
export async function askIpe(messages, mode) {
  const { data, error } = await sb.functions.invoke('ipe', { body: { org: org(), messages, mode } });
  if (error) {
    let body = null; try { body = await error.context.json(); } catch { /* corpo não-JSON */ }
    const status = error.context && error.context.status;
    throw Object.assign(new Error(body && body.error ? body.error : status ? 'A Ipê não respondeu agora. Tente de novo em instantes.' : 'Sem conexão com a Ipê. Verifique sua internet.'), { status, limit: body && body.limit });
  }
  return data;
}
