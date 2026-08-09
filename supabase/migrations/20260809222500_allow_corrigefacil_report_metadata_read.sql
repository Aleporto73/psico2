-- Hotfix Relatório Pró / CorrigeFácil.
-- O endpoint autenticado consegue ler assessments/assessment_results do próprio
-- usuário, mas os embeds instruments/scales eram filtrados pelo RLS e faziam
-- a avaliação parecer inexistente. Liberamos somente as colunas necessárias
-- ao relatório e apenas para quem possui CorrigeFácil + Relatório Pró ativos.

revoke select on table public.instruments from authenticated;
grant select (id, code, name, score_type)
  on table public.instruments to authenticated;

revoke select on table public.scales from authenticated;
grant select (id, code, name, kind, ordinal)
  on table public.scales to authenticated;

drop policy if exists "corrigefacil_report_metadata_instruments" on public.instruments;
create policy "corrigefacil_report_metadata_instruments"
on public.instruments
for select
to authenticated
using (
  public.has_corrigefacil_access(auth.uid())
  and public.has_active_assistant(auth.uid())
);

drop policy if exists "corrigefacil_report_metadata_scales" on public.scales;
create policy "corrigefacil_report_metadata_scales"
on public.scales
for select
to authenticated
using (
  public.has_corrigefacil_access(auth.uid())
  and public.has_active_assistant(auth.uid())
);
