-- CorrigeFácil -> Relatório Pró, Bloco 2
-- Vincula opcionalmente um relatório de IA a uma avaliação CorrigeFácil.
-- Relação: 1 assessment -> N ai_reports.

alter table public.ai_reports
  add column corrigefacil_assessment_id uuid null
  references public.assessments(id)
  on delete set null;

create index idx_ai_reports_corrigefacil_assessment_id
  on public.ai_reports(corrigefacil_assessment_id);

-- Mantém o comportamento atual para relatórios tradicionais (FK nula),
-- mas impede que um usuário associe um relatório a assessment de outra conta.
drop policy if exists "Users can insert own ai_reports" on public.ai_reports;

create policy "Users can insert own ai_reports"
on public.ai_reports
for insert
with check (
  auth.uid() = user_id
  and public.has_active_assistant(auth.uid())
  and (
    corrigefacil_assessment_id is null
    or exists (
      select 1
      from public.assessments a
      where a.id = corrigefacil_assessment_id
        and a.user_id = auth.uid()
    )
  )
);
