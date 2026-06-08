-- ============================================================
-- Patch A1 — Public products view + secure spreadsheets RPC
-- Created: 2026-06-08
-- ============================================================
-- Objetivo:
--   Permitir que /app/produtos liste o catálogo SEM expor o campo
--   sensível products.access_url, e que /app/planilhas só receba
--   access_url quando o usuário tiver acesso vitalício confirmado.
--
-- Estratégia (defesa em camadas, sem janela de quebra):
--   1. Criar a view sanitizada public.products_public (sem
--      access_url) — fonte única de leitura pública.
--   2. Criar a RPC public.get_my_spreadsheets() (SECURITY DEFINER)
--      que devolve access_url APENAS para has_lifetime_access = true.
--   3. NÃO dropar a policy antiga "Anyone can read active products"
--      nesta migration — isso é feito manualmente em A2 depois do
--      deploy do frontend novo, para evitar janela onde a UI antiga
--      ficaria quebrada antes do bundle novo subir.
--
-- Preservado:
--   - Admins continuam com SELECT total via "Admins have full access
--     on products" (não tocada).
--   - service_role (createAdminClient) continua bypassando RLS —
--     webhooks, /api/asaas/*, /api/admin/*, checkout, cadastro manual
--     e IA Pro seguem funcionando exatamente como antes.
--   - user_access_status, has_lifetime_access e has_active_assistant
--     não são tocadas.
-- ============================================================

-- ------------------------------------------------------------
-- 1) View pública SEM access_url
-- ------------------------------------------------------------
-- security_invoker = false: a view roda com privilégios do dono e
-- ignora a RLS de products; o acesso é controlado pelo GRANT abaixo
-- e pelo filtro is_active = true.
drop view if exists public.products_public;

create view public.products_public
with (security_invoker = false) as
select
  id,
  name,
  slug,
  type,
  audience,
  category,
  description,
  image_url,
  tutorial_url,
  video_url,
  checkout_url,
  price,
  billing_type,
  is_active,
  sort_order,
  created_at,
  updated_at
from public.products
where is_active = true;

grant select on public.products_public to anon, authenticated;

-- ------------------------------------------------------------
-- 2) RPC segura para listar as planilhas do usuário vitalício
-- ------------------------------------------------------------
-- SECURITY DEFINER: roda como dono (postgres) e consulta products
-- livre de RLS, mas SÓ retorna linhas quando:
--   - auth.uid() não é null; e
--   - public.has_lifetime_access(auth.uid()) = true.
-- Sem acesso vitalício => conjunto vazio (não lança erro).
create or replace function public.get_my_spreadsheets()
returns table (
  id uuid,
  name text,
  slug text,
  category text,
  description text,
  image_url text,
  access_url text,
  tutorial_url text,
  video_url text,
  sort_order integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if not public.has_lifetime_access(auth.uid()) then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.slug,
    p.category,
    p.description,
    p.image_url,
    p.access_url,
    p.tutorial_url,
    p.video_url,
    p.sort_order
  from public.products p
  where p.type = 'spreadsheet'
    and p.is_active = true
  order by p.sort_order asc nulls last, p.name asc;
end;
$$;

-- Apenas usuários autenticados podem invocar a RPC.
revoke all on function public.get_my_spreadsheets() from public;
revoke all on function public.get_my_spreadsheets() from anon;
grant execute on function public.get_my_spreadsheets() to authenticated;

-- ============================================================
-- NÃO dropar aqui a policy "Anyone can read active products".
-- Ver: docs/sql/manual_close_products_access_url_policy_after_deploy.sql
-- Rodar APÓS o deploy do frontend novo e dos testes em /app/*.
-- ============================================================
