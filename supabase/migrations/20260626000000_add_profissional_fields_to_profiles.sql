-- ==========================================
-- PERFIL PROFISSIONAL PARA RELATORIOS
-- Created: 2026-06-26
-- ==========================================
-- Adiciona campos do profissional usados no cabecalho fixo dos relatorios
-- gerados pelo Assistente de Relatorios IA. O cabecalho e renderizado em
-- React (fora do conteudo da IA); o cliente copia cabecalho + relatorio e
-- cola no Word como documento proprio, sem branding PsicoPlanilhas.
--
-- Convencoes seguidas do schema existente (20260602000000_initial_schema):
--   - Colunas em public.profiles, todas text null, sem default.
--   - RLS ja coberto pela policy "Users can update non-role fields of own
--     profile": o usuario atualiza os proprios campos e nenhum e 'role',
--     entao NAO e necessaria policy nova.
-- ==========================================

alter table public.profiles
  add column if not exists display_name        text,
  add column if not exists gender              text,
  add column if not exists profession_category text,
  add column if not exists credential_type     text,
  add column if not exists credential_number   text;

comment on column public.profiles.display_name        is 'Nome de exibicao no cabecalho dos relatorios (pessoa ou clinica).';
comment on column public.profiles.gender              is 'Genero para flexionar a profissao no cabecalho: M | F | N.';
comment on column public.profiles.profession_category is 'Categoria profissional (psicologo, psicopedagogo, fonoaudiologo, etc).';
comment on column public.profiles.credential_type     is 'Tipo de registro/credencial (crp, crfa, cbo_2394_25, abpp, etc).';
comment on column public.profiles.credential_number   is 'Numero livre do registro profissional.';
