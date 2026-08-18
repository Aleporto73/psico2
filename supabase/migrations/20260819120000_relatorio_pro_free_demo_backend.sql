-- ==========================================
-- RELATORIO PRO: BACKEND DA DEMONSTRACAO GRATUITA
-- Created: 2026-08-19
-- Depends on: 20260818120000_ai_reports_billing_origin.sql
--             20260817230000_corrigefacil_report_metadata_por_instrumento.sql
-- ==========================================
-- O PR2 criou a COLUNA e a TRAVA (billing_origin + indice unico parcial).
-- Este PR cria o CAMINHO: as tres RPCs que reservam, finalizam e devolvem a
-- unica demonstracao gratuita da conta, e o endurecimento de RLS que impede
-- qualquer outro caminho de criar uma.
--
-- NENHUMA UX. A capacidade nasce fechada e provada; a tela vem no PR4.
--
-- A ORDEM QUE O DESENHO INTEIRO EXISTE PARA GARANTIR
--
--   validar -> RESERVAR -> OpenAI -> FINALIZAR
--
-- Reservar DEPOIS da IA seria reservar depois de ja ter gasto o dinheiro e,
-- pior, depois de o segundo clique tambem ter gasto. Reservar ANTES torna o
-- indice unico do PR2 a autoridade sobre quem pode chamar a IA.
--
-- POR QUE `generation_status` E NAO UMA TABELA DE RESERVAS
--
-- `output_text` e NOT NULL, entao a linha reservada precisa nascer com
-- algum conteudo — nasce com string vazia. O que diz que ela ainda nao e um
-- relatorio nao e o texto, e sim a COLUNA. Sem isso, seria preciso uma
-- magic string ('__PENDING__') que um dia vazaria para a tela.
--
-- Tres estados de mundo, e nada mais:
--   linha free_demo completed  -> chance usada, para sempre
--   linha free_demo pending    -> reserva em curso (ou orfa, ver TTL)
--   nenhuma linha free_demo    -> chance disponivel
--
-- Nao existem 'failed', 'cancelled' nem 'expired': falha sem entrega APAGA
-- a linha. Um estado a mais seria um estado a mais para consultar errado.
-- ==========================================

-- --------------------------------------------------------------
-- 1. O ESTADO DA LINHA
-- --------------------------------------------------------------
-- DEFAULT 'completed' de proposito: os 72 relatorios existentes e todo
-- INSERT do fluxo pago continuam corretos sem mencionar a coluna.

alter table public.ai_reports
  add column if not exists generation_status text not null default 'completed';

alter table public.ai_reports
  drop constraint if exists ai_reports_generation_status_check;

alter table public.ai_reports
  add constraint ai_reports_generation_status_check
  check (generation_status in ('pending', 'completed'));

comment on column public.ai_reports.generation_status is
  'Estado da linha. completed: relatório entregue ao usuário (todo fluxo pago nasce assim). pending: reserva da demonstração gratuita criada antes da chamada da IA, invisível ao usuário e apagada se a geração não entregar valor.';

-- --------------------------------------------------------------
-- 2. RLS: A RESERVA NAO EXISTE PARA O USUARIO
-- --------------------------------------------------------------
-- Sem isto, a linha pending apareceria no historico como um relatorio de
-- texto vazio — e, pior, contaria em qualquer contagem que o usuario faca.
-- O admin continua vendo tudo pela policy administrativa de ALL.

drop policy if exists "Users can read own ai_reports" on public.ai_reports;

create policy "Users can read own ai_reports"
on public.ai_reports
for select
using (
  auth.uid() = user_id
  and generation_status = 'completed'
);

-- --------------------------------------------------------------
-- 3. RLS: O CLIENTE NAO ESCOLHE A ORIGEM
-- --------------------------------------------------------------
-- Esta e a policy que fecha a porta dos fundos. Sem as duas linhas novas,
-- qualquer usuario com Relatorio Pro ativo poderia inserir direto, pelo
-- PostgREST, uma linha billing_origin='free_demo' — gastando de graca a
-- demonstracao de uma conta que ja paga, ou criando um 'pending' invisivel
-- que nunca seria limpo.
--
-- INSERT direto passa a ser SO o fluxo pago e SO relatorio pronto. A linha
-- free_demo/pending nasce exclusivamente pela RPC do item 6, que valida
-- elegibilidade antes.
--
-- O resto da regra — posse e vinculo com a avaliacao — e o que ja estava em
-- producao, preservado palavra por palavra.

drop policy if exists "Users can insert own ai_reports" on public.ai_reports;

create policy "Users can insert own ai_reports"
on public.ai_reports
for insert
with check (
  auth.uid() = user_id
  and public.has_active_assistant(auth.uid())
  and billing_origin = 'subscription'
  and generation_status = 'completed'
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

-- --------------------------------------------------------------
-- 4. METADATA DO INSTRUMENTO GRATUITO SEM RELATORIO PRO
-- --------------------------------------------------------------
-- O gerador le `assessments ... instruments!inner(code, name)`. Com a
-- policy atual — que exige has_active_assistant — o usuario SEM Pro nao
-- carrega nem o nome do FDT, e o `!inner` derruba a linha PAI junto: o
-- relatorio morreria em "Avaliação salva não encontrada" com a avaliacao
-- existindo. E exatamente o incidente do PR #106, agora do outro lado.
--
-- A regra passa a ser: o gate central decide O QUE, e a condicao comercial
-- decide QUEM.
--
--   Pro + CorrigeFacil       -> tudo que ja podia, continua
--   sem Pro + FDT gratuito   -> so o FDT
--   sem Pro + instrumento pago -> nao
--   perfil bloqueado         -> nao (o gate exige status active)
--
-- `is_free_demo` e coluna da PROPRIA linha filtrada — nao ha subconsulta a
-- `instruments` aqui, e portanto nao ha o problema de RLS que o PR #106
-- mediu. GRANTS NAO MUDAM: `authenticated` continua com SELECT apenas nas
-- colunas (id, code, name, score_type). Normas, faixas e itens seguem fora.

drop policy if exists "corrigefacil_report_metadata_instruments" on public.instruments;

create policy "corrigefacil_report_metadata_instruments"
on public.instruments
for select
to authenticated
using (
  public.can_access_corrigefacil_instrument(auth.uid(), code)
  and (
    public.has_active_assistant(auth.uid())
    or is_free_demo = true
  )
);

-- --------------------------------------------------------------
-- 5. O MESMO, PARA AS ESCALAS
-- --------------------------------------------------------------
-- A linha de `scales` nao tem `is_free_demo` — tem `instrument_id`. E uma
-- subconsulta a `instruments` dentro da expressao da policy sofreria a RLS
-- de instruments, que foi o bug medido no PR #106.
--
-- POR QUE UM HELPER NOVO E NAO MEXER EM can_access_corrigefacil_scale:
-- aquele helper responde "o usuario alcanca o instrumento desta escala?", e
-- e assim que ele e testado — o PR #106 trava explicitamente que ele NAO
-- contenha regra comercial (`subscriptions`, `is_free_demo`, `purchases`).
-- Enfiar a condicao do Relatorio Pro dentro dele contrariaria esse
-- principio e mudaria a resposta para qualquer consumidor futuro. A
-- pergunta nova e outra — "esta escala pode aparecer nos METADADOS de um
-- relatorio?" — e ganha a propria funcao.

create or replace function public.can_read_corrigefacil_report_scale(
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
       and (
         public.has_active_assistant(user_uuid)
         or i.is_free_demo = true
       )
  );
$$;

comment on function public.can_read_corrigefacil_report_scale(uuid, uuid) is
  'Metadados de escala visíveis para montar relatório: o gate do instrumento mais a condição comercial (Relatório Pró ativo, ou instrumento marcado como demonstração gratuita). Devolve booleano; não expõe norma, faixa nem item.';

revoke all on function public.can_read_corrigefacil_report_scale(uuid, uuid) from public;
revoke all on function public.can_read_corrigefacil_report_scale(uuid, uuid) from anon;
grant execute on function public.can_read_corrigefacil_report_scale(uuid, uuid) to authenticated;
grant execute on function public.can_read_corrigefacil_report_scale(uuid, uuid) to service_role;

drop policy if exists "corrigefacil_report_metadata_scales" on public.scales;

create policy "corrigefacil_report_metadata_scales"
on public.scales
for select
to authenticated
using (
  public.can_read_corrigefacil_report_scale(auth.uid(), id)
);

-- --------------------------------------------------------------
-- 6. RPC 1 — RESERVAR
-- --------------------------------------------------------------
-- A unica porta pela qual uma linha free_demo pode nascer.
--
-- NAO ACEITA user_uuid. Quem pergunta e sempre auth.uid(): um parametro de
-- usuario transformaria esta funcao numa forma de gastar a demonstracao
-- alheia.
--
-- Devolve ESTADO, nao excecao, para os casos de negocio — a rota precisa
-- distinguir "ja usou" de "nao pode" para responder direito, e um 23505 cru
-- nunca deve chegar ao usuario.

create or replace function public.reserve_corrigefacil_free_demo_report(
  assessment_uuid uuid
)
returns table (report_id uuid, reservation_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_code      text;
  v_free_demo boolean;
  v_id        uuid;
  v_status    text;
  v_new_id    uuid;
begin
  if v_user is null then
    raise exception 'não autenticado';
  end if;

  -- (A) Quem tem Relatorio Pro ativo NUNCA gasta a demonstracao. Sai por
  -- aqui antes de qualquer escrita, e a rota o manda para o fluxo pago.
  if public.has_active_assistant(v_user) then
    return query select null::uuid, 'use_subscription'::text;
    return;
  end if;

  -- (B) A avaliacao: existe, e DO PROPRIO usuario, esta concluida, e o
  -- instrumento dela e o gratuito. Uma consulta so — separar em varias
  -- deixaria brecha entre a checagem de posse e a de elegibilidade.
  --
  -- `status = 'concluida'` é o enum real (rascunho | concluida | arquivada)
  -- e `completed_at is not null` é o contrato de fato: nenhuma das 26
  -- avaliações concluídas em produção tem completed_at nulo.
  select i.code, i.is_free_demo
    into v_code, v_free_demo
    from public.assessments  a
    join public.instruments  i on i.id = a.instrument_id
   where a.id           = assessment_uuid
     and a.user_id      = v_user
     and a.status       = 'concluida'
     and a.completed_at is not null;

  if not found or coalesce(v_free_demo, false) is not true then
    return query select null::uuid, 'ineligible'::text;
    return;
  end if;

  -- (C) O gate central decide o resto — perfil ativo, instrumento
  -- publicado. Reimplementar a regra aqui criaria uma segunda verdade.
  if not public.can_access_corrigefacil_instrument(v_user, v_code) then
    return query select null::uuid, 'ineligible'::text;
    return;
  end if;

  -- (D) RESERVA ORFA. O processo pode morrer entre a reserva e a entrega —
  -- deploy no meio, timeout, navegador fechado. Depois de 30 minutos a
  -- linha pending nao representa mais uma geracao em curso, e segura-la
  -- seria cobrar da conta uma chance que ela nunca recebeu.
  --
  -- So apaga PENDING. `completed` e vitalicio e nao e tocado aqui nem em
  -- lugar nenhum.
  delete from public.ai_reports
   where user_id           = v_user
     and billing_origin    = 'free_demo'
     and generation_status = 'pending'
     and created_at        < now() - interval '30 minutes';

  -- (E) Pre-checagem amigavel. NAO e a trava: a autoridade final continua
  -- sendo o indice unico do PR2, tratado no bloco de excecao abaixo.
  select r.id, r.generation_status
    into v_id, v_status
    from public.ai_reports r
   where r.user_id        = v_user
     and r.billing_origin = 'free_demo'
   limit 1;

  if found then
    return query select v_id,
      case when v_status = 'completed' then 'already_used' else 'in_progress' end;
    return;
  end if;

  -- (F) A reserva. O texto nasce vazio porque a coluna nao aceita nulo; o
  -- que diz que ainda nao ha relatorio e generation_status, nao o texto.
  begin
    insert into public.ai_reports
      (user_id, output_text, billing_origin, generation_status, corrigefacil_assessment_id)
    values
      (v_user, '', 'free_demo', 'pending', assessment_uuid)
    returning id into v_new_id;
  exception when unique_violation then
    -- O DUPLO CLIQUE. A outra requisicao commitou primeiro; esta esperou no
    -- indice e perdeu. Ninguem ve o 23505: quem perdeu recebe o estado.
    select r.id, r.generation_status
      into v_id, v_status
      from public.ai_reports r
     where r.user_id        = v_user
       and r.billing_origin = 'free_demo'
     limit 1;

    return query select v_id,
      case when v_status = 'completed' then 'already_used' else 'in_progress' end;
    return;
  end;

  return query select v_new_id, 'reserved'::text;
end;
$$;

comment on function public.reserve_corrigefacil_free_demo_report(uuid) is
  'Reserva a única demonstração gratuita vitalícia da conta ANTES da chamada da IA. Usa auth.uid(); nunca aceita usuário por parâmetro. Devolve reserved | already_used | in_progress | use_subscription | ineligible.';

revoke all on function public.reserve_corrigefacil_free_demo_report(uuid) from public;
revoke all on function public.reserve_corrigefacil_free_demo_report(uuid) from anon;
grant execute on function public.reserve_corrigefacil_free_demo_report(uuid) to authenticated;
grant execute on function public.reserve_corrigefacil_free_demo_report(uuid) to service_role;

-- --------------------------------------------------------------
-- 7. RPC 2 — FINALIZAR
-- --------------------------------------------------------------
-- Transforma a reserva no relatorio. Uma linha, quatro condicoes de
-- identidade, e um conjunto fechado de colunas.
--
-- O que ela NAO pode alterar, e por isso nao aparece no `set`: user_id
-- (dono), corrigefacil_assessment_id (a qual avaliacao pertence),
-- billing_origin (a origem nao muda depois de decidida) e created_at.

create or replace function public.complete_corrigefacil_free_demo_report(
  report_uuid     uuid,
  new_title       text,
  new_report_type text,
  new_input_text  text,
  new_output_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_text text;
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'não autenticado';
  end if;

  v_text := btrim(coalesce(new_output_text, ''));

  -- Finalizar com texto vazio produziria exatamente o que a reserva e: uma
  -- linha sem relatorio — so que agora marcada como usada.
  if v_text = '' then
    raise exception 'relatório vazio';
  end if;

  -- Mesmo teto de sanidade de update_corrigefacil_report_text.
  if length(v_text) > 30000 then
    raise exception 'relatório excede o limite de 30000 caracteres';
  end if;

  if new_report_type is null
     or new_report_type not in ('family', 'school', 'technical', 'internal') then
    raise exception 'tipo de relatório inválido';
  end if;

  update public.ai_reports
     set title             = new_title,
         report_type       = new_report_type,
         input_text        = new_input_text,
         output_text       = v_text,
         generation_status = 'completed'
   where id                = report_uuid
     and user_id           = v_user
     and billing_origin    = 'free_demo'
     and generation_status = 'pending'
  returning id into v_id;

  if v_id is null then
    -- Mesma mensagem para inexistente, de outro dono, ja finalizada ou de
    -- outra origem: distinguir confirmaria a existencia de registro alheio.
    raise exception 'reserva não encontrada';
  end if;

  return v_id;
end;
$$;

comment on function public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text) is
  'Transforma a reserva pending da demonstração gratuita em relatório completed. Não altera dono, avaliação vinculada, origem nem data de criação.';

revoke all on function public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text) from public;
revoke all on function public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text) from anon;
grant execute on function public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text) to authenticated;
grant execute on function public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text) to service_role;

-- --------------------------------------------------------------
-- 8. RPC 3 — DEVOLVER A CHANCE
-- --------------------------------------------------------------
-- Se a IA falhou, ou se algo quebrou antes de o usuario receber o texto,
-- nenhum valor foi entregue — e cobrar a demonstracao por isso seria cobrar
-- por nada.
--
-- `generation_status = 'pending'` no WHERE nao e detalhe: e o que impede
-- esta funcao de ser um "apague meu relatorio e me devolva a chance".
-- Relatorio completed NUNCA e apagado aqui.

create or replace function public.release_corrigefacil_free_demo_report(
  report_uuid uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'não autenticado';
  end if;

  delete from public.ai_reports
   where id                = report_uuid
     and user_id           = v_user
     and billing_origin    = 'free_demo'
     and generation_status = 'pending';

  -- false nao e erro: significa "nao havia reserva minha e pendente com
  -- esse id". A rota trata isso como nada a devolver.
  return found;
end;
$$;

comment on function public.release_corrigefacil_free_demo_report(uuid) is
  'Devolve a demonstração gratuita apagando a reserva pending do próprio usuário quando a geração não entregou valor. Nunca apaga relatório completed.';

revoke all on function public.release_corrigefacil_free_demo_report(uuid) from public;
revoke all on function public.release_corrigefacil_free_demo_report(uuid) from anon;
grant execute on function public.release_corrigefacil_free_demo_report(uuid) to authenticated;
grant execute on function public.release_corrigefacil_free_demo_report(uuid) to service_role;

-- --------------------------------------------------------------
-- 9. O EDITOR NAO ALCANCA UMA RESERVA
-- --------------------------------------------------------------
-- `update_corrigefacil_report_text` edita a narrativa de um relatorio
-- CorrigeFacil ja gerado. Com a coluna nova, ela precisa de mais uma
-- condicao: sem ela, uma chamada direta poderia gravar texto numa linha
-- pending — finalizando a demonstracao por fora da RPC de finalizacao, sem
-- passar por nenhuma das validacoes dela.
--
-- O QUE NAO MUDA: subscription completed e free_demo completed continuam
-- editaveis. O editor pertence aos dois.
--
-- CREATE OR REPLACE sobre 20260811114000, que continua no historico como o
-- que de fato aconteceu.

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

  -- As TRES condicoes de sempre — relatorio certo, dono certo, avaliacao
  -- certa — mais a QUARTA: o editor edita relatorio, nunca reserva.
  --
  -- `set output_text` e SO isso: created_at, report_type, title, input_text,
  -- corrigefacil_assessment_id, billing_origin e generation_status ficam
  -- como estao.
  update public.ai_reports
     set output_text = v_final
   where id                        = report_uuid
     and user_id                   = auth.uid()
     and corrigefacil_assessment_id = assessment_uuid
     and generation_status         = 'completed';

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
  'Atualiza SOMENTE ai_reports.output_text do relatório do próprio usuário, vinculado à avaliação informada e já concluído. Grava exatamente o texto recebido: a nota de responsabilidade profissional é opcional e pertence ao autor do documento.';

revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from public;
revoke all on function public.update_corrigefacil_report_text(uuid, uuid, text) from anon;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to authenticated;
grant execute on function public.update_corrigefacil_report_text(uuid, uuid, text) to service_role;

-- --------------------------------------------------------------
-- O QUE ESTA MIGRATION NAO FAZ
-- --------------------------------------------------------------
-- Nao amplia grant nenhum: `authenticated` continua com SELECT apenas nas
-- colunas ja concedidas de instruments e scales, e nada foi concedido em
-- norm_sets, norm_entries, classification_bands ou items.
--
-- Nao toca scoring, normas, graficos, Edge, checkout, purchases,
-- subscriptions, precos, o limite de 50 nem os prompts clinicos.
--
-- Nao cria UX: nenhuma linha aqui faz uma tela aparecer. A capacidade fica
-- pronta e provada, e o PR4 decide como oferece-la.
