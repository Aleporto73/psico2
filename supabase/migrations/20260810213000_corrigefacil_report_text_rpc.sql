-- ==========================================
-- EDICAO DA NARRATIVA DO RELATORIO PRO / CORRIGEFACIL
-- Created: 2026-08-10
-- ==========================================
-- O profissional revisa a REDACAO de um relatorio ja gerado. Nao gera IA,
-- nao consome cota, nao cria linha nova.
--
-- POR QUE UMA RPC E NAO UMA POLICY DE UPDATE
--
-- `ai_reports` hoje tem policies de ALL (admin), INSERT e SELECT do proprio
-- usuario, e NENHUMA de UPDATE. Mas os grants de tabela concedem UPDATE a
-- authenticated. Criar uma policy "Users can update own ai_reports"
-- destrancaria a linha INTEIRA: o cliente passaria a poder reescrever
-- report_type, title, input_text, created_at e ate
-- corrigefacil_assessment_id — reapontando um relatorio para outra
-- avaliacao. A policy protegeria a POSSE e liberaria o CONTEUDO.
--
-- Esta funcao troca isso por uma superficie estreita: um unico UPDATE, uma
-- unica coluna, tres condicoes de identidade. Nenhuma policy nova e criada
-- e nenhum grant existente e revogado.
--
-- O AVISO ETICO E ANEXADO AQUI, no banco, e nao no navegador. Se dependesse
-- do frontend, uma chamada direta a RPC salvaria relatorio profissional sem
-- a ressalva obrigatoria. O texto e o mesmo de
-- src/lib/report/ethical-disclaimer.ts.
-- ==========================================

create or replace function public.update_corrigefacil_report_text(
  report_uuid     uuid,
  assessment_uuid uuid,
  new_narrative   text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aviso     constant text := 'Observação: este texto é um rascunho de apoio operacional elaborado a partir dos dados fornecidos. Ele deve ser revisado, complementado e validado pelo profissional responsável. Não substitui avaliação clínica, manual técnico, aplicação padronizada, teste original ou interpretação profissional.';
  v_narrativa text;
  v_final     text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  v_narrativa := btrim(coalesce(new_narrative, ''));

  if v_narrativa = '' then
    raise exception 'narrativa vazia';
  end if;

  -- Teto de sanidade. O relatorio mais longo do produto fica MUITO abaixo
  -- disso; o limite existe para uma chamada direta nao gravar um texto
  -- arbitrariamente grande na coluna.
  if length(v_narrativa) > 30000 then
    raise exception 'narrativa excede o limite de 30000 caracteres';
  end if;

  -- A narrativa chega SEM o aviso. Se vier com ele — cliente antigo, colagem
  -- do texto inteiro de volta no editor —, remove-se antes de reanexar, para
  -- o documento nao terminar com o paragrafo duplicado.
  if position(v_aviso in v_narrativa) > 0 then
    v_narrativa := btrim(replace(v_narrativa, v_aviso, ''));
    if v_narrativa = '' then
      raise exception 'narrativa vazia';
    end if;
  end if;

  v_final := v_narrativa || E'\n\n' || v_aviso;

  -- As TRES condicoes: relatorio certo, dono certo, avaliacao certa. A
  -- terceira nao e redundante — sem ela, o dono de dois relatorios poderia
  -- gravar o texto de um sob o id do outro.
  --
  -- `set output_text` e SO isso: created_at, report_type, title, input_text
  -- e corrigefacil_assessment_id ficam como estao.
  update public.ai_reports
     set output_text = v_final
   where id = report_uuid
     and user_id = auth.uid()
     and corrigefacil_assessment_id = assessment_uuid;

  if not found then
    -- Mesma mensagem para inexistente, de outro dono e de outra avaliacao:
    -- distinguir confirmaria a existencia de um registro alheio.
    raise exception 'relatório não encontrado';
  end if;

  -- Devolve o que FICOU gravado. A tela redesenha com isso, e nao com o que
  -- ela achava que tinha mandado.
  return v_final;
end;
$$;

comment on function public.update_corrigefacil_report_text(uuid, uuid, text) is
  'Atualiza SOMENTE ai_reports.output_text do relatório do próprio usuário, vinculado à avaliação informada, reanexando o aviso ético obrigatório. Não substitui policy: não existe UPDATE de usuário em ai_reports.';

revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from public;
revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from anon;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to authenticated;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to service_role;
