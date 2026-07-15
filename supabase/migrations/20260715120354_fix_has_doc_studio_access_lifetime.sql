-- ============================================================
-- Fix — has_doc_studio_access deve liberar a base vitalícia
-- Created: 2026-07-15
-- ============================================================
-- Problema:
--   A migration 20260710170000 criou public.has_doc_studio_access(uuid)
--   liberando acesso APENAS para admin ativo OU compra paid/manual do
--   produto psicoplanilhas-doc-studio. Faltou o caminho has_lifetime_access.
--
--   Decisão de produto: o Doc Studio passa a ser INCLUSO para toda a base
--   vitalícia (quem tem has_lifetime_access). Esse ramo já foi aplicado
--   direto em produção (Supabase), mas não estava versionado no repo — o
--   banco e o código ficaram dessincronizados. Esta migration versiona o
--   estado real de produção.
--
-- Correção:
--   Recria has_doc_studio_access idêntica, SÓ adicionando o ramo
--   public.has_lifetime_access(user_uuid) como PRIMEIRO caminho de acesso,
--   espelhando exatamente a função que já roda em produção. Corpo restante,
--   search_path, SECURITY DEFINER e grants permanecem os mesmos. Seguro: a
--   função só recebe um uuid e devolve um booleano para aquele usuário.
--
--   NÃO toca em: frontend, admin, RLS de products, pagamento, view
--   user_access_status (a coluna has_doc_studio_access dela chama esta
--   função, então passa a refletir o novo ramo automaticamente).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- has_doc_studio_access(user_uuid uuid) — inclui base vitalícia
-- ------------------------------------------------------------
-- Retorna true quando:
--   - o usuário tem acesso vitalício (has_lifetime_access); OU
--   - o usuário é admin ativo; OU
--   - possui compra paid/manual do produto psicoplanilhas-doc-studio.
create or replace function public.has_doc_studio_access(user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_lifetime_access(user_uuid)
    or exists (
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
-- Reemite grants explícitos (padrão de hardening 2026-06-10)
-- ------------------------------------------------------------
revoke all on function public.has_doc_studio_access(uuid) from public;
revoke all on function public.has_doc_studio_access(uuid) from anon;
grant execute on function public.has_doc_studio_access(uuid) to authenticated;
grant execute on function public.has_doc_studio_access(uuid) to service_role;

commit;
