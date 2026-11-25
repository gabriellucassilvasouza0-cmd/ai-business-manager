// Ipê — IA de vendas do AI Business Manager (Supabase Edge Function).
// Camadas: origem permitida → método e tamanho → login (JWT) → validação do corpo →
// cota e anti-abuso no banco → regras fixas → classificador de assunto → dados só da empresa (RLS)
// → modelo principal com fallback → verificação da resposta → registro de bloqueios.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildSystemPrompt, REFUSAL, EMERGENCY } from './prompt.ts';
import { sanitize, heuristic, classify, groqChat, checkOutput } from './guards.ts';
import { buildSnapshot } from './snapshot.ts';

const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const ORIGIN_RX = /^https:\/\/(ai-business-manager|abm)[a-z0-9-]*\.vercel\.app$|^http:\/\/localhost:\d{2,5}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODELS: Record<string, string[]> = {
  rapida: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  equilibrada: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'],
  profunda: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'],
};
const GUARD_MODELS = ['llama-3.1-8b-instant', 'openai/gpt-oss-20b'];
const LIMIT_MSG: Record<string, string> = {
  limite_usuario: 'Você atingiu o limite de 60 perguntas por dia. Volte amanhã.',
  limite_empresa: 'Sua empresa atingiu o limite de 200 perguntas por dia. Volte amanhã.',
  muito_rapido: 'Espere alguns segundos entre uma pergunta e outra.',
  bloqueio_abuso: 'A Ipê foi pausada hoje nesta conta por muitas mensagens fora do escopo. Volte amanhã.',
  sem_permissao: 'Você não faz parte desta empresa.',
};

function headersFor(origin: string): Record<string, string> {
  const ok = !!origin && (ALLOWED.includes(origin) || ORIGIN_RX.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const H = headersFor(origin);
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: H });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  if (origin && H['Access-Control-Allow-Origin'] === 'null') return reply({ error: 'Origem não permitida.' }, 403);

  const raw = await req.text();
  if (raw.length > 40000) return reply({ error: 'Mensagem grande demais.' }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return reply({ error: 'Pedido inválido.' }, 400); }
  const org = String(body?.org ?? '');
  const mode = ['rapida', 'equilibrada', 'profunda'].includes(body?.mode) ? body.mode : 'equilibrada';
  if (!UUID.test(org)) return reply({ error: 'Empresa inválida.' }, 400);
  const msgs = (Array.isArray(body?.messages) ? body.messages : []).slice(-12)
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map((m: any) => ({ role: m.role, content: sanitize(m.content, m.role === 'user' ? 4000 : 6000) }))
    .filter((m: any) => m.content);
  if (!msgs.length || msgs.at(-1).role !== 'user') return reply({ error: 'Envie uma pergunta.' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userDb = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
  const { data: auth } = await userDb.auth.getUser();
  const user = auth?.user;
  if (!user) return reply({ error: 'Faça login de novo.' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const gate = await admin.rpc('ai_begin', { p_org: org, p_user: user.id });
  if (gate.error) return reply({ error: 'Não foi possível verificar seu limite agora.' }, 503);
  if (!gate.data?.ok) return reply({ error: LIMIT_MSG[gate.data?.reason] ?? 'Limite atingido.', limit: gate.data?.reason }, 429);
  const block = async (why: string) => { await admin.rpc('ai_mark_blocked', { p_org: org, p_user: user.id, p_reason: why }); return reply({ text: REFUSAL, guard: 'fora' }); };

  const last = msgs.at(-1).content;
  const h = heuristic(last);
  if (h === 'emergencia') return reply({ text: EMERGENCY, guard: 'emergencia' });
  if (h === 'injecao') return block('injecao_regra');

  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return reply({ error: 'A Ipê ainda não foi configurada: falta a chave do Groq no servidor.' }, 503);

  const verdict = await classify(key, GUARD_MODELS, msgs);
  if (verdict === 'emergencia') return reply({ text: EMERGENCY, guard: 'emergencia' });
  if (verdict !== 'negocio') return block(verdict + '_classificador');

  const snap = await buildSnapshot(userDb, org);
  if (!snap) return reply({ error: 'Você não faz parte desta empresa.' }, 403);

  let out: string;
  try {
    out = await groqChat(key, MODELS[mode], {
      temperature: 0.4, max_tokens: 1400,
      messages: [{ role: 'system', content: buildSystemPrompt(snap.orgName) + '\n\n' + snap.text }, ...msgs],
    });
  } catch (e) {
    const why = String((e as Error)?.message ?? '');
    return reply({ error: why === 'chave_invalida' ? 'A chave do Groq no servidor é inválida.' : 'A Ipê está sobrecarregada agora. Tente de novo em um minuto.' }, 503);
  }
  const checked = checkOutput(out);
  if (checked.blocked) return block(checked.reason ?? 'saida');
  return reply({ text: checked.text, remaining: gate.data?.remaining ?? null });
});
