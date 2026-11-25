-- AI Business Manager · esquema consolidado (estado aplicado no projeto Supabase em 25/11/2026).
-- Equivale às migrações: core_schema, security_functions_rls, private_helpers, fix_audit_row, ai_quota, customer_stats_rpc.
-- Para um projeto novo: supabase db push (ou cole no SQL Editor). Não rode de novo num banco que já tem o esquema.

-- ============ TABELAS ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  document text not null default '' check (char_length(document) <= 20),
  plan text not null default 'free' check (plan in ('free')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','employee')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index on public.organization_members(user_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  sku text not null default '' check (char_length(sku) <= 24),
  category text not null default '' check (char_length(category) <= 40),
  price numeric(12,2) not null check (price > 0 and price < 1000000),
  cost numeric(12,2) check (cost is null or (cost >= 0 and cost < 1000000)),
  stock integer not null default 0 check (stock >= 0 and stock <= 10000000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.products(organization_id);
create unique index products_sku_unique on public.products(organization_id, sku) where sku <> '';

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  email text not null default '' check (char_length(email) <= 120 and (email = '' or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  phone text not null default '' check (char_length(phone) <= 20 and phone ~ '^[0-9 ()+\-]*$'),
  origin text not null default 'Outro' check (origin in ('Instagram','WhatsApp','Indicação','Google','Loja física','Outro')),
  stage text not null default 'lead' check (stage in ('lead','potencial')),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index on public.customers(organization_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null check (status in ('pago','pendente','cancelado')),
  sold_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index on public.sales(organization_id, sold_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0 and qty <= 100000),
  price numeric(12,2) not null check (price >= 0)
);
create index on public.sale_items(sale_id);
create index on public.sale_items(organization_id);
create index on public.sale_items(product_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null default 'manual' check (kind in ('reactivation','leads','ia','manual')),
  name text not null check (char_length(name) between 2 and 80),
  objective text not null default '' check (char_length(objective) <= 200),
  channel text not null default 'WhatsApp' check (channel in ('WhatsApp','E-mail','Instagram')),
  status text not null default 'rascunho' check (status in ('rascunho','aprovada')),
  message text not null check (char_length(message) between 1 and 1200),
  audience uuid[] not null default '{}' check (cardinality(audience) <= 5000),
  origin text not null default 'manual' check (origin in ('manual','automação','IA')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.campaigns(organization_id);

create table public.automations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null check (key in ('a1','a2','a3')),
  enabled boolean not null default true,
  last_run timestamptz,
  last_result text not null default '' check (char_length(last_result) <= 200),
  primary key (organization_id, key)
);

create table public.ai_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  answered integer not null default 0,
  blocked integer not null default 0,
  last_at timestamptz not null default now(),
  primary key (organization_id, user_id, day)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor uuid,
  action text not null check (char_length(action) <= 40),
  entity text not null check (char_length(entity) <= 40),
  entity_id uuid,
  detail text not null default '' check (char_length(detail) <= 400),
  created_at timestamptz not null default now()
);
create index on public.audit_logs(organization_id, created_at desc);

-- ============ FUNÇÕES INTERNAS (schema private, fora da API) ============
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org and m.user_id = (select auth.uid()));
$$;

create or replace function private.has_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = any(roles));
$$;

-- impede mover um registro para outra empresa
create or replace function private.prevent_org_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Não é permitido mudar a empresa de um registro.' using errcode = '42501';
  end if;
  return new;
end $$;

-- limite de registros por empresa no plano gratuito (contra abuso e spam)
create or replace function private.enforce_quota()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer; lim integer := tg_argv[0]::integer;
begin
  execute format('select count(*) from public.%I where organization_id = $1', tg_table_name) into n using new.organization_id;
  if n >= lim then
    raise exception 'Limite do plano gratuito atingido para %.', tg_table_name using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- auditoria de toda alteração importante
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare j jsonb;
begin
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;
  insert into public.audit_logs(organization_id, actor, action, entity, entity_id)
  values (case when tg_table_name = 'organizations' then (j->>'id')::uuid else (j->>'organization_id')::uuid end,
          (select auth.uid()), lower(tg_op), tg_table_name,
          case when j ? 'id' then (j->>'id')::uuid else null end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['products','customers','sales','sale_items','campaigns','automations'] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.prevent_org_change()', 'no_org_change_'||t, t);
  end loop;
  foreach t in array array['organizations','organization_members','products','customers','sales','campaigns'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_row()', 'audit_'||t, t);
  end loop;
end $$;

create trigger quota_products before insert on public.products for each row execute function private.enforce_quota('2000');
create trigger quota_customers before insert on public.customers for each row execute function private.enforce_quota('10000');
create trigger quota_campaigns before insert on public.campaigns for each row execute function private.enforce_quota('300');
create trigger quota_sales before insert on public.sales for each row execute function private.enforce_quota('50000');
create trigger products_updated before update on public.products for each row execute function private.touch_updated_at();

-- ============ OPERAÇÕES SENSÍVEIS (só via funções) ============
create or replace function public.create_organization(p_name text, p_document text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); org uuid; owned integer;
begin
  if uid is null then raise exception 'Faça login primeiro.' using errcode = '42501'; end if;
  select count(*) into owned from public.organization_members where user_id = uid and role = 'owner';
  if owned >= 3 then raise exception 'Limite de 3 empresas por conta.' using errcode = 'P0001'; end if;
  insert into public.organizations(name, document, created_by) values (trim(p_name), coalesce(trim(p_document),''), uid) returning id into org;
  insert into public.organization_members(organization_id, user_id, role) values (org, uid, 'owner');
  insert into public.automations(organization_id, key, enabled) values (org,'a1',true),(org,'a2',true),(org,'a3',false);
  return org;
end $$;

create or replace function public.create_sale(p_org uuid, p_customer uuid, p_status text, p_sold_at timestamptz, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); sid uuid; it jsonb; pid uuid; q integer; p record; n integer;
begin
  if uid is null or not private.is_member(p_org) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_status not in ('pago','pendente') then raise exception 'Status inválido.' using errcode = '22023'; end if;
  if p_sold_at > now() + interval '1 day' or p_sold_at < timestamptz '2000-01-01' then raise exception 'Data inválida.' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Itens inválidos.' using errcode = '22023'; end if;
  n := jsonb_array_length(p_items);
  if n < 1 or n > 50 then raise exception 'A venda precisa ter de 1 a 50 itens.' using errcode = '22023'; end if;
  if p_customer is not null and not exists (select 1 from public.customers c where c.id = p_customer and c.organization_id = p_org) then
    raise exception 'Cliente não encontrado.' using errcode = '22023';
  end if;
  insert into public.sales(organization_id, customer_id, status, sold_at, created_by) values (p_org, p_customer, p_status, p_sold_at, uid) returning id into sid;
  for it in select * from jsonb_array_elements(p_items) loop
    pid := (it->>'product_id')::uuid; q := (it->>'qty')::integer;
    if q is null or q < 1 or q > 100000 then raise exception 'Quantidade inválida.' using errcode = '22023'; end if;
    select id, name, price, stock, active into p from public.products where id = pid and organization_id = p_org for update;
    if not found or not p.active then raise exception 'Produto não encontrado ou inativo.' using errcode = '22023'; end if;
    if p.stock < q then raise exception 'Estoque insuficiente de %: % disponível(is).', p.name, p.stock using errcode = 'P0001'; end if;
    update public.products set stock = stock - q where id = pid;
    insert into public.sale_items(sale_id, organization_id, product_id, qty, price) values (sid, p_org, pid, q, p.price);
  end loop;
  return sid;
end $$;

create or replace function public.set_sale_status(p_sale uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  select * into s from public.sales where id = p_sale for update;
  if not found or not private.is_member(s.organization_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if s.status = 'cancelado' then raise exception 'Venda já cancelada.' using errcode = 'P0001'; end if;
  if p_status = 'pago' and s.status = 'pendente' then
    update public.sales set status = 'pago' where id = p_sale;
  elsif p_status = 'cancelado' then
    update public.products p set stock = p.stock + i.qty from public.sale_items i where i.sale_id = p_sale and p.id = i.product_id;
    update public.sales set status = 'cancelado' where id = p_sale;
  else
    raise exception 'Mudança de status inválida.' using errcode = '22023';
  end if;
end $$;

create or replace function public.log_ai_action(p_org uuid, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_org) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  insert into public.audit_logs(organization_id, actor, action, entity, detail)
  values (p_org, (select auth.uid()), 'ia_acao', 'ipe', left(coalesce(p_text,''), 400));
end $$;

-- estatísticas por cliente sobre todo o histórico; SECURITY INVOKER: o RLS continua valendo
create or replace function public.customer_stats(p_org uuid)
returns table(customer_id uuid, total numeric, purchases integer, last_sale_at timestamptz, last_product text)
language sql stable security invoker set search_path = ''
as $$
  with paid as (
    select s.id, s.customer_id, s.sold_at, sum(i.qty * i.price) as total
    from public.sales s
    join public.sale_items i on i.sale_id = s.id
    where s.organization_id = p_org and s.status = 'pago' and s.customer_id is not null
    group by s.id
  ), last_sale as (
    select distinct on (p.customer_id) p.customer_id, p.id as sale_id
    from paid p order by p.customer_id, p.sold_at desc
  )
  select p.customer_id, sum(p.total), count(*)::integer, max(p.sold_at),
         (select pr.name from public.sale_items si join public.products pr on pr.id = si.product_id
           where si.sale_id = l.sale_id order by si.qty desc limit 1)
  from paid p join last_sale l on l.customer_id = p.customer_id
  group by p.customer_id, l.sale_id;
$$;

-- controle de uso da Ipê: só a Edge Function (service_role) chama
create or replace function public.ai_begin(p_org uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date; u record; org_total integer;
begin
  if not exists (select 1 from public.organization_members where organization_id = p_org and user_id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'sem_permissao');
  end if;
  select * into u from public.ai_usage where organization_id = p_org and user_id = p_user and day = d for update;
  if found then
    if u.blocked >= 15 then return jsonb_build_object('ok', false, 'reason', 'bloqueio_abuso'); end if;
    if u.answered >= 60 then return jsonb_build_object('ok', false, 'reason', 'limite_usuario'); end if;
    if u.last_at > now() - interval '3 seconds' then return jsonb_build_object('ok', false, 'reason', 'muito_rapido'); end if;
  end if;
  select coalesce(sum(answered), 0) into org_total from public.ai_usage where organization_id = p_org and day = d;
  if org_total >= 200 then return jsonb_build_object('ok', false, 'reason', 'limite_empresa'); end if;
  insert into public.ai_usage(organization_id, user_id, day, answered, blocked, last_at)
  values (p_org, p_user, d, 1, 0, now())
  on conflict (organization_id, user_id, day) do update set answered = public.ai_usage.answered + 1, last_at = now();
  return jsonb_build_object('ok', true, 'remaining', 60 - coalesce(u.answered, 0) - 1);
end $$;

create or replace function public.ai_mark_blocked(p_org uuid, p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.ai_usage set blocked = blocked + 1 where organization_id = p_org and user_id = p_user and day = d;
  insert into public.audit_logs(organization_id, actor, action, entity, detail)
  values (p_org, p_user, 'ia_bloqueio', 'ipe', left(coalesce(p_reason, ''), 60));
end $$;

-- ============ RLS: TODA TABELA FECHADA POR PADRÃO ============
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.campaigns enable row level security;
alter table public.automations enable row level security;
alter table public.ai_usage enable row level security;
alter table public.audit_logs enable row level security;

create policy org_read on public.organizations for select to authenticated using (private.is_member(id));
create policy org_update on public.organizations for update to authenticated using (private.has_role(id, array['owner','admin'])) with check (private.has_role(id, array['owner','admin']));
create policy members_read on public.organization_members for select to authenticated using (private.is_member(organization_id));

create policy products_read on public.products for select to authenticated using (private.is_member(organization_id));
create policy products_insert on public.products for insert to authenticated with check (private.is_member(organization_id));
create policy products_update on public.products for update to authenticated using (private.is_member(organization_id)) with check (private.is_member(organization_id));
create policy products_delete on public.products for delete to authenticated using (private.has_role(organization_id, array['owner','admin']));

create policy customers_read on public.customers for select to authenticated using (private.is_member(organization_id));
create policy customers_insert on public.customers for insert to authenticated with check (private.is_member(organization_id));
create policy customers_update on public.customers for update to authenticated using (private.is_member(organization_id)) with check (private.is_member(organization_id));
create policy customers_delete on public.customers for delete to authenticated using (private.has_role(organization_id, array['owner','admin']));

create policy sales_read on public.sales for select to authenticated using (private.is_member(organization_id));
create policy sale_items_read on public.sale_items for select to authenticated using (private.is_member(organization_id));

create policy campaigns_read on public.campaigns for select to authenticated using (private.is_member(organization_id));
create policy campaigns_insert on public.campaigns for insert to authenticated with check (private.is_member(organization_id));
create policy campaigns_update on public.campaigns for update to authenticated using (private.is_member(organization_id)) with check (private.is_member(organization_id));
create policy campaigns_delete on public.campaigns for delete to authenticated using (private.has_role(organization_id, array['owner','admin']));

create policy automations_read on public.automations for select to authenticated using (private.is_member(organization_id));
create policy automations_update on public.automations for update to authenticated using (private.is_member(organization_id)) with check (private.is_member(organization_id));

create policy ai_usage_read on public.ai_usage for select to authenticated using (private.is_member(organization_id));
create policy audit_read on public.audit_logs for select to authenticated using (private.has_role(organization_id, array['owner','admin']));

-- ============ PRIVILÉGIOS MÍNIMOS ============
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_member(uuid), private.has_role(uuid, text[]) to authenticated;
grant execute on function public.create_organization(text, text), public.create_sale(uuid, uuid, text, timestamptz, jsonb),
  public.set_sale_status(uuid, text), public.log_ai_action(uuid, text), public.customer_stats(uuid) to authenticated;
revoke execute on function public.ai_begin(uuid, uuid), public.ai_mark_blocked(uuid, uuid, text) from authenticated;
grant execute on function public.ai_begin(uuid, uuid), public.ai_mark_blocked(uuid, uuid, text) to service_role;
revoke insert, update, delete on public.sales, public.sale_items, public.audit_logs, public.ai_usage, public.organization_members from authenticated;
revoke insert, delete on public.organizations, public.automations from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
