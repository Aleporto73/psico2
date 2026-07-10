-- ============================================================
-- Produto + acesso — PsicoPlanilhas Doc Studio
-- Created: 2026-07-10
-- ============================================================
-- Objetivo:
--   Cadastrar o produto INTERNO "psicoplanilhas-doc-studio" (R$47,
--   pagamento único / acesso vitalício, ferramenta hospedada DENTRO do
--   Psico2 em /app/doc-studio) e criar a trava de acesso, espelhando o
--   padrão de produção do Flow (has_flow_access, já corrigido).
--
--   Cobre APENAS o banco:
--     A. UPSERT do produto no catálogo (idempotente).
--     B. has_doc_studio_access(uuid) — SECURITY DEFINER desde o início.
--        (Não repete o bug histórico do Flow, que nasceu sem DEFINER e
--         retornava false para quem tinha compra por causa da RLS de
--         products; ver 20260701142332.)
--     C. Grants explícitos (hardening 2026-06-10).
--     D. CREATE OR REPLACE da view user_access_status adicionando
--        has_doc_studio_access ao FINAL (preserva nome/tipo/ordem das
--        colunas existentes).
--
--   NÃO cria RPC de URL externa: o Doc Studio roda dentro do Psico2, a
--   trava é feita no Server Component da rota lendo user_access_status.
--   NÃO inventa checkout_url: fica null até o PaymentBeta fornecer a URL
--   real; o UPSERT NUNCA sobrescreve um checkout_url já cadastrado.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- A) Produto no catálogo
-- ------------------------------------------------------------
-- type = 'bundle': mesmo tipo do único outro produto INTERNO pago do
-- catálogo (psicoplanilhas-vitalicio). É um dos valores editáveis pelo
-- select do /admin/produtos; a vitrine só oculta type = 'spreadsheet'.
-- access_url é interno e estático (/app/doc-studio) — NÃO é exposto pela
-- view products_public. checkout_url é deliberadamente omitido (null).
insert into public.products
  (name, slug, type, audience, description, access_url, price, billing_type, is_active)
values
  (
    'PsicoPlanilhas Doc Studio',
    'psicoplanilhas-doc-studio',
    'bundle',
    'all',
    'Ferramenta para criação e personalização de documentos profissionais. Pagamento único com acesso vitalício.',
    '/app/doc-studio',
    47.00,
    'one_time',
    true
  )
on conflict (slug) do update set
  name          = excluded.name,
  type          = excluded.type,
  audience      = excluded.audience,
  description   = excluded.description,
  access_url    = excluded.access_url,
  price         = excluded.price,
  billing_type  = excluded.billing_type,
  is_active     = excluded.is_active;
  -- checkout_url NÃO entra no update: preserva uma URL de checkout futura
  -- já cadastrada manualmente.

-- ------------------------------------------------------------
-- B) has_doc_studio_access(user_uuid uuid)
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário é admin ativo; OU
--   - possui compra paid/manual do produto psicoplanilhas-doc-studio.
-- SECURITY DEFINER + search_path: roda como dono e ignora a RLS de
-- products (cuja única policy de SELECT é is_admin()), igual às irmãs
-- has_lifetime_access / has_active_assistant / has_flow_access.
create or replace function public.has_doc_studio_access(user_uuid uuid)
returns boolean
language sql
stable
security definer
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
        and p.slug = 'psicoplanilhas-doc-studio'
        and pu.payment_status in ('paid', 'manual')
    );
$$;

-- ------------------------------------------------------------
-- C) Hardening de grants (padrão 2026-06-10)
-- ------------------------------------------------------------
revoke all on function public.has_doc_studio_access(uuid) from public;
revoke all on function public.has_doc_studio_access(uuid) from anon;
grant execute on function public.has_doc_studio_access(uuid) to authenticated;
grant execute on function public.has_doc_studio_access(uuid) to service_role;

-- ------------------------------------------------------------
-- D) View user_access_status — adiciona has_doc_studio_access ao FINAL
-- ------------------------------------------------------------
-- CREATE OR REPLACE VIEW só permite ADICIONAR colunas no fim e exige que
-- as existentes mantenham nome/tipo/ordem idênticos. has_doc_studio_access
-- entra DEPOIS de has_flow_access. security_invoker = true preservado.
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
  public.has_flow_access(pr.id) as has_flow_access,
  public.has_doc_studio_access(pr.id) as has_doc_studio_access
from public.profiles pr;

commit;
