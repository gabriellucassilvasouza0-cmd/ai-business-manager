# AI Business Manager

Gestão comercial com IA para MEIs e pequenas lojas: painel, clientes (CRM), produtos, vendas com baixa de estoque, campanhas com aprovação, precificação, automações e a **Ipê**, uma IA de vendas própria, restrita a vendas, marketing e gestão comercial.

## Arquitetura

```
Navegador (Vite + JS puro)                      Supabase
 ├─ site público, cadastro, login  ──HTTPS──▶   Auth (e-mail e senha, PKCE)
 ├─ app (painel, CRM, vendas…)     ──HTTPS──▶   Postgres + RLS (isolamento por empresa)
 │                                               ├─ RPCs transacionais (create_sale, set_sale_status…)
 │                                               └─ triggers de auditoria, cotas e proteção
 └─ chat da Ipê                    ──HTTPS──▶   Edge Function `ipe` ──▶ Groq (Llama 3.3 70B / GPT-OSS 120B / Llama 3.1 8B)
Vercel hospeda o front-end estático com CSP e cabeçalhos de segurança.
```

| Pasta | Conteúdo |
|---|---|
| `src/` | Front-end: `main.js` (rotas, auth, ações), `views.js` (telas), `public.js` (site, login, textos legais), `data.js` (Supabase), `ipe.js` (chat e ações aprovadas), `store.js` (cálculos), `lib.js` (utilitários), `styles.css` |
| `supabase/functions/ipe/` | Servidor da Ipê: `prompt.ts` (persona e regras), `guards.ts` (barreiras), `snapshot.ts` (dados da empresa via RLS), `index.ts` |
| `supabase/migrations/` | Esquema completo do banco (tabelas, RLS, funções, gatilhos, privilégios) |
| `tests/` | Testes das barreiras da Ipê e da lógica do front-end |

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes unitários
npm run build      # gera dist/
```

O front-end já aponta para o projeto Supabase de produção (a chave publicável é pública por natureza; a proteção dos dados está no RLS). Para outro projeto, copie `.env.example` para `.env`.

## Segurança implementada

**Banco (Supabase Postgres)**
- RLS ligado em todas as tabelas; toda política exige ser membro da empresa (`private.is_member`) e exclusões exigem dono/admin.
- Vendas, itens, membros, auditoria e uso da IA não aceitam escrita direta: só por funções `SECURITY DEFINER` com `search_path` vazio, que validam permissão, travam o estoque (`FOR UPDATE`) e gravam tudo numa transação.
- Gatilho impede mover um registro para outra empresa; gatilhos de auditoria registram criação, alteração e exclusão.
- Restrições `CHECK` em todos os campos (tamanho, formato de e-mail/telefone, valores permitidos, faixas numéricas).
- Cotas por empresa (2.000 produtos, 10.000 clientes, 300 campanhas, 50.000 vendas; 3 empresas por conta).
- Papel `anon` sem acesso a nada; funções auxiliares fora da API (schema `private`).

**Ipê (Edge Function)**
- Origem permitida, só `POST`, corpo até 40 KB, JWT obrigatório, validação de todos os campos.
- Cota no banco: 60 perguntas/pessoa/dia, 200/empresa/dia, intervalo mínimo de 3 s, pausa do dia após 15 bloqueios.
- Limpeza de caracteres invisíveis e de controle; regras contra injeção de instruções (PT e EN, com normalização de acentos e *leetspeak*).
- Classificador de assunto separado antes do modelo principal; recusa padronizada para tudo fora do escopo.
- Dados da empresa montados no servidor com o token do usuário (o RLS limita à empresa dele) e marcados como "somente informação".
- Verificação da resposta (marcador de fora do escopo e sinais de vazamento do prompt); bloqueios registrados na auditoria.
- A IA só propõe ações; cada uma é revalidada no navegador e executada pelas mesmas rotas protegidas por RLS, após o clique do dono.

**Front-end (Vercel)**
- CSP restritiva (`script-src 'self'`, sem terceiros; fontes servidas do próprio domínio), `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- Todo dado exibido passa por escape de HTML; o markdown da Ipê é escapado antes de formatar.
- Auth com PKCE; senha mínima de 8 caracteres com letras e números; mensagens que não revelam se um e-mail tem conta.
- Exportação CSV com neutralização de fórmulas (proteção contra *CSV injection*).

## Antes de abrir ao público (passos manuais)

1. **Chave do Groq**: crie em console.groq.com e salve como segredo `GROQ_API_KEY` em *Supabase → Edge Functions → Secrets*.
2. **Supabase Auth → URL Configuration**: *Site URL* = domínio da Vercel; adicione o mesmo domínio em *Redirect URLs*. Sem isso, os links de confirmação e de nova senha apontam para `localhost`.
3. **Supabase Auth → Providers → Email**: senha mínima 8; ative a proteção contra senhas vazadas (recurso do plano Pro).
4. **SMTP próprio** (Resend, Brevo, Amazon SES): o envio de e-mail embutido do Supabase tem limite baixo de mensagens por hora e não serve para lançamento.
5. **CAPTCHA** (Cloudflare Turnstile ou hCaptcha) no cadastro e login: recomendado contra contas falsas; exige liberar o domínio do CAPTCHA na CSP.
6. **Textos legais**: preencha `src/config.js` (responsável, CNPJ/CPF, e-mail, encarregado) e peça revisão jurídica dos Termos e da Política de Privacidade.
7. **Planos pagos**: a Vercel Hobby é só para uso não comercial; para vender o serviço, use o Vercel Pro. O Supabase Free pausa projetos sem uso e não tem backups diários; o Groq gratuito tem limites diários por modelo compartilhados por todos os usuários.

## Limites conhecidos

- O navegador carrega vendas dos últimos 400 dias para gráficos e listas; as estatísticas de cliente usam o histórico completo (RPC `customer_stats`).
- Convite de funcionários, envio automático de WhatsApp/e-mail, cobrança e exclusão de conta pelo próprio usuário ainda não existem.
- Nenhuma barreira de IA é perfeita: a Ipê reduz muito, mas não zera, o risco de respostas fora do escopo.
