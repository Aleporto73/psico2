-- ============================================================
-- Fix — has_flow_access deve ser SECURITY DEFINER
-- Created: 2026-07-01
-- ============================================================
-- Problema:
--   A migration 20260630141907 criou public.has_flow_access(uuid) como
--   SECURITY INVOKER (faltou o SECURITY DEFINER). Suas irmãs
--   has_lifetime_access e has_active_assistant SÃO SECURITY DEFINER.
--
--   A view user_access_status é security_invoker = true, então quando um
--   usuário comum a consulta, has_flow_access roda com o RLS DELE. O
--   EXISTS interno faz purchases JOIN products, e a única policy de SELECT
--   em products é is_admin(). Logo, um usuário não-admin enxerga 0 linhas
--   em products, o JOIN não casa, e has_flow_access retorna FALSE mesmo
--   para quem tem compra 'paid'/'manual' do Flow.
--
--   Sintoma: cliente liberado no admin ainda vê "Comprar por R$39,00" em
--   /app/flow; has_flow_access=false na área do cliente, true como
--   superuser. has_lifetime_access/has_active_assistant não sofrem porque
--   são DEFINER e ignoram o RLS de products.
--
-- Correção:
--   Recria has_flow_access idêntica, SÓ adicionando SECURITY DEFINER,
--   espelhando exatamente has_lifetime_access. Corpo, search_path e grants
--   permanecem os mesmos. Seguro: a função só recebe um uuid e devolve um
--   booleano para aquele usuário — mesma postura de segurança das outras
--   duas funções, que já são DEFINER e já são chamáveis.
--
--   NÃO toca em: frontend, admin, RLS de products, pagamento, token.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- has_flow_access(user_uuid uuid) — agora SECURITY DEFINER
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário é admin ativo; OU
--   - possui compra paid/manual do produto psicoplanilhas-flow.
-- Espelha exatamente has_lifetime_access (SECURITY DEFINER + search_path).
create or replace function public.has_flow_access(user_uuid uuid)
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
        and p.slug = 'psicoplanilhas-flow'
        and pu.payment_status in ('paid', 'manual')
    );
$$;

-- ------------------------------------------------------------
-- Reemite grants explícitos (padrão de hardening 2026-06-10)
-- ------------------------------------------------------------
revoke all on function public.has_flow_access(uuid) from public;
revoke all on function public.has_flow_access(uuid) from anon;
grant execute on function public.has_flow_access(uuid) to authenticated;
grant execute on function public.has_flow_access(uuid) to service_role;

commit;
