-- ============================================================
-- Patch A3 — Manual access functions close-out: admin ativo
-- ============================================================
-- Este arquivo NÃO é uma migration.
-- NÃO é rodado por `supabase db push`.
--
-- Objetivo:
--   Registrar o SQL aplicado manualmente no SQL Editor do Supabase
--   após o fechamento do vazamento de products.access_url.
--
-- Contexto:
--   As funções originais liberavam acesso apenas por compra/assinatura.
--   Em produção, foi necessário permitir que admin ativo também tenha:
--
--     1. acesso vitalício às planilhas;
--     2. acesso ativo ao Assistente IA Pro.
--
-- Uso:
--   Este arquivo serve como documentação e SQL de recuperação manual.
--   Só deve ser executado manualmente no SQL Editor do Supabase se for
--   necessário reaplicar o estado atual do banco de produção.
--
-- NÃO rodar:
--   npx supabase db push
--
-- ============================================================

-- ------------------------------------------------------------
-- 1) public.has_lifetime_access(user_uuid uuid)
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário é admin ativo; OU
--   - possui compra paid/manual do produto psicoplanilhas-vitalicio.
create or replace function public.has_lifetime_access(user_uuid uuid)
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
        and p.slug = 'psicoplanilhas-vitalicio'
        and pu.payment_status in ('paid', 'manual')
    );
$$;

-- ------------------------------------------------------------
-- 2) public.has_active_assistant(user_uuid uuid)
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário é admin ativo; OU
--   - possui assinatura active/manual do produto assistente-ia-pro
--     com expires_at maior ou igual ao momento atual.
create or replace function public.has_active_assistant(user_uuid uuid)
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
      from public.subscriptions s
      join public.products p on p.id = s.product_id
      where s.user_id = user_uuid
        and p.slug = 'assistente-ia-pro'
        and s.status in ('active', 'manual')
        and s.expires_at >= now()
    );
$$;
