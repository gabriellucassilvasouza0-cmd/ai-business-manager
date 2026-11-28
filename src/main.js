// Inicialização, autenticação, rotas, ações e formulários.
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/bricolage-grotesque';
import './styles.css';
import { sb, errMsg, loadOrgs, loadAll, selectOrg, createOrg, updateOrg, saveProduct, deleteProduct, saveCustomer, deleteCustomer, createSale, setSaleStatus, createCampaign, updateCampaignMessage, approveCampaign, deleteCampaign, updateAutomation, setProductPrice } from './data.js';
import { state, metrics, prod, cust, custStats, isAdmin, ORIGINS, STATUS, saleTotal } from './store.js';
import { esc, icon, LOGO, initials, brl, pl, dec, parseDec, isoDate, sum, EMAIL_RX, fmtDate, toCSV, monthLabel, age } from './lib.js';
import { VIEWS, NAV, ui, prodRows, custRows, custDetail, msgHTML, pricingOut, setPricingProduct, ipeSub } from './views.js';
import { viewLanding, viewLogin, viewSignup, viewForgot, viewNewPassword, viewOnboarding, viewLoading, viewError, viewTerms, viewPrivacy } from './public.js';
import * as ipe from './ipe.js';
import { personalize } from './store.js';

const $ = (s, r) => (r || document).querySelector(s);
const root = $('#root');
let phase = 'boot'; // boot | public | recovery | onboarding | app | error
let bootError = '';
let lastView = null;
const PUBLIC = ['inicio', 'entrar', 'criar-conta', 'recuperar'];
const LEGAL = { termos: viewTerms, privacidade: viewPrivacy };

/* ---------- tema ---------- */
try { state.theme = localStorage.getItem('abm-theme') || 'system'; } catch { /* sem storage */ }
function applyTheme() {
  const r = document.documentElement;
  if (state.theme === 'light' || state.theme === 'dark') r.setAttribute('data-theme', state.theme); else r.removeAttribute('data-theme');
}

/* ---------- utilidades de interface ---------- */
function toast(msg, tone) {
  const t = document.createElement('div');
  t.className = 'toast' + (tone ? ' ' + tone : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3600);
}
const failText = (e) => (e && (e.code || e.status) ? errMsg(e) : (e && e.message) || errMsg(e));
async function run(el, fn) {
  if (el) el.disabled = true;
  try { await fn(); } catch (e) { toast(failText(e), 'warn'); } finally { if (el && el.isConnected) el.disabled = false; }
}
function armed(el) {
  if (el.dataset.armed === '1') return true;
  el.dataset.armed = '1'; const old = el.innerHTML; el.textContent = 'Confirmar?'; el.classList.add('armed');
  setTimeout(() => { if (el.isConnected && el.dataset.armed === '1') { el.dataset.armed = ''; el.innerHTML = old; el.classList.remove('armed'); } }, 3500);
  return false;
}
const showErr = (id, msg) => { const e = $('#' + id); if (e) { e.textContent = msg; e.hidden = false; } return false; };
const hideMsg = (...ids) => ids.forEach((id) => { const e = $('#' + id); if (e) e.hidden = true; });
const strongPass = (p) => p.length >= 8 && /[a-z]/i.test(p) && /\d/.test(p);
function copyText(text, sel) {
  const fallback = () => { if (sel) { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } toast('Texto selecionado. Use Copiar do seu aparelho.'); };
  try { navigator.clipboard.writeText(text).then(() => toast('Copiado.'), fallback); } catch { fallback(); }
}

/* ---------- modal ---------- */
let prevFocus = null;
function openModal(o) {
  $('#modal-root').innerHTML = '<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><form id="modal-form" novalidate><header class="modal-head"><h2 id="modal-title">' + esc(o.title) + '</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="Fechar">' + icon('x') + '</button></header><div class="modal-body">' + o.body + '<p class="form-error" id="modal-err" role="alert" hidden></p></div>' +
    (o.footer === false ? '' : '<footer class="modal-foot"><button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button><button type="submit" class="btn btn-primary" id="modal-ok">' + esc(o.submitLabel || 'Salvar') + '</button></footer>') + '</form></div></div>';
  const form = $('#modal-form');
  prevFocus = document.activeElement;
  $('#modal-back').addEventListener('mousedown', (e) => { if (e.target.id === 'modal-back') closeModal(); });
  if (o.onOpen) o.onOpen(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!o.onSubmit) return closeModal();
    const btn = $('#modal-ok'); if (btn && btn.disabled) return;
    hideMsg('modal-err'); if (btn) btn.disabled = true;
    try { const r = await o.onSubmit(form); if (r !== false) closeModal(); }
    catch (err) { showErr('modal-err', failText(err)); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  });
  const f = form.querySelector('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea, .modal-body button'); if (f) f.focus();
}
function closeModal() { $('#modal-root').innerHTML = ''; if (prevFocus && prevFocus.isConnected) prevFocus.focus(); }
const fail = (msg) => showErr('modal-err', msg);

/* ---------- rotas e render ---------- */
const route = () => decodeURIComponent(location.hash.slice(1)) || 'inicio';
function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }
function replaceRoute(h) { history.replaceState(null, '', '#' + h); }

function page(html, after) {
  root.innerHTML = html; lastView = null;
  if (after) after();
  window.scrollTo(0, 0);
}
function render() {
  applyTheme();
  let h = route();
  if (LEGAL[h]) return page(LEGAL[h]());
  if (phase === 'boot') return page(viewLoading());
  if (phase === 'error') return page(viewError(bootError));
  if (phase === 'recovery') return page(viewNewPassword(), bindNewPassword);
  if (phase === 'public') {
    if (!PUBLIC.includes(h)) { if (VIEWS[h]) replaceRoute('entrar'); else replaceRoute('inicio'); h = route(); }
    if (h === 'entrar') return page(viewLogin(), bindLogin);
    if (h === 'criar-conta') return page(viewSignup(), bindSignup);
    if (h === 'recuperar') return page(viewForgot(), bindForgot);
    return page(viewLanding());
  }
  if (phase === 'onboarding') return page(viewOnboarding(state.user && state.user.user_metadata && state.user.user_metadata.full_name), bindOnboarding);
  if (!VIEWS[h]) { replaceRoute('dashboard'); h = 'dashboard'; }
  renderApp(h);
}

function shell() {
  root.innerHTML = '<div class="app"><aside class="rail" id="rail" aria-label="Menu principal"></aside><div class="scrim" id="scrim" data-action="menu-close" hidden></div>' +
    '<div class="main"><header class="topbar"><button class="icon-btn menu-btn" type="button" data-action="menu-open" aria-label="Abrir menu">' + icon('menu') + '</button>' +
    '<div class="crumb"><span class="muted" id="crumb-org"></span><span class="sep">/</span><strong id="crumb-title"></strong></div>' +
    '<div class="top-right"><a class="btn btn-orange btn-sm top-ipe" href="#ia">' + icon('sparkles') + '<span>Ipê</span></a><span class="avatar" id="top-avatar" aria-hidden="true"></span></div></header>' +
    '<main class="content" id="view" tabindex="-1"></main></div></div>';
}
function renderRail(v) {
  const m = metrics();
  const badges = { clientes: m.inactive.length, vendas: m.pending.length, marketing: state.campaigns.filter((c) => c.status === 'rascunho').length };
  const link = (k) => { const b = badges[k]; const t = VIEWS[k].title; return '<a class="nav' + (v === k ? ' on' : '') + '" href="#' + k + '" aria-label="' + t + (b ? ' (' + b + ')' : '') + '"' + (v === k ? ' aria-current="page"' : '') + '>' + icon(VIEWS[k].icon) + '<span class="lbl">' + t + '</span>' + (b ? '<span class="badge">' + (b > 99 ? '99+' : b) + '</span>' : '') + '</a>'; };
  $('#rail').innerHTML = '<a class="rail-logo" href="#dashboard" aria-label="Painel">' + LOGO + '<span class="lbl rail-name">AI Business Manager</span></a>' +
    '<button type="button" class="icon-btn menu-close" data-action="menu-close" aria-label="Fechar menu">' + icon('x') + '</button>' +
    '<div class="rail-org"><span class="avatar">' + esc(initials(state.org.name)) + '</span><span class="lbl"><strong>' + esc(state.org.name) + '</strong><small>Plano Free</small></span></div>' +
    '<nav class="rail-nav">' + NAV.map(link).join('') + '</nav><div class="rail-foot">' + link('configuracoes') +
    '<button type="button" class="nav" data-action="logout" aria-label="Sair">' + icon('logout') + '<span class="lbl">Sair</span></button></div>';
}
function renderApp(v) {
  if (!$('#rail')) shell();
  renderRail(v);
  $('#crumb-org').textContent = state.org.name;
  $('#crumb-title').textContent = VIEWS[v].title;
  $('#top-avatar').textContent = initials((state.user.user_metadata && state.user.user_metadata.full_name) || state.user.email);
  const view = $('#view');
  const entering = lastView !== v;
  view.classList.toggle('enter', entering);
  view.innerHTML = VIEWS[v].render();
  if (AFTER[v]) AFTER[v]();
  if (entering) { window.scrollTo(0, 0); lastView = v; document.title = VIEWS[v].title + ' · AI Business Manager'; }
}
const refresh = () => { if (phase === 'app') render(); };

/* ---------- pós-render das telas ---------- */
const AFTER = {
  ia() {
    renderChat();
    const input = $('#chat-input');
    const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
    input.addEventListener('input', grow);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); } });
    $('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (ipe.chat.busy) { toast('Espere a resposta terminar.', 'warn'); return; }
      const v = input.value.trim(); if (!v) return;
      input.value = ''; grow(); sendToIpe(v);
    });
  },
  produtos() {
    const q = $('#prod-q'); if (!q) return;
    q.addEventListener('input', (e) => { ui.prodQ = e.target.value; $('#prod-rows').innerHTML = prodRows(); });
    $('#prod-cat').addEventListener('change', (e) => { ui.prodCat = e.target.value; $('#prod-rows').innerHTML = prodRows(); });
  },
  clientes() { const q = $('#cust-q'); if (q) q.addEventListener('input', (e) => { ui.custQ = e.target.value; $('#cust-rows').innerHTML = custRows(); }); },
  marketing() {
    const timers = {};
    document.querySelectorAll('textarea[data-camp]').forEach((ta) => ta.addEventListener('input', () => {
      const c = state.campaigns.find((x) => x.id === ta.dataset.camp); if (!c || c.status !== 'rascunho') return;
      c.message = ta.value.slice(0, 1200);
      document.querySelectorAll('#camp-' + c.id + ' .pv-text').forEach((p) => { const cc = cust(p.dataset.cust); if (cc) p.textContent = personalize(c.message, cc); });
      clearTimeout(timers[c.id]);
      timers[c.id] = setTimeout(() => { if (!c.message.trim()) return; updateCampaignMessage(c.id, c.message).catch((e) => toast(failText(e), 'warn')); }, 700);
    }));
    if (ui.openCampaign) { const el = $('#camp-' + ui.openCampaign); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); ui.openCampaign = null; }
  },
  precificacao() {
    const form = $('#pricing-form');
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', (e) => { const k = e.target.dataset.k; if (k) { ui.pricing[k] = e.target.value; $('#pricing-out').innerHTML = pricingOut(); } });
    $('#pr-prod').addEventListener('change', (e) => { setPricingProduct(e.target.value); render(); });
  },
  configuracoes() {
    $('#org-form').addEventListener('submit', async (e) => {
      e.preventDefault(); if (!isAdmin()) return;
      const n = $('#org-name').value.trim(), d = $('#org-doc').value.trim(); hideMsg('org-err');
      if (n.length < 2) return showErr('org-err', 'Informe o nome da empresa.');
      await run(e.submitter, async () => { await updateOrg(n, d); toast('Dados da empresa salvos.'); render(); });
    });
    $('#pass-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const p = $('#new-pass').value; hideMsg('pass-err');
      if (!strongPass(p)) return showErr('pass-err', 'A senha precisa ter 8 caracteres ou mais, com letras e números.');
      await run(e.submitter, async () => { const { error } = await sb.auth.updateUser({ password: p }); if (error) throw new Error(authMsg(error)); $('#new-pass').value = ''; toast('Senha alterada.'); });
    });
    const sw = $('#org-switch');
    if (sw) sw.addEventListener('change', () => openOrg(sw.value));
  },
};

/* ---------- Ipê ---------- */
function renderChat() {
  const log = $('#chat-log'); if (!log) return;
  log.innerHTML = ipe.chat.list.map(msgHTML).join('');
  log.scrollTop = log.scrollHeight;
  const sub = $('#ipe-sub'); if (sub) sub.textContent = ipeSub();
  const send = $('#chat-send'); if (send) send.disabled = ipe.chat.busy;
}
function onChat() { if (route() === 'ia' && phase === 'app') renderChat(); }
function sendToIpe(text) { ipe.ask(text, onChat); }

/* ---------- autenticação ---------- */
function authMsg(error) {
  const m = String((error && error.message) || '');
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/rate limit|too many|429/i.test(m) || (error && error.status === 429)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (/weak|pwned|leaked/i.test(m)) return 'Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.';
  if (/same.*password|different from the old/i.test(m)) return 'A nova senha precisa ser diferente da atual.';
  if (/already registered|already exists/i.test(m)) return 'Este e-mail já tem conta. Entre ou recupere a senha.';
  if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
  return 'Não foi possível concluir agora. Tente de novo.';
}
function bindLogin() {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hideMsg('l-err');
    const email = $('#l-email').value.trim(), password = $('#l-pass').value;
    if (!EMAIL_RX.test(email) || !password) return showErr('l-err', 'Informe um e-mail válido e a senha.');
    await run(e.submitter, async () => { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) showErr('l-err', authMsg(error)); });
  });
}
function bindSignup() {
  $('#signup-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hideMsg('s-err', 's-ok');
    const name = $('#s-name').value.trim(), email = $('#s-email').value.trim(), password = $('#s-pass').value;
    if (name.length < 2) return showErr('s-err', 'Informe seu nome.');
    if (!EMAIL_RX.test(email)) return showErr('s-err', 'Informe um e-mail válido, por exemplo nome@dominio.com.');
    if (!strongPass(password)) return showErr('s-err', 'A senha precisa ter 8 caracteres ou mais, com letras e números.');
    if (!$('#s-terms').checked) return showErr('s-err', 'Para criar a conta, aceite os Termos de uso e a Política de Privacidade.');
    await run(e.submitter, async () => {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name.slice(0, 80) }, emailRedirectTo: location.origin + '/' } });
      if (error) return showErr('s-err', authMsg(error));
      if (!data.session) { const ok = $('#s-ok'); ok.textContent = 'Enviamos um link de confirmação para ' + email + '. Abra o e-mail para ativar a conta. Se não chegar em alguns minutos, confira a caixa de spam.'; ok.hidden = false; $('#signup-form').reset(); }
    });
  });
}
function bindForgot() {
  $('#forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hideMsg('f-err', 'f-ok');
    const email = $('#f-email').value.trim();
    if (!EMAIL_RX.test(email)) return showErr('f-err', 'Informe um e-mail válido.');
    await run(e.submitter, async () => {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
      if (error && /rate|429/i.test(String(error.message) + error.status)) return showErr('f-err', authMsg(error));
      const ok = $('#f-ok'); ok.textContent = 'Se existir uma conta com esse e-mail, você vai receber um link para criar uma senha nova.'; ok.hidden = false;
    });
  });
}
function bindNewPassword() {
  $('#newpass-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hideMsg('n-err');
    const p = $('#n-pass').value, p2 = $('#n-pass2').value;
    if (!strongPass(p)) return showErr('n-err', 'A senha precisa ter 8 caracteres ou mais, com letras e números.');
    if (p !== p2) return showErr('n-err', 'As duas senhas não são iguais.');
    await run(e.submitter, async () => {
      const { error } = await sb.auth.updateUser({ password: p });
      if (error) return showErr('n-err', authMsg(error));
      toast('Senha nova salva.'); replaceRoute('dashboard');
      const { data } = await sb.auth.getSession();
      if (data.session) enterSession(data.session); else { phase = 'public'; replaceRoute('entrar'); render(); }
    });
  });
}
function bindOnboarding() {
  $('#org-new-form').addEventListener('submit', async (e) => {
    e.preventDefault(); hideMsg('o-err');
    const n = $('#o-name').value.trim(), d = $('#o-doc').value.trim();
    if (n.length < 2) return showErr('o-err', 'Informe o nome da empresa.');
    await run(e.submitter, async () => {
      try { await createOrg(n, d); } catch (err) { return showErr('o-err', errMsg(err)); }
      await openOrg(state.org.id, 'Empresa criada. Comece cadastrando seus produtos.');
    });
  });
}

async function openOrg(id, msg) {
  selectOrg(id); phase = 'boot'; render();
  try { await loadAll(); ipe.resetChat(); phase = 'app'; replaceRoute(route() && VIEWS[route()] ? route() : 'dashboard'); lastView = null; render(); if (msg) toast(msg); }
  catch (e) { bootError = errMsg(e); phase = 'error'; render(); }
}
let entering = null;
async function enterSession(session) {
  if (entering) return entering;
  state.user = session.user;
  entering = (async () => {
    phase = 'boot'; render();
    try {
      const org = await loadOrgs();
      if (!org) { phase = 'onboarding'; render(); return; }
      await loadAll(); phase = 'app';
      if (!VIEWS[route()]) replaceRoute('dashboard');
      lastView = null; render();
    } catch (e) { bootError = errMsg(e); phase = 'error'; render(); }
  })().finally(() => { entering = null; });
  return entering;
}
function leaveSession() {
  state.user = null; state.orgs = []; state.org = null;
  Object.assign(state, { products: [], customers: [], sales: [], campaigns: [], automations: [], aiLog: [], stats: new Map() });
  ipe.resetChat(); phase = 'public'; closeModal();
  if (!PUBLIC.includes(route()) && !LEGAL[route()]) replaceRoute('inicio');
  render();
}

/* ---------- formulários do app ---------- */
function productModal(p) {
  const isNew = !p; p = p || { name: '', sku: '', category: '', price: '', cost: '', stock: 0, active: true };
  const cats = Array.from(new Set(state.products.map((x) => x.category).filter(Boolean)));
  openModal({ title: isNew ? 'Novo produto' : 'Editar produto', submitLabel: isNew ? 'Cadastrar produto' : 'Salvar alterações', body:
    '<div class="field"><label for="f-name">Nome</label><input id="f-name" type="text" maxlength="80" value="' + esc(p.name) + '"></div>' +
    '<div class="grid2"><div class="field"><label for="f-sku">SKU (opcional)</label><input id="f-sku" type="text" maxlength="24" value="' + esc(p.sku) + '"></div><div class="field"><label for="f-cat">Categoria</label><input id="f-cat" type="text" list="f-cats" maxlength="40" value="' + esc(p.category) + '"><datalist id="f-cats">' + cats.map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist></div></div>' +
    '<div class="grid3"><div class="field"><label for="f-price">Preço (R$)</label><input id="f-price" type="text" inputmode="decimal" value="' + esc(dec(p.price)) + '" placeholder="0,00"></div><div class="field"><label for="f-cost">Custo (R$)</label><input id="f-cost" type="text" inputmode="decimal" value="' + esc(dec(p.cost)) + '" placeholder="0,00"></div><div class="field"><label for="f-stock">Estoque</label><input id="f-stock" type="text" inputmode="numeric" value="' + esc(p.stock) + '"></div></div>' +
    '<label class="check"><input type="checkbox" id="f-active"' + (p.active ? ' checked' : '') + '> Produto ativo (aparece para venda)</label>',
    async onSubmit(form) {
      const name = $('#f-name', form).value.trim(), sku = $('#f-sku', form).value.trim().toUpperCase(), cat = $('#f-cat', form).value.trim();
      const price = parseDec($('#f-price', form).value), cost = parseDec($('#f-cost', form).value), stock = Number($('#f-stock', form).value.trim() || '0');
      if (name.length < 2) return fail('Informe o nome do produto.');
      if (price === null || Number.isNaN(price) || price <= 0 || price >= 1e6) return fail('Informe um preço maior que zero, por exemplo 49,90.');
      if (cost !== null && (Number.isNaN(cost) || cost < 0 || cost >= 1e6)) return fail('O custo precisa ser um valor igual ou maior que zero.');
      if (!Number.isInteger(stock) || stock < 0 || stock > 1e7) return fail('O estoque precisa ser um número inteiro, sem vírgula.');
      if (sku && state.products.some((x) => x.sku === sku && (isNew || x.id !== p.id))) return fail('Já existe um produto com o SKU ' + sku + '.');
      await saveProduct(isNew ? null : p.id, { name, sku, category: cat, price: Math.round(price * 100) / 100, cost: cost === null ? null : Math.round(cost * 100) / 100, stock, active: $('#f-active', form).checked });
      toast(isNew ? 'Produto cadastrado.' : 'Produto atualizado.'); refresh();
    } });
}
function custModal(c) {
  const isNew = !c; c = c || { name: '', email: '', phone: '', origin: 'Instagram', stage: 'lead', tags: [], notes: '' };
  const hasSales = !isNew && custStats(c).count > 0;
  openModal({ title: isNew ? 'Novo cliente' : 'Editar cliente', submitLabel: isNew ? 'Cadastrar cliente' : 'Salvar alterações', body:
    '<div class="field"><label for="c-name">Nome</label><input id="c-name" type="text" maxlength="80" value="' + esc(c.name) + '"></div>' +
    '<div class="grid2"><div class="field"><label for="c-email">E-mail</label><input id="c-email" type="email" maxlength="120" value="' + esc(c.email) + '"></div><div class="field"><label for="c-phone">Telefone / WhatsApp</label><input id="c-phone" type="text" inputmode="tel" maxlength="20" value="' + esc(c.phone) + '" placeholder="(61) 99999-0000"></div></div>' +
    '<div class="grid2"><div class="field"><label for="c-origin">Origem</label><select id="c-origin">' + ORIGINS.map((o) => '<option' + (c.origin === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="c-stage">Etapa antes da 1ª compra</label><select id="c-stage"' + (hasSales ? ' disabled' : '') + '><option value="lead"' + (c.stage !== 'potencial' ? ' selected' : '') + '>Lead</option><option value="potencial"' + (c.stage === 'potencial' ? ' selected' : '') + '>Potencial</option></select>' + (hasSales ? '<span class="hint">Já comprou: o status vem das compras.</span>' : '') + '</div></div>' +
    '<div class="field"><label for="c-tags">Tags</label><input id="c-tags" type="text" maxlength="200" value="' + esc((c.tags || []).join(', ')) + '" placeholder="vip, atacado"><span class="hint">Separe por vírgula. Até 20.</span></div>' +
    '<div class="field"><label for="c-notes">Observações</label><textarea id="c-notes" rows="3" maxlength="2000">' + esc(c.notes) + '</textarea></div>' +
    '<p class="hint">Cadastre só contatos que autorizaram receber mensagens da sua empresa (LGPD).</p>',
    async onSubmit(form) {
      const name = $('#c-name', form).value.trim(), email = $('#c-email', form).value.trim(), phone = $('#c-phone', form).value.trim();
      const tags = Array.from(new Set($('#c-tags', form).value.split(',').map((s) => s.trim().toLowerCase().slice(0, 30)).filter(Boolean)));
      if (name.length < 2) return fail('Informe o nome do cliente.');
      if (email && !EMAIL_RX.test(email)) return fail('O e-mail parece incompleto. Confira, por exemplo: nome@dominio.com.');
      if (phone && (!/^[0-9 ()+-]*$/.test(phone) || phone.replace(/\D/g, '').length < 10)) return fail('O telefone precisa ter DDD e número, só com dígitos, espaços, parênteses, + ou -.');
      if (tags.length > 20) return fail('Use no máximo 20 tags.');
      await saveCustomer(isNew ? null : c.id, { name, email, phone, origin: $('#c-origin', form).value, stage: $('#c-stage', form).value, tags, notes: $('#c-notes', form).value.trim().slice(0, 2000) });
      toast(isNew ? 'Cliente cadastrado.' : 'Cliente atualizado.'); refresh();
    } });
}
function saleModal(prefC) {
  const avail = state.products.filter((p) => p.active);
  const first = avail.find((p) => p.stock > 0);
  if (!first) { toast('Nenhum produto ativo com estoque. Cadastre ou reponha um produto antes.', 'warn'); return; }
  const items = [{ productId: first.id, qty: '1' }];
  const todayStr = isoDate(new Date());
  let total = () => 0;
  openModal({ title: 'Nova venda', submitLabel: 'Registrar venda', body:
    '<div class="field"><label for="s-cust">Cliente</label><select id="s-cust"><option value="">Venda avulsa (sem cliente)</option>' + state.customers.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((c) => '<option value="' + c.id + '"' + (c.id === prefC ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>' +
    '<div class="grid2"><div class="field"><label for="s-status">Pagamento</label><select id="s-status"><option value="pago">Pago</option><option value="pendente">Pendente</option></select></div><div class="field"><label for="s-date">Data</label><input id="s-date" type="date" value="' + todayStr + '" max="' + todayStr + '"></div></div>' +
    '<fieldset class="items"><legend>Itens</legend><div id="s-items" class="item-rows"></div><div><button type="button" class="btn btn-subtle btn-sm" id="s-add">' + icon('plus') + 'Adicionar item</button></div></fieldset>' +
    '<div class="sale-total"><span>Total</span><strong id="s-total">R$ 0,00</strong></div>',
    onOpen(form) {
      const box = $('#s-items', form);
      total = () => { const t = sum(items.map((it) => { const p = prod(it.productId); return (p ? p.price : 0) * (parseInt(it.qty, 10) || 0); })); $('#s-total', form).textContent = brl(t); return t; };
      const draw = () => {
        box.innerHTML = items.map((it, i) => '<div class="item-row"><label class="sr-only" for="s-p-' + i + '">Produto ' + (i + 1) + '</label><select id="s-p-' + i + '" class="s-prod" data-i="' + i + '">' + avail.map((p) => '<option value="' + p.id + '"' + (p.id === it.productId ? ' selected' : '') + (p.stock <= 0 ? ' disabled' : '') + '>' + esc(p.name) + ' · ' + brl(p.price) + ' · ' + (p.stock <= 0 ? 'esgotado' : p.stock + ' em estoque') + '</option>').join('') + '</select>' +
          '<label class="sr-only" for="s-q-' + i + '">Quantidade</label><input id="s-q-' + i + '" class="s-qty" data-i="' + i + '" type="number" min="1" step="1" inputmode="numeric" value="' + esc(it.qty) + '">' +
          '<button type="button" class="icon-btn s-rm" data-i="' + i + '" aria-label="Remover item"' + (items.length === 1 ? ' disabled' : '') + '>' + icon('x') + '</button></div>').join('');
        total();
      };
      box.addEventListener('change', (e) => { if (e.target.classList.contains('s-prod')) { items[+e.target.dataset.i].productId = e.target.value; total(); } });
      box.addEventListener('input', (e) => { if (e.target.classList.contains('s-qty')) { items[+e.target.dataset.i].qty = e.target.value; total(); } });
      box.addEventListener('click', (e) => { const b = e.target.closest('.s-rm'); if (b && !b.disabled) { items.splice(+b.dataset.i, 1); draw(); } });
      $('#s-add', form).addEventListener('click', () => { if (items.length >= 50) return; const used = items.map((i) => i.productId); const nx = avail.find((p) => p.stock > 0 && !used.includes(p.id)) || first; items.push({ productId: nx.id, qty: '1' }); draw(); });
      draw();
    },
    async onSubmit(form) {
      if (!items.length) return fail('Adicione pelo menos um item.');
      const need = {}, order = [];
      for (const it of items) {
        const q = Number(it.qty);
        if (!Number.isInteger(q) || q < 1 || q > 100000) return fail('A quantidade de cada item precisa ser um número inteiro maior que zero.');
        if (!need[it.productId]) { need[it.productId] = 0; order.push(it.productId); }
        need[it.productId] += q;
      }
      for (const pid of order) { const p = prod(pid); if (need[pid] > p.stock) return fail('Estoque insuficiente de ' + p.name + ': ' + p.stock + ' ' + pl(p.stock, 'unidade disponível', 'unidades disponíveis') + ', pedido de ' + need[pid] + '.'); }
      const dv = $('#s-date', form).value;
      if (!dv) return fail('Informe a data da venda.');
      if (dv > todayStr) return fail('A data da venda não pode estar no futuro.');
      const t = total();
      await createSale($('#s-cust', form).value || null, $('#s-status', form).value, dv === todayStr ? new Date().toISOString() : new Date(dv + 'T12:00:00').toISOString(), order.map((pid) => ({ productId: pid, qty: need[pid] })));
      toast('Venda de ' + brl(t) + ' registrada. Estoque atualizado.'); refresh();
    } });
}
function orgModal() {
  openModal({ title: 'Nova empresa', submitLabel: 'Criar empresa', body:
    '<div class="field"><label for="on-name">Nome da empresa</label><input id="on-name" type="text" maxlength="80"></div><div class="field"><label for="on-doc">CNPJ ou CPF (opcional)</label><input id="on-doc" type="text" maxlength="20"></div><p class="hint">Cada empresa tem clientes, produtos e vendas separados. Limite de 3 por conta.</p>',
    async onSubmit(form) {
      const n = $('#on-name', form).value.trim(); if (n.length < 2) return fail('Informe o nome da empresa.');
      await createOrg(n, $('#on-doc', form).value.trim());
      closeModal(); await openOrg(state.org.id, 'Empresa criada.'); return false;
    } });
}
async function runAutomation(a) {
  let r, msg;
  if (a.key === 'a1') { r = await createCampaign('reactivation', { filter: (x) => x.total > 100, name: 'Reativação automática · ' + monthLabel(), origin: 'automação' }); msg = !r ? 'nenhum cliente atende às condições' : r.dup ? 'rascunho já existia para esses ' + r.c.audience.length + ' clientes' : 'rascunho criado para ' + r.c.audience.length + ' ' + pl(r.c.audience.length, 'cliente', 'clientes'); }
  else if (a.key === 'a2') { const n = metrics().lowStock.length; msg = n ? n + ' ' + pl(n, 'produto', 'produtos') + ' em alerta no painel' : 'nenhum produto com estoque baixo'; }
  else { r = await createCampaign('leads', { filter: (x) => x.c.phone && age(x.c.createdAt) <= 7, name: 'Boas-vindas a novos leads · ' + monthLabel(), origin: 'automação' }); msg = !r ? 'nenhum lead novo com telefone' : r.dup ? 'rascunho já existia' : 'rascunho criado para ' + r.c.audience.length + ' ' + pl(r.c.audience.length, 'lead', 'leads'); }
  await updateAutomation(a.key, { lastRun: new Date().toISOString(), lastResult: msg });
  toast(a.name + ': ' + msg + '.'); refresh();
}
function exportCSV(kind) {
  let rows, name;
  if (kind === 'clientes') { name = 'clientes'; rows = [['Nome', 'E-mail', 'Telefone', 'Origem', 'Status', 'Total gasto', 'Compras pagas', 'Última compra', 'Tags', 'Observações', 'Cadastro']].concat(state.customers.map((c) => { const s = custStats(c); return [c.name, c.email, c.phone, c.origin, STATUS[s.status][0], s.total.toFixed(2).replace('.', ','), s.count, s.last ? fmtDate(s.last) : '', c.tags.join(', '), c.notes, fmtDate(c.createdAt)]; })); }
  else if (kind === 'produtos') { name = 'produtos'; rows = [['Nome', 'SKU', 'Categoria', 'Preço', 'Custo', 'Estoque', 'Ativo']].concat(state.products.map((p) => [p.name, p.sku, p.category, p.price.toFixed(2).replace('.', ','), p.cost == null ? '' : p.cost.toFixed(2).replace('.', ','), p.stock, p.active ? 'sim' : 'não'])); }
  else { name = 'vendas'; rows = [['Data', 'Cliente', 'Itens', 'Total', 'Status']].concat(state.sales.map((s) => { const c = s.customerId ? cust(s.customerId) : null; return [fmtDate(s.date), c ? c.name : 'Venda avulsa', s.items.map((i) => { const p = prod(i.productId); return i.qty + 'x ' + (p ? p.name : 'removido'); }).join(', '), saleTotal(s).toFixed(2).replace('.', ','), s.status]; })); }
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '-' + isoDate(new Date()) + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Arquivo ' + a.download + ' gerado.');
}

/* ---------- ações (delegação de cliques) ---------- */
const openDrawer = () => { $('#rail').classList.add('open'); $('#scrim').hidden = false; };
const closeDrawer = () => { const r = $('#rail'); if (r) r.classList.remove('open'); const s = $('#scrim'); if (s) s.hidden = true; };
const findCampaign = (id) => state.campaigns.find((x) => x.id === id);
const ACTIONS = {
  'menu-open': openDrawer, 'menu-close': closeDrawer, 'modal-close': closeModal, reload: () => location.reload(),
  logout: () => run(null, async () => { await sb.auth.signOut({ scope: 'local' }); leaveSession(); }),
  'logout-all': (el) => { if (!armed(el)) return; run(el, async () => { await sb.auth.signOut({ scope: 'global' }); leaveSession(); }); },
  goto(el) {
    const d = el.dataset;
    if (d.v === 'produtos' && d.f) { ui.prodFilter = d.f; ui.prodQ = ''; ui.prodCat = ''; }
    if (d.v === 'vendas' && d.f) ui.saleTab = d.f;
    if (d.v === 'clientes') { ui.custTab = d.f || 'todos'; ui.custQ = ''; }
    if (d.v === 'precificacao' && d.p) setPricingProduct(d.p);
    if (d.v === 'marketing' && d.c) ui.openCampaign = d.c;
    closeModal(); go(d.v);
    if (d.v === 'ia' && d.q) setTimeout(() => { if (!ipe.chat.busy) sendToIpe(d.q); }, 60);
  },
  'product-new': () => productModal(null),
  'product-edit': (el) => productModal(prod(el.dataset.id)),
  'product-del'(el) {
    const p = prod(el.dataset.id); if (!p) return;
    if (state.sales.some((s) => s.items.some((i) => i.productId === p.id))) { toast('Este produto tem vendas registradas. Desative-o em Editar em vez de excluir.', 'warn'); return; }
    if (!armed(el)) return;
    run(el, async () => { await deleteProduct(p.id); toast('Produto excluído.'); refresh(); });
  },
  'prod-filter': (el) => { ui.prodFilter = el.dataset.v; refresh(); },
  'cust-tab': (el) => { ui.custTab = el.dataset.v; refresh(); },
  'cust-new': () => custModal(null),
  'cust-edit': (el) => custModal(cust(el.dataset.id)),
  'cust-view': (el) => { const c = cust(el.dataset.id); if (c) openModal({ title: c.name, footer: false, body: custDetail(c) }); },
  'cust-del'(el) {
    const c = cust(el.dataset.id); if (!c) return;
    if (custStats(c).count > 0 || state.sales.some((s) => s.customerId === c.id)) { toast('Este cliente tem vendas registradas e não pode ser excluído. Você pode editar os dados dele.', 'warn'); return; }
    if (!armed(el)) return;
    run(el, async () => { await deleteCustomer(c.id); toast('Cliente excluído.'); refresh(); });
  },
  'sale-new': (el) => { closeModal(); saleModal(el.dataset.c || null); },
  'sale-tab': (el) => { ui.saleTab = el.dataset.v; ui.saleLimit = 15; refresh(); },
  'sale-more': () => { ui.saleLimit += 15; refresh(); },
  'sale-pay': (el) => run(el, async () => { await setSaleStatus(el.dataset.id, 'pago'); toast('Venda marcada como paga.'); refresh(); }),
  'sale-cancel'(el) { if (!armed(el)) return; run(el, async () => { await setSaleStatus(el.dataset.id, 'cancelado'); toast('Venda cancelada e estoque devolvido.'); refresh(); }); },
  'campaign-reactivation': (el) => run(el, async () => { const r = await createCampaign('reactivation'); if (!r) { toast('Nenhum cliente inativo para incluir agora.', 'warn'); return; } ui.openCampaign = r.c.id; toast(r.dup ? 'Já existe um rascunho com esses clientes.' : 'Rascunho criado. Revise e aprove.'); closeModal(); go('marketing'); }),
  'campaign-leads': (el) => run(el, async () => { const r = await createCampaign('leads'); if (!r) { toast('Nenhum lead sem compra agora.', 'warn'); return; } ui.openCampaign = r.c.id; toast(r.dup ? 'Já existe um rascunho com esses leads.' : 'Rascunho criado. Revise e aprove.'); go('marketing'); }),
  'campaign-approve': (el) => run(el, async () => { const c = findCampaign(el.dataset.id); if (!c) return; if (c.message.trim()) await updateCampaignMessage(c.id, c.message); await approveCampaign(c.id); ui.openCampaign = c.id; toast('Campanha aprovada. Copie as mensagens para enviar.'); refresh(); }),
  'campaign-del'(el) { if (!armed(el)) return; run(el, async () => { await deleteCampaign(el.dataset.id); toast('Campanha excluída.'); refresh(); }); },
  copy(el) { const t = document.getElementById(el.dataset.target); if (t) copyText(t.textContent, t); },
  'chat-suggest': (el) => { if (ipe.chat.busy) { toast('Espere a resposta terminar.', 'warn'); return; } sendToIpe(el.dataset.q); },
  'chat-clear': () => { if (ipe.chat.busy) return; ipe.resetChat(); renderChat(); },
  'chat-retry': (el) => ipe.retry(el.dataset.m, onChat),
  'chat-copy'(el) { const m = ipe.findMsg(el.dataset.m); if (!m || !m.text) return; const box = document.getElementById(m.id); copyText(m.text, box && box.querySelector('.md')); },
  'ai-mode': (el) => { ipe.chat.mode = el.dataset.v; document.querySelectorAll('[data-action="ai-mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === ipe.chat.mode))); },
  async 'ai-approve'(el) {
    const m = ipe.findMsg(el.dataset.m); if (!m || !m.actions) return;
    const x = m.actions[Number(el.dataset.i)]; if (!x || x.status !== 'pendente') return;
    x.status = 'rodando'; renderChat();
    try { const r = await ipe.execAction(x); x.status = 'aprovada'; x.result = r.msg; x.go = r.go; toast(r.msg); }
    catch (err) { x.status = 'erro'; x.result = failText(err); }
    renderChat(); if (phase === 'app') renderRail(route());
  },
  'ai-dismiss'(el) { const m = ipe.findMsg(el.dataset.m); if (!m || !m.actions) return; const x = m.actions[Number(el.dataset.i)]; if (!x || x.status !== 'pendente') return; x.status = 'descartada'; renderChat(); },
  'pricing-apply'(el) { const p = prod(ui.pricing.productId); if (!p) return; const price = Number(el.dataset.price); run(el, async () => { await setProductPrice(p.id, price); toast('Novo preço de ' + p.name + ': ' + brl(price) + '.'); refresh(); }); },
  'auto-toggle'(el) { const a = state.automations.find((x) => x.key === el.dataset.id); if (!a) return; run(el, async () => { await updateAutomation(a.key, { enabled: !a.enabled }); toast(a.name + (a.enabled ? ' desativada.' : ' ativada.')); refresh(); }); },
  'auto-run'(el) { const a = state.automations.find((x) => x.key === el.dataset.id); if (a && a.enabled) run(el, () => runAutomation(a)); },
  theme(el) { state.theme = el.dataset.v; try { localStorage.setItem('abm-theme', state.theme); } catch { /* sem storage */ } render(); },
  'org-new': () => orgModal(),
  export: (el) => exportCSV(el.dataset.v),
};
document.addEventListener('click', (e) => {
  const sc = e.target.closest('[data-scroll]');
  if (sc) {
    e.preventDefault();
    const go2 = () => { const t = document.getElementById(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (route() !== 'inicio') { location.hash = 'inicio'; setTimeout(go2, 80); } else go2();
    return;
  }
  const el = e.target.closest('[data-action]'); if (!el) return;
  const fn = ACTIONS[el.dataset.action]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  if (el.disabled) return;
  fn(el, e);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#modal-root').innerHTML) closeModal(); else closeDrawer(); } });
window.addEventListener('hashchange', () => { closeDrawer(); render(); });

/* ---------- início ---------- */
function cleanAuthParams() {
  const u = new URL(location.href); let changed = false;
  ['code', 'error', 'error_code', 'error_description', 'type'].forEach((k) => { if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; } });
  if (changed) history.replaceState(null, '', u.pathname + (u.search || '') + location.hash);
}
const params = new URLSearchParams(location.search);
const urlError = params.get('error_description');
const hadCode = params.has('code');
let started = false;

sb.auth.onAuthStateChange((event, session) => {
  setTimeout(() => {
    if (event === 'PASSWORD_RECOVERY') { state.user = session && session.user; phase = 'recovery'; cleanAuthParams(); replaceRoute('nova-senha'); render(); return; }
    if (event === 'SIGNED_OUT') { if (phase !== 'public') leaveSession(); return; }
    if (event === 'INITIAL_SESSION') {
      started = true; cleanAuthParams();
      if (urlError) toast(urlError.length < 160 ? 'Link inválido ou expirado. Peça um novo.' : 'Link inválido.', 'warn');
      if (session) { if (phase !== 'recovery') enterSession(session); }
      else { if (hadCode) toast('Se você acabou de confirmar o e-mail, entre com sua senha.'); phase = 'public'; render(); }
      return;
    }
    if (event === 'SIGNED_IN' && session && started && phase !== 'recovery') {
      if (!state.user || state.user.id !== session.user.id || phase === 'public') enterSession(session);
      return;
    }
    if ((event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session) state.user = session.user;
  }, 0);
});
render();
