-- ==========================================
-- NOTA FINAL DEIXA DE SER OBRIGATORIA
-- Created: 2026-08-11
-- ==========================================
-- Substitui `update_corrigefacil_report_text` (20260810213000), que
-- reanexava um aviso fixo a todo salvamento e o deduplicava. Aquele desenho
-- partia de um pressuposto que o produto abandonou: o de que o sistema
-- responde pelo fechamento do documento.
--
-- Quem assina o relatorio e o profissional. O sistema oferece uma nota
-- padrao prudente na geracao; manter, reescrever ou remover e decisao de
-- quem assina. Uma funcao que reinjeta texto no documento contra a vontade
-- do autor nao protege ninguem — so torna o documento menos dele.
--
-- A funcao passa a gravar EXATAMENTE o `new_narrative` recebido, depois das
-- validacoes. Nada e acrescentado, nada e removido.
--
-- O QUE NAO MUDA, e continua sendo o motivo de existir uma RPC no lugar de
-- uma policy: `ai_reports` tem grants de UPDATE para authenticated e
-- NENHUMA policy de UPDATE. Uma policy protegeria a posse e liberaria a
-- linha inteira — report_type, title, input_text, created_at e
-- corrigefacil_assessment_id, este ultimo reapontando o relatorio para
-- outra avaliacao. Aqui continua sendo uma coluna, com tres condicoes de
-- identidade.
--
-- CREATE OR REPLACE: a migration anterior ja foi aplicada em producao e
-- permanece no historico como o que de fato aconteceu.
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
  v_final text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  v_final := btrim(coalesce(new_narrative, ''));

  -- O corpo do relatorio nao pode sumir. A NOTA, essa sim, pode: quando o
  -- profissional a apaga, o texto que chega aqui simplesmente nao a contem,
  -- e nada a repoe.
  if v_final = '' then
    raise exception 'narrativa vazia';
  end if;

  -- Teto de sanidade. O relatorio mais longo do produto fica MUITO abaixo
  -- disso; o limite existe para uma chamada direta nao gravar um texto
  -- arbitrariamente grande na coluna.
  if length(v_final) > 30000 then
    raise exception 'narrativa excede o limite de 30000 caracteres';
  end if;

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
  'Atualiza SOMENTE ai_reports.output_text do relatório do próprio usuário, vinculado à avaliação informada. Grava exatamente o texto recebido: a nota de responsabilidade profissional é opcional e pertence ao autor do documento.';

revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from public;
revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from anon;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to authenticated;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to service_role;
