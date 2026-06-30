-- ============================================================
-- Etapa 1 — Adiciona o produto PsicoPlanilhas Flow
-- Created: 2026-06-30
-- ============================================================
-- Objetivo:
--   Preparar o Psico2 para reconhecer e liberar manualmente o
--   produto "psicoplanilhas-flow" (R$39, pagamento único / vitalício,
--   acesso por link externo a um app hospedado fora do Supabase).
--
--   Esta Etapa 1 cobre APENAS o banco:
--     A. INSERT do produto no catálogo.
--     B. Função has_flow_access(uuid) — espelha o padrão de produção
--        de has_lifetime_access (com bypass de admin ativo + search_path).
--     C. RPC get_flow_access_url() — entrega access_url só com acesso
--        confirmado, espelhando get_my_spreadsheets().
--     D. CREATE OR REPLACE da view user_access_status adicionando a
--        coluna has_flow_access ao FINAL (preserva colunas e grants).
--     E. REVOKE/GRANT explícitos (remove public/anon, libera
--        authenticated/service_role) seguindo o hardening de 2026-06-10.
--
--   NÃO toca em: Asaas, PaymentBeta, frontend, APIs, RLS de products
--   (a policy permissiva já foi removida manualmente em produção).
--
-- IMPORTANTE (placeholder):
--   access_url abaixo é um PLACEHOLDER seguro (example.com, reservado
--   por RFC 2606). O admin DEVE substituir pela URL real do app Flow
--   via /admin/produtos (rota já valida https?://) antes do lançamento.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- A) Produto no catálogo
-- ------------------------------------------------------------
-- on conflict (slug) do update: idempotente e seguro de reaplicar.
-- Atualiza apenas os campos comerciais; NÃO sobrescreve access_url se
-- já houver uma URL real cadastrada que NÃO seja o placeholder.
insert into public.products
  (name, slug, type, audience, description, access_url, price, billing_type, is_active)
values
  (
    'PsicoPlanilhas Flow',
    'psicoplanilhas-flow',
    'external_product',
    'all',
    'Acesso vitalício ao app PsicoPlanilhas Flow (ferramenta externa hospedada). Pagamento único.',
    'https://example.com/psicoplanilhas-flow-placeholder',
    39.00,
    'one_time',
    true
  )
on conflict (slug) do update set
  name          = excluded.name,
  type          = excluded.type,
  audience      = excluded.audience,
  description   = excluded.description,
  price         = excluded.price,
  billing_type  = excluded.billing_type,
  is_active     = excluded.is_active,
  access_url    = case
                    when public.products.access_url is null
                      or public.products.access_url = 'https://example.com/psicoplanilhas-flow-placeholder'
                    then excluded.access_url
                    else public.products.access_url
                  end;

-- ------------------------------------------------------------
-- B) has_flow_access(user_uuid uuid)
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário é admin ativo; OU
--   - possui compra paid/manual do produto psicoplanilhas-flow.
-- Espelha exatamente o padrão de produção de has_lifetime_access
-- (ver docs/sql/manual_admin_access_functions_after_deploy.sql).
create or replace function public.has_flow_access(user_uuid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles pr
      where pr.id = user_uuid
        and pr.role = 'admin'
        and pr.status = 'active'
    )
    or exists (
      select 1
      from public.purchases pu
      join public.products p on p.id = pu.product_id
      where pu.user_id = user_uuid
        and p.slug = 'psicoplanilhas-flow'
        and pu.payment_status in ('paid', 'manual')
    );
$$;

-- ------------------------------------------------------------
-- C) get_flow_access_url()
-- ------------------------------------------------------------
-- SECURITY DEFINER: roda como dono e consulta products livre de RLS,
-- mas SÓ devolve access_url quando:
--   - auth.uid() não é null; e
--   - has_flow_access(auth.uid()) = true.
-- Sem acesso => null (não lança erro). Espelha get_my_spreadsheets().
create or replace function public.get_flow_access_url()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if not public.has_flow_access(auth.uid()) then
    return null;
  end if;

  select p.access_url
    into v_url
  from public.products p
  where p.slug = 'psicoplanilhas-flow'
    and p.is_active = true
  limit 1;

  return v_url;
end;
$$;

-- ------------------------------------------------------------
-- D) View user_access_status — adiciona has_flow_access ao FINAL
-- ------------------------------------------------------------
-- CREATE OR REPLACE VIEW só permite ADICIONAR colunas no fim e exige
-- que as colunas existentes mantenham nome/tipo/ordem idênticos.
-- Por isso has_flow_access entra DEPOIS de assistant_expires_at.
-- security_invoker = true preservado; grants não são derrubados.
create or replace view public.user_access_status with (security_invoker = true) as
select
  pr.id as user_id,
  pr.name,
  pr.email,
  pr.profile_type,
  pr.status,
  pr.activation_status,
  pr.last_login_at,
  public.has_lifetime_access(pr.id) as has_lifetime_access,
  public.has_active_assistant(pr.id) as has_active_assistant,
  (
    select max(s.expires_at)
    from public.subscriptions s
    join public.products p on p.id = s.product_id
    where s.user_id = pr.id
      and p.slug = 'assistente-ia-pro'
  ) as assistant_expires_at,
  public.has_flow_access(pr.id) as has_flow_access
from public.profiles pr;

-- ------------------------------------------------------------
-- E) Hardening de grants (padrão 2026-06-10)
-- ------------------------------------------------------------
revoke all on function public.has_flow_access(uuid) from public;
revoke all on function public.has_flow_access(uuid) from anon;
grant execute on function public.has_flow_access(uuid) to authenticated;
grant execute on function public.has_flow_access(uuid) to service_role;

revoke all on function public.get_flow_access_url() from public;
revoke all on function public.get_flow_access_url() from anon;
grant execute on function public.get_flow_access_url() to authenticated;
grant execute on function public.get_flow_access_url() to service_role;

commit;
