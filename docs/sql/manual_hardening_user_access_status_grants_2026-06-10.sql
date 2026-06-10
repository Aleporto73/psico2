-- CHECKPOINT SQL — HARDENING DE GRANTS
-- Projeto: Psico2 / PsicoPlanilhas
-- Data: 2026-06-10
--
-- Objetivo:
-- Registrar alteração manual aplicada no Supabase SQL Editor para remover acesso anon/public
-- de funções de status e da view user_access_status.
--
-- Escopo:
-- Fora de Asaas.
-- Não altera produtos, pagamentos, checkout ou webhook.

begin;

revoke all on table public.user_access_status from anon;

revoke execute on function public.has_lifetime_access(uuid) from public;
revoke execute on function public.has_lifetime_access(uuid) from anon;
grant execute on function public.has_lifetime_access(uuid) to authenticated;
grant execute on function public.has_lifetime_access(uuid) to service_role;

revoke execute on function public.has_active_assistant(uuid) from public;
revoke execute on function public.has_active_assistant(uuid) from anon;
grant execute on function public.has_active_assistant(uuid) to authenticated;
grant execute on function public.has_active_assistant(uuid) to service_role;

revoke execute on function public.get_active_assistant_expires_at(uuid) from public;
revoke execute on function public.get_active_assistant_expires_at(uuid) from anon;
grant execute on function public.get_active_assistant_expires_at(uuid) to authenticated;
grant execute on function public.get_active_assistant_expires_at(uuid) to service_role;

commit;

-- Verificação executada após aplicação:
--
-- select
--   p.proname as function_name,
--   p.proacl as grants
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'has_lifetime_access',
--     'has_active_assistant',
--     'get_active_assistant_expires_at'
--   )
-- order by p.proname;
--
-- Resultado confirmado:
-- get_active_assistant_expires_at: postgres, authenticated, service_role
-- has_active_assistant: postgres, authenticated, service_role
-- has_lifetime_access: postgres, authenticated, service_role
--
-- select
--   c.relname as view_name,
--   c.relacl as grants
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname = 'user_access_status';
--
-- Resultado confirmado:
-- user_access_status: postgres, authenticated, service_role