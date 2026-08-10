-- ==========================================
-- CLINICA SEPARADA DO PROFISSIONAL NO PERFIL PARA RELATORIOS
-- Created: 2026-08-10
-- ==========================================
-- `display_name` nasceu ambiguo: o proprio comentario dele dizia "(pessoa ou
-- clinica)", e a tela pedia "Pode ser seu nome ou o nome fantasia da clinica".
-- Um campo so para os dois papeis obriga a escolher um e perder o outro — quem
-- escreve a clinica fica sem nome na assinatura, e vice-versa.
--
-- Esta migration separa os dois. Ela e SOMENTE cadastral: nenhum documento
-- passa a consumir `clinic_name` neste bloco.
--
-- Convencoes seguidas do schema existente (20260602000000_initial_schema e
-- 20260626000000_add_profissional_fields_to_profiles):
--   - Coluna em public.profiles, text null, sem default.
--   - RLS ja coberto pela policy "Users can update non-role fields of own
--     profile", que e de LINHA (`for update using (auth.uid() = id)`) e nao de
--     coluna: ela alcanca qualquer campo novo e so protege `role`. Nenhuma
--     migration posterior a redefiniu, e nao ha grant/revoke por coluna em
--     profiles. Portanto NAO e necessaria policy nova.
--
-- SEM BACKFILL, de proposito. Copiar `display_name` para `clinic_name` exigiria
-- saber se cada valor historico e uma pessoa ou um estabelecimento, e nao ha
-- como saber: os dois foram gravados no mesmo campo, com a mesma semantica, sem
-- marcador. Qualquer backfill seria chute, e chute em nome que vai impresso em
-- documento profissional e pior do que campo vazio. Perfil antigo continua com
-- `clinic_name` nulo ate que a pessoa preencha.
-- ==========================================

alter table public.profiles
  add column if not exists clinic_name text;

comment on column public.profiles.clinic_name is
  'Nome fantasia / nome da clinica ou consultorio usado na identificacao documental do profissional. Opcional.';

-- O comentario antigo dizia "(pessoa ou clinica)" e era a origem da ambiguidade.
comment on column public.profiles.display_name is
  'Nome de exibicao do profissional responsavel no cabecalho dos relatorios. O nome do estabelecimento fica em clinic_name.';
