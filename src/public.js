// Páginas públicas: apresentação, entrar, criar conta, recuperar senha, primeira empresa e textos legais.
import { icon, LOGO, esc } from './lib.js';
import { CONTACT } from './config.js';

const check = (t) => '<li>' + icon('check') + '<span>' + t + '</span></li>';

export function siteHeader(active) {
  return '<header class="site-head"><a class="brand" href="#inicio" aria-label="AI Business Manager, início">' + LOGO + '<span class="brand-name">AI Business Manager</span></a>' +
    '<nav class="site-nav" aria-label="Seções"><a href="#inicio" data-scroll="recursos">Recursos</a><a href="#inicio" data-scroll="ipe">Ipê</a><a href="#inicio" data-scroll="seguranca">Segurança</a><a href="#inicio" data-scroll="planos">Plano</a></nav>' +
    '<div class="site-cta">' + (active === 'entrar' ? '' : '<a class="btn btn-subtle" href="#entrar">Entrar</a>') + '<a class="btn btn-orange" href="#criar-conta">Criar conta grátis</a></div></header>';
}
export function siteFooter() {
  return '<footer class="site-foot"><div class="brand">' + LOGO + '<span class="brand-name">AI Business Manager</span></div><nav aria-label="Links legais"><a href="#termos">Termos de uso</a><a href="#privacidade">Privacidade</a><span>Contato: <span class="sel">' + esc(CONTACT.email) + '</span></span></nav><p class="muted small">Feito no Brasil para MEIs e pequenos negócios.</p></footer>';
}

export function viewLanding() {
  const feats = [
    ['grid', 't-mint', 'Painel que mostra o que fazer', 'Faturamento, ticket médio, conversão e alertas calculados dos seus dados: clientes parados, estoque baixo e vendas pendentes.'],
    ['users', 't-peach', 'Clientes com status automático', 'Lead, cliente, recorrente ou inativo: o status muda sozinho conforme as compras. Histórico, tags e observações em um lugar.'],
    ['cart', 't-sand', 'Vendas que baixam o estoque', 'Cada venda grava itens e estoque numa única operação. Cancelou? O estoque volta.'],
    ['megaphone', 't-sky', 'Campanhas com a sua aprovação', 'Mensagens personalizadas com o nome e a última compra de cada cliente. Nada é enviado sem você aprovar.'],
    ['calc', 't-mint', 'Precificação sem achismo', 'Preço mínimo, recomendado e comercial, já descontando taxa da maquininha, frete e imposto.'],
    ['flow', 't-peach', 'Automações simples', 'Reativação de clientes parados, alerta de estoque e boas-vindas a novos leads, sempre como rascunho.'],
  ];
  return siteHeader() + '<main class="site">' +
    '<section class="site-hero rise"><div class="sh-copy">' +
      '<h1>Venda mais com uma IA que entende o seu negócio.</h1>' +
      '<p class="sh-sub">Clientes, produtos, vendas e marketing num lugar só, para MEIs e pequenas lojas. A Ipê, a IA de vendas gratuita do sistema, lê os números da sua empresa antes de sugerir qualquer coisa, e não inventa dados.</p>' +
      '<div class="sh-cta"><a class="btn btn-orange btn-lg" href="#criar-conta">Começar grátis ' + icon('arrow') + '</a><a class="btn btn-on-ink btn-lg" href="#entrar">Já tenho conta</a></div>' +
      '<ul class="sh-points">' + check('Sem cartão de crédito') + check('Dados separados por empresa') + check('Funciona no celular') + '</ul></div>' +
      '<div class="sh-art" role="img" aria-label="Exemplo de conversa com a Ipê: ela analisa clientes parados e propõe uma campanha para aprovação"><div class="sh-art-head"><span class="ai-badge sm">' + icon('sparkles') + '</span>Ipê<small>Exemplo de conversa</small></div>' +
        '<div class="msg user"><div class="bubble">Quem eu devo chamar hoje?</div></div>' +
        '<div class="msg ai"><div class="bubble"><p>6 clientes não compram há mais de 90 dias e já gastaram R$ 2.140 com você. Preparei uma mensagem de reativação.</p></div></div>' +
        '<div class="act-card"><strong>Campanha de reativação</strong><p>6 clientes · WhatsApp · rascunho</p><div class="act-btns"><span class="btn btn-primary btn-sm">Aprovar</span><span class="btn btn-ghost btn-sm">Descartar</span></div></div>' +
      '</div></section>' +
    '<section class="site-sec" id="recursos"><h2 class="sec-title">Tudo o que uma pequena empresa usa todo dia.</h2><ul class="feat-list">' +
      feats.map((f) => '<li><span class="f-ic ' + f[1] + '">' + icon(f[0]) + '</span><div><h3>' + f[2] + '</h3><p>' + f[3] + '</p></div></li>').join('') + '</ul></section>' +
    '<section class="site-sec ipe-sec" id="ipe"><div class="ipe-copy"><h2 class="sec-title">Uma especialista em vendas, e só em vendas.</h2>' +
      '<p>A Ipê é a IA própria do AI Business Manager. Ela responde sobre vendas, marketing, atendimento, preços, estoque e gestão comercial da sua empresa, com base nos dados que você cadastrou.</p>' +
      '<ul class="ipe-list">' + check('Analisa suas vendas e aponta prioridades da semana') + check('Escreve posts, mensagens de WhatsApp e respostas a clientes') + check('Propõe ações no sistema, que só acontecem com a sua aprovação') + check('Recusa assuntos fora do negócio, sem rodeios') + '</ul></div>' +
      '<div class="ipe-demo"><div class="msg user"><div class="bubble">Quais produtos devo repor primeiro?</div></div><div class="msg ai"><div class="bubble"><p><strong>Situação:</strong> 2 produtos ativos estão com 5 unidades ou menos.</p><p><strong>Ação recomendada:</strong> reponha primeiro o que mais vendeu nos últimos 30 dias.</p></div></div><div class="msg user"><div class="bubble">Me explica física quântica?</div></div><div class="msg ai guard"><div class="bubble"><span class="guard-tag">' + icon('shield') + 'Fora do escopo</span><p>Eu sou a Ipê e só ajudo com vendas, marketing e a gestão comercial da sua empresa.</p></div></div><p class="art-tag">Exemplo de conversa</p></div></section>' +
    '<section class="site-sec" id="seguranca"><h2 class="sec-title">Seus dados ficam com a sua empresa.</h2><ul class="feat-list">' +
      [['lock', 'Isolamento por empresa', 'Cada consulta ao banco passa por regras de acesso por linha (RLS). Um usuário só enxerga dados das empresas de que faz parte.'],
       ['shield', 'IA com barreiras', 'A Ipê roda no nosso servidor, com limite de uso, filtro de assunto, bloqueio de tentativas de manipulação e verificação da resposta.'],
       ['check', 'Você aprova tudo', 'Nenhuma campanha, preço ou cadastro sugerido pela IA muda sem o seu clique. As ações aprovadas ficam registradas.'],
       ['download', 'LGPD na prática', 'Conexão sempre criptografada (HTTPS), exportação dos seus dados em planilha e canal para correção ou exclusão.']]
        .map((s, i) => '<li><span class="f-ic ' + ['t-mint', 't-peach', 't-sand', 't-sky'][i] + '">' + icon(s[0]) + '</span><div><h3>' + s[1] + '</h3><p>' + s[2] + '</p></div></li>').join('') + '</ul></section>' +
    '<section class="site-sec" id="planos"><h2 class="sec-title">Grátis para começar.</h2><div class="plan card"><div><h3>Free</h3><p class="plan-price">R$ 0</p><p class="muted">Todos os recursos liberados, com limites de uso justos.</p><a class="btn btn-orange" href="#criar-conta">Criar conta grátis</a></div><ul class="plan-list">' +
      check('Até 2.000 produtos e 10.000 clientes por empresa') + check('Até 3 empresas por conta') + check('Ipê: 60 perguntas por pessoa por dia, até 200 por empresa') + check('Campanhas, automações e precificação') + '</ul></div></section>' +
    '<section class="site-sec" id="perguntas"><h2 class="sec-title">Antes de começar</h2><div class="faq">' +
      [['A Ipê envia mensagens para os meus clientes?', 'Não. Ela prepara campanhas e textos, e você copia e envia pelo seu WhatsApp, e-mail ou Instagram depois de aprovar.'],
       ['A Ipê pode inventar números?', 'Ela é instruída a usar só os dados cadastrados e a dizer quando faltam dados. Como toda IA, pode errar: confira antes de usar com clientes.'],
       ['Por que a Ipê não responde outros assuntos?', 'Ela foi feita para vendas e gestão comercial. Para outros temas, use um assistente geral, como o ChatGPT ou o Claude.'],
       ['Funciona para MEI?', 'Sim. A precificação considera que o MEI paga o DAS fixo por mês, e o sistema foi pensado para quem vende pelo Instagram, WhatsApp ou loja física.'],
       ['Posso levar meus dados embora?', 'Sim. Em Configurações você baixa clientes, produtos e vendas em planilha (CSV) quando quiser.']]
        .map((q) => '<details class="faq-item"><summary>' + q[0] + icon('chevron') + '</summary><p>' + q[1] + '</p></details>').join('') + '</div></section>' +
    '<section class="site-sec final-cta"><h2>Pronto para vender com mais clareza?</h2><a class="btn btn-orange btn-lg" href="#criar-conta">Criar conta grátis ' + icon('arrow') + '</a></section>' +
  '</main>' + siteFooter();
}

function authShell(title, sub, form) {
  return '<div class="auth"><div class="auth-card rise"><section class="auth-side"><a class="brand" href="#inicio">' + LOGO + '<span class="brand-name">AI Business Manager</span></a>' +
    '<h1 class="auth-title">Seu time de vendas ganhou uma IA.</h1><ul class="auth-points">' + check('Painel com faturamento, ticket médio e clientes parados') + check('Ipê responde com base nos seus dados') + check('Campanhas só saem com a sua aprovação') + '</ul>' +
    '<p class="auth-foot">Ao continuar você concorda com os <a href="#termos">Termos</a> e a <a href="#privacidade">Política de Privacidade</a>.</p></section>' +
    '<div class="auth-form"><h2>' + title + '</h2>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + form + '</div></div></div>';
}
const err = (id) => '<p class="form-error" id="' + id + '" role="alert" hidden></p>';
const ok = (id) => '<p class="form-ok" id="' + id + '" role="status" hidden></p>';

export const viewLogin = () => authShell('Entrar', 'Use o e-mail e a senha da sua conta.',
  '<form class="form-stack" id="login-form" novalidate><div class="field"><label for="l-email">E-mail</label><input id="l-email" type="email" autocomplete="username" maxlength="120" required></div>' +
  '<div class="field"><label for="l-pass">Senha</label><input id="l-pass" type="password" autocomplete="current-password" maxlength="72" required></div>' + err('l-err') +
  '<button class="btn btn-primary btn-block" type="submit">Entrar</button></form><p class="auth-alt"><a href="#recuperar">Esqueci minha senha</a> · <a href="#criar-conta">Criar conta</a></p>');

export const viewSignup = () => authShell('Criar conta grátis', 'Leva menos de um minuto.',
  '<form class="form-stack" id="signup-form" novalidate><div class="field"><label for="s-name">Seu nome</label><input id="s-name" type="text" autocomplete="name" maxlength="80" required></div>' +
  '<div class="field"><label for="s-email">E-mail</label><input id="s-email" type="email" autocomplete="email" maxlength="120" required></div>' +
  '<div class="field"><label for="s-pass">Senha</label><input id="s-pass" type="password" autocomplete="new-password" minlength="8" maxlength="72" required><span class="hint">Mínimo de 8 caracteres, com letras e números.</span></div>' +
  '<label class="check"><input type="checkbox" id="s-terms"> <span>Li e aceito os <a href="#termos">Termos de uso</a> e a <a href="#privacidade">Política de Privacidade</a>.</span></label>' + err('s-err') + ok('s-ok') +
  '<button class="btn btn-primary btn-block" type="submit">Criar conta</button></form><p class="auth-alt">Já tem conta? <a href="#entrar">Entrar</a></p>');

export const viewForgot = () => authShell('Recuperar senha', 'Enviaremos um link para você criar uma senha nova.',
  '<form class="form-stack" id="forgot-form" novalidate><div class="field"><label for="f-email">E-mail da conta</label><input id="f-email" type="email" autocomplete="email" maxlength="120" required></div>' + err('f-err') + ok('f-ok') +
  '<button class="btn btn-primary btn-block" type="submit">Enviar link</button></form><p class="auth-alt"><a href="#entrar">Voltar para entrar</a></p>');

export const viewNewPassword = () => authShell('Criar senha nova', 'Escolha uma senha que você não use em outros sites.',
  '<form class="form-stack" id="newpass-form" novalidate><div class="field"><label for="n-pass">Nova senha</label><input id="n-pass" type="password" autocomplete="new-password" minlength="8" maxlength="72" required><span class="hint">Mínimo de 8 caracteres, com letras e números.</span></div>' +
  '<div class="field"><label for="n-pass2">Repita a senha</label><input id="n-pass2" type="password" autocomplete="new-password" maxlength="72" required></div>' + err('n-err') +
  '<button class="btn btn-primary btn-block" type="submit">Salvar senha</button></form>');

export const viewOnboarding = (name) => '<div class="auth"><div class="auth-card single rise"><div class="auth-form"><a class="brand" href="#inicio">' + LOGO + '<span class="brand-name">AI Business Manager</span></a>' +
  '<h2>' + (name ? 'Olá, ' + esc(name.split(' ')[0]) + '! ' : '') + 'Vamos criar a sua empresa</h2><p class="muted">Os dados de cada empresa ficam separados. Você pode criar até 3.</p>' +
  '<form class="form-stack" id="org-new-form" novalidate><div class="field"><label for="o-name">Nome da empresa</label><input id="o-name" type="text" maxlength="80" placeholder="Ex.: Loja da Ana" required></div>' +
  '<div class="field"><label for="o-doc">CNPJ ou CPF (opcional)</label><input id="o-doc" type="text" inputmode="numeric" maxlength="20"></div>' + err('o-err') +
  '<button class="btn btn-primary btn-block" type="submit">Criar empresa</button></form><p class="auth-alt"><button type="button" class="link-btn" data-action="logout">Sair</button></p></div></div></div>';

export const viewLoading = (msg) => '<div class="boot"><div class="boot-in">' + LOGO + '<p>' + esc(msg || 'Carregando…') + '</p></div></div>';
export const viewError = (msg) => '<div class="boot"><div class="boot-in">' + LOGO + '<p>' + esc(msg) + '</p><button type="button" class="btn btn-primary" data-action="reload">Tentar de novo</button></div></div>';

const legalShell = (title, updated, body) => siteHeader() + '<main class="site"><article class="card legal rise"><h1>' + title + '</h1><p class="muted small">Última atualização: ' + updated + '</p>' + body + '</article></main>' + siteFooter();

export const viewTerms = () => legalShell('Termos de uso', CONTACT.updated,
  '<p>Estes termos regem o uso do AI Business Manager ("Serviço"), oferecido por <strong>' + esc(CONTACT.controller) + '</strong>' + (CONTACT.document ? ', inscrita sob o documento ' + esc(CONTACT.document) : '') + '. Ao criar uma conta, você concorda com eles.</p>' +
  '<h2>1. O Serviço</h2><p>Ferramenta de gestão comercial para pequenas empresas: cadastro de clientes, produtos e vendas, campanhas, precificação, automações e a assistente de IA Ipê. O plano Free é gratuito e tem os limites de uso informados no site, que podem mudar com aviso prévio.</p>' +
  '<h2>2. Sua conta</h2><p>Você é responsável pela senha e por tudo que acontece na sua conta. Use dados verdadeiros e avise-nos se suspeitar de acesso indevido.</p>' +
  '<h2>3. Seus dados e os dados dos seus clientes</h2><p>Os dados que você cadastra são seus. Ao cadastrar dados de clientes, você declara ter base legal para isso (LGPD) e é o controlador desses dados; nós atuamos como operador, tratando-os só para prestar o Serviço.</p>' +
  '<h2>4. A Ipê</h2><p>A Ipê gera sugestões automáticas e pode errar. Ela trata apenas de vendas, marketing e gestão comercial. Confira números e textos antes de usá-los. Nenhuma ação sugerida é executada sem a sua aprovação. As perguntas e os dados necessários para respondê-las são processados por um provedor de modelos de linguagem contratado por nós.</p>' +
  '<h2>5. Uso proibido</h2><p>É proibido usar o Serviço para spam, envio de mensagens sem consentimento, fraude, conteúdo ilegal, tentativa de acessar dados de outras empresas, contornar limites ou barreiras de segurança, ou sobrecarregar a infraestrutura.</p>' +
  '<h2>6. Disponibilidade e responsabilidade</h2><p>Fazemos o possível para manter o Serviço no ar e os dados seguros, mas ele é fornecido "no estado em que se encontra". Não garantimos resultados de vendas. Mantenha cópias dos seus dados pela exportação em Configurações.</p>' +
  '<h2>7. Encerramento</h2><p>Você pode parar de usar o Serviço quando quiser e pedir a exclusão da conta pelo contato abaixo. Podemos suspender contas que violem estes termos.</p>' +
  '<h2>8. Contato e foro</h2><p>Dúvidas: <span class="sel">' + esc(CONTACT.email) + '</span>. Fica eleito o foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.</p>');

export const viewPrivacy = () => legalShell('Política de Privacidade', CONTACT.updated,
  '<p>Esta política explica como <strong>' + esc(CONTACT.controller) + '</strong> trata dados pessoais no AI Business Manager, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>' +
  '<h2>1. Dados que coletamos</h2><ul><li><strong>Da sua conta:</strong> nome, e-mail e senha (guardada só como hash pelo provedor de autenticação).</li><li><strong>Da sua empresa:</strong> nome, CNPJ ou CPF, produtos, vendas, campanhas e os dados de clientes que você cadastrar (nome, e-mail, telefone, origem, observações).</li><li><strong>De uso:</strong> contagem diária de perguntas à Ipê e registros de segurança (ações aprovadas, tentativas bloqueadas).</li></ul>' +
  '<h2>2. Para que usamos</h2><p>Para prestar o Serviço (execução de contrato), manter a segurança e prevenir abuso (legítimo interesse) e cumprir obrigações legais. Não vendemos dados e não usamos os dados da sua empresa para publicidade.</p>' +
  '<h2>3. Com quem compartilhamos</h2><ul><li><strong>Supabase</strong>: banco de dados, autenticação e servidor da Ipê.</li><li><strong>Vercel</strong>: hospedagem do site.</li><li><strong>Groq</strong>: processamento das perguntas feitas à Ipê, junto com o resumo dos dados da empresa necessário para responder.</li></ul><p>Esses fornecedores podem processar dados fora do Brasil, com salvaguardas contratuais.</p>' +
  '<h2>4. Por quanto tempo</h2><p>Enquanto a conta estiver ativa. Após pedido de exclusão, apagamos os dados em até 30 dias, salvo o que a lei obrigar a manter.</p>' +
  '<h2>5. Segurança</h2><p>Conexões criptografadas (HTTPS), isolamento dos dados por empresa no banco (Row Level Security), senhas com hash, limites de uso e registro de ações sensíveis.</p>' +
  '<h2>6. Seus direitos</h2><p>Você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e revogar consentimentos. A exportação em planilha está em Configurações; os demais pedidos pelo e-mail <span class="sel">' + esc(CONTACT.email) + '</span>. Clientes cadastrados por uma empresa devem procurar primeiro essa empresa, que é a controladora desses dados.</p>' +
  '<h2>7. Cookies</h2><p>Usamos apenas armazenamento local essencial para manter você conectado e lembrar a empresa e o tema escolhidos. Não usamos cookies de publicidade.</p>' +
  '<h2>8. Encarregado (DPO)</h2><p>' + esc(CONTACT.dpo) + ' · <span class="sel">' + esc(CONTACT.email) + '</span></p>');
