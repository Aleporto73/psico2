-- ==========================================
-- STATUS READ-ONLY DA DEMONSTRACAO GRATUITA
-- Created: 2026-08-20
-- Depends on: 20260819120000_relatorio_pro_free_demo_backend.sql
-- ==========================================
-- A tela da avaliacao SALVA precisa saber, ANTES de o profissional escolher
-- o destino do relatorio, se deve oferecer a demonstracao gratuita, a compra
-- do Relatorio Pro, ou nada. Esta funcao responde exatamente isso.
--
-- POR QUE NAO USAR `reserve_corrigefacil_free_demo_report` PARA ISSO
--
-- Reservar e CONSUMIR: a reserva cria a linha `pending` que o indice unico
-- do PR2 usa para barrar o segundo clique. Chamar reserve so para desenhar
-- um card gastaria a chance de quem apenas ABRIU a tela — e, pior, deixaria
-- uma reserva orfa viva por 30 minutos em cada visita.
--
-- Esta funcao NAO ESCREVE NADA. E `stable`, nao apaga reserva vencida e nao
-- cria nenhuma segunda regra de limpeza: quem recupera reserva orfa continua
-- sendo a RPC de reserva, no momento da tentativa real. Aqui a reserva
-- vencida apenas DEIXA DE SER RELATADA como geracao em curso.
--
-- ELA NAO E AUTORIZACAO
--
-- A autoridade continua sendo `reserve_...`, e nada neste PR afrouxa isso.
-- Entre o desenho da tela e o clique cabe muita coisa: outra aba consumindo
-- a chance, uma assinatura sendo ativada, o perfil mudando, duas requisicoes
-- concorrentes. O status serve a UX; quem decide se a demonstracao acontece
-- e a reserva, e ela revalida tudo do zero.
-- ==========================================

create or replace function public.corrigefacil_free_demo_report_status(
  assessment_uuid uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_code    text;
  v_free    boolean;
  v_status  text;
  v_created timestamptz;
begin
  -- O usuario e sempre auth.uid(). NAO existe parametro de usuario: com um,
  -- qualquer authenticated leria o estado comercial da conta alheia.
  if v_user is null then
    raise exception 'não autenticado';
  end if;

  -- Quem tem Relatorio Pro ativo nunca ve copy de demonstracao. Sai antes de
  -- qualquer leitura de avaliacao — a resposta ja esta decidida.
  if public.has_active_assistant(v_user) then
    return 'use_subscription';
  end if;

  -- As MESMAS condicoes da reserva: existe, e do proprio usuario, esta
  -- concluida, e o instrumento e o gratuito. Divergir daqui produziria uma
  -- tela que promete o que a reserva depois recusa.
  select i.code, i.is_free_demo
    into v_code, v_free
    from public.assessments  a
    join public.instruments  i on i.id = a.instrument_id
   where a.id           = assessment_uuid
     and a.user_id      = v_user
     and a.status       = 'concluida'
     and a.completed_at is not null;

  if not found or coalesce(v_free, false) = false then
    return 'ineligible';
  end if;

  -- O gate central: perfil ativo, instrumento publicado.
  if not public.can_access_corrigefacil_instrument(v_user, v_code) then
    return 'ineligible';
  end if;

  -- UMA linha no maximo, garantida pelo indice unico do PR2.
  select r.generation_status, r.created_at
    into v_status, v_created
    from public.ai_reports r
   where r.user_id        = v_user
     and r.billing_origin = 'free_demo'
   limit 1;

  if not found then
    return 'available';
  end if;

  if v_status = 'completed' then
    return 'already_used';
  end if;

  -- PENDING. Dentro da janela e geracao em curso de verdade; fora dela a
  -- reserva ja e orfa, e a proxima tentativa real vai limpa-la.
  --
  -- A JANELA E A MESMA DA RESERVA, e precisa continuar sendo: se esta dissesse
  -- 45 minutos e a reserva 30, a tela anunciaria "em andamento" para uma
  -- chance que ja estava livre. O teste de contrato compara os dois literais.
  if v_created > now() - interval '30 minutes' then
    return 'in_progress';
  end if;

  return 'available';
end;
$$;

comment on function public.corrigefacil_free_demo_report_status(uuid) is
  'Estado da demonstração gratuita do Relatório Pró para a avaliação informada, do ponto de vista de auth.uid(): available | already_used | in_progress | use_subscription | ineligible. READ-ONLY e não é autorização — quem autoriza é reserve_corrigefacil_free_demo_report.';

revoke all on function public.corrigefacil_free_demo_report_status(uuid) from public;
revoke all on function public.corrigefacil_free_demo_report_status(uuid) from anon;
grant execute on function public.corrigefacil_free_demo_report_status(uuid) to authenticated;
grant execute on function public.corrigefacil_free_demo_report_status(uuid) to service_role;
