-- ==========================================
-- METADADOS DO RELATÓRIO PRÓ PASSAM A SEGUIR O GATE POR INSTRUMENTO
-- Created: 2026-08-17
-- ==========================================
-- INCIDENTE. Usuário com Relatórios Pró ATIVO e sem o CorrigeFácil completo
-- aplica o FDT gratuito, salva a avaliação, abre e pede o relatório. A UI
-- responde "Avaliação salva não encontrada" — e a avaliação existe.
--
-- CAUSA. `generateCorrigeFacilReport` lê, com o client do USUÁRIO:
--
--   assessments        ... instruments!inner(code, name)
--   assessment_results ... scales!inner(code, name, ordinal)
--
-- As duas policies de metadados nasceram em 20260809222500, antes de existir
-- instrumento gratuito, e exigem o produto INTEIRO:
--
--   has_corrigefacil_access(auth.uid()) and has_active_assistant(auth.uid())
--
-- Com `has_corrigefacil_access = false`, a RLS esconde a linha do FDT. O
-- embed é `!inner`, então a linha PAI desaparece junto e o PostgREST devolve
-- zero linhas. O backend lê isso como avaliação inexistente e responde a
-- mensagem errada. Reproduzido em produção, com o uid do incidente:
--
--   instruments visíveis = 0
--   scales visíveis      = 0
--   can_access_corrigefacil_instrument(uid,'FDT') = true
--   has_active_assistant(uid)                     = true
--
-- CORREÇÃO. Trocar o gate DO PRODUTO pelo gate POR INSTRUMENTO, que já
-- existe e já está em produção desde 20260817120000. A permissão de
-- Relatórios Pró continua exigida, e continua sendo `has_active_assistant`:
-- este arquivo NÃO libera relatório grátis para ninguém.
--
--   antes   has_corrigefacil_access(uid) and has_active_assistant(uid)
--   depois  has_active_assistant(uid) and can_access_..._instrument(uid, code)
--
-- O efeito é cirúrgico: quem tem Pró e direito legítimo AO INSTRUMENTO lê os
-- metadados DAQUELE instrumento. Quem não comprou o CorrigeFácil continua
-- sem enxergar PHQ-9, CONFIAS ou qualquer outro — a função só abre exceção
-- para instrumento ativo marcado `is_free_demo`, e hoje é só o FDT.
--
-- O QUE ESTE ARQUIVO NÃO FAZ:
--   - não altera `can_access_corrigefacil_instrument` nem `is_free_demo`;
--   - não altera `has_active_assistant`, e não a remove de lugar nenhum;
--   - não amplia grant: as colunas concedidas em 20260809222500 ficam como
--     estão, e nenhuma tabela de norma, item ou faixa é liberada;
--   - não implementa relatório gratuito. Isso é outro projeto.
-- ==========================================


-- ------------------------------------------------------------------
-- 1 · O HELPER DA ESCALA
-- ------------------------------------------------------------------
-- POR QUE UM HELPER, E NÃO UM `exists` DENTRO DA POLICY
--
-- A policy de `scales` precisa saber a QUAL instrumento a escala pertence, e
-- `scales` só guarda `instrument_id`. A forma óbvia seria um subselect em
-- `instruments` dentro da própria policy — e ela está errada.
--
-- Expressão de policy roda com os privilégios de quem consulta, então esse
-- subselect sofreria a RLS de `instruments`. Medido em produção, como
-- `authenticated` e com o uid do incidente:
--
--   exists (select 1 from public.instruments where code='FDT')  ->  false
--
-- Ou seja: a visibilidade da escala passaria a depender da policy da OUTRA
-- tabela. Funcionaria hoje por coincidência — as duas policies concordam —,
-- e quebraria em silêncio no dia em que alguém apertasse `instruments`. O
-- diagnóstico seria exatamente este incidente outra vez.
--
-- SECURITY DEFINER resolve pela raiz: a função roda como `postgres`, que é
-- dona das duas tabelas e não está sob `force row level security`, então ela
-- resolve escala -> instrumento sem RLS no meio. A policy de `scales` deixa
-- de depender da policy de `instruments`.
--
-- Superfície estreita, no padrão de `update_corrigefacil_report_text`: entra
-- id, sai booleano. A função NÃO devolve dado de escala, de instrumento nem
-- de norma — não há o que vazar por ela.
--
-- A REGRA continua num lugar só: quem decide é
-- `can_access_corrigefacil_instrument`. Este helper apenas descobre por qual
-- código perguntar.

create or replace function public.can_access_corrigefacil_scale(
  user_uuid  uuid,
  scale_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.scales      s
      join public.instruments i on i.id = s.instrument_id
     where s.id = scale_uuid
       and public.can_access_corrigefacil_instrument(user_uuid, i.code)
  );
$$;

comment on function public.can_access_corrigefacil_scale(uuid, uuid) is
  'Direito de LER os metadados de UMA escala, derivado do direito ao instrumento dela. Resolve scale -> instruments.code e delega a can_access_corrigefacil_instrument. Devolve apenas booleano: nenhum dado de escala, instrumento ou norma sai daqui. Existe para a policy de scales não depender da policy de instruments.';

-- Menor privilégio, igual às funções irmãs. `authenticated` porque a policy
-- é avaliada com esse papel; `service_role` para o servidor.
revoke all on function public.can_access_corrigefacil_scale(uuid, uuid) from public;
revoke all on function public.can_access_corrigefacil_scale(uuid, uuid) from anon;
grant execute on function public.can_access_corrigefacil_scale(uuid, uuid) to authenticated;
grant execute on function public.can_access_corrigefacil_scale(uuid, uuid) to service_role;


-- ------------------------------------------------------------------
-- 2 · AS DUAS POLICIES
-- ------------------------------------------------------------------
-- Mesmos nomes de 20260809222500: são as MESMAS policies, com o gate
-- atualizado. Recriá-las com nome novo deixaria as antigas vivas, e um
-- `or` implícito entre duas policies SELECT é exatamente como uma regra
-- revogada continua valendo.
--
-- `has_active_assistant` vem PRIMEIRO nas duas: é a condição mais barata e
-- a que recusa a maioria: quem não tem Relatórios Pró nem chega a resolver
-- instrumento.

drop policy if exists "corrigefacil_report_metadata_instruments" on public.instruments;
create policy "corrigefacil_report_metadata_instruments"
on public.instruments
for select
to authenticated
using (
  public.has_active_assistant(auth.uid())
  and public.can_access_corrigefacil_instrument(auth.uid(), code)
);

drop policy if exists "corrigefacil_report_metadata_scales" on public.scales;
create policy "corrigefacil_report_metadata_scales"
on public.scales
for select
to authenticated
using (
  public.has_active_assistant(auth.uid())
  and public.can_access_corrigefacil_scale(auth.uid(), id)
);


-- ------------------------------------------------------------------
-- 3 · OS GRANTS NÃO SÃO TOCADOS
-- ------------------------------------------------------------------
-- Deliberadamente não há `grant` de coluna aqui. As colunas concedidas em
-- 20260809222500 continuam sendo exatamente estas, e é tudo que o relatório
-- consome:
--
--   instruments  id, code, name, score_type
--   scales       id, code, name, kind, ordinal
--
-- Norma, faixa, item e conjunto de alternativas seguem sem SELECT para
-- `authenticated`, com ou sem Pró, com ou sem CorrigeFácil.
