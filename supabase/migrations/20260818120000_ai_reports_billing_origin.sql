-- ==========================================
-- RELATORIO PRO: FUNDACAO DA DEMONSTRACAO GRATUITA
-- Created: 2026-08-18
-- Depends on: 20260809214000_link_ai_reports_to_corrigefacil_assessments.sql
-- ==========================================
-- SOMENTE FUNDACAO DE BANCO. Depois desta migration o sistema se comporta
-- exatamente como antes dela: nenhum caminho da aplicacao grava
-- `free_demo`, nenhuma tela sabe que a coluna existe, e a cota mensal
-- continua contando do jeito que conta hoje.
--
-- O QUE ELA PREPARA
--
-- Uma conta sem Relatorio Pro ativo podera, no futuro, gerar UMA
-- demonstracao gratuita — uma por conta, para a vida toda. Nao e uma por
-- mes, nem por avaliacao, nem por instrumento, nem por dispositivo.
--
-- POR QUE EM `ai_reports` E NAO NUMA TABELA DE CREDITOS
--
-- Uma tabela de creditos precisaria ser mantida em sincronia com os
-- relatorios que de fato existem, e as duas divergiriam no primeiro erro de
-- meio-caminho. Aqui o relatorio demo E o proprio registro de uso: a linha
-- existe, a chance foi usada; a linha nao existe, a chance esta de pe. Nao
-- ha segundo lugar onde a verdade possa ficar diferente.
--
-- POR QUE `text` COM CHECK E NAO UM ENUM
--
-- Enum do Postgres so cresce por DDL, e o valor antigo nunca sai. Um CHECK
-- nomeado da a mesma garantia e continua editavel por migration comum.
-- ==========================================

-- --------------------------------------------------------------
-- 1. A COLUNA
-- --------------------------------------------------------------
-- NOT NULL com DEFAULT constante nao reescreve a tabela no PG 11+ (aqui:
-- 17.6). As 72 linhas existentes passam a ler 'subscription' sem UPDATE,
-- sem tocar id, texto, vinculo com a avaliacao, data, tipo ou usuario.
--
-- O DEFAULT tambem e o que mantem a compatibilidade do CODIGO: os INSERTs
-- de hoje em `src/app/api/assistant/generate/route.ts` nao mencionam a
-- coluna e continuam produzindo relatorio de assinatura.

alter table public.ai_reports
  add column if not exists billing_origin text not null default 'subscription';

-- --------------------------------------------------------------
-- 2. O CONTRATO DE VALORES
-- --------------------------------------------------------------
-- Dois valores, e o banco recusa qualquer terceiro. Sem isso, um typo
-- ('free-demo', 'freedemo') viraria uma origem nova em silencio — e, pior,
-- escaparia do indice do item 3, que e a trava de concorrencia.

alter table public.ai_reports
  drop constraint if exists ai_reports_billing_origin_check;

alter table public.ai_reports
  add constraint ai_reports_billing_origin_check
  check (billing_origin in ('subscription', 'free_demo'));

-- --------------------------------------------------------------
-- 3. A TRAVA: UMA DEMO POR CONTA, PARA SEMPRE
-- --------------------------------------------------------------
-- Esta e a peca que precisa existir no BANCO, e nao no frontend. Dois
-- cliques simultaneos sao duas transacoes; a segunda so pode ser barrada
-- por alguem que enxergue as duas. localStorage, cookie ou contador no
-- cliente nao enxergam nem a propria aba ao lado.
--
-- Parcial de proposito: linhas 'subscription' ficam FORA do indice, e uma
-- assinatura segue com quantos relatorios quiser.
--
-- O PREDICATE E SO A ORIGEM. Nada de `status = 'completed'` ou
-- `output_text <> ''` junto: no PR3 a reserva sera criada ANTES da chamada
-- da IA, e e justamente a linha reservada — ainda sem texto entregue — que
-- precisa bloquear a requisicao concorrente. Um predicate que exigisse
-- relatorio pronto deixaria as duas passarem pela reserva.

create unique index if not exists ai_reports_user_free_demo_uidx
  on public.ai_reports (user_id)
  where billing_origin = 'free_demo';

-- --------------------------------------------------------------
-- 4. DOCUMENTACAO NO PROPRIO SCHEMA
-- --------------------------------------------------------------

comment on column public.ai_reports.billing_origin is
  'Origem do relatório. subscription: fluxo normal do Relatório Pró (padrão de todo INSERT existente). free_demo: a única demonstração gratuita vitalícia da conta, reservada e gerada por caminho server-side — garantida por ai_reports_user_free_demo_uidx.';

-- --------------------------------------------------------------
-- O QUE ESTA MIGRATION NAO FAZ (e por que)
-- --------------------------------------------------------------
-- RLS: as policies de `ai_reports` ficam INTACTAS. A de INSERT continua
-- exigindo `has_active_assistant(auth.uid())`, ou seja: hoje ninguem sem
-- Relatorio Pro ativo consegue inserir linha nenhuma — nem 'free_demo'. A
-- fundacao entra fechada. Afrouxar aqui abriria a demonstracao antes de
-- existir qualquer validacao de elegibilidade.
--
-- RPC de reserva: fica para o PR3, junto do resto do contrato que ela
-- precisa cumprir (posse da avaliacao, instrumento elegivel, ausencia de
-- Pro ativo, chamada da IA, falha e devolucao da chance). Metade desse
-- contrato agora seria uma porta entreaberta.
--
-- Cota de 50/mes: `free_demo` NAO deve entrar na conta de uma assinatura
-- futura. A query de contagem ainda nao filtra por origem — e nao precisa,
-- porque nenhuma linha 'free_demo' pode existir ainda. Antes de o PR3
-- permitir a primeira, GET e POST de /api/assistant/generate precisam
-- passar a contar somente billing_origin = 'subscription'.
--
-- `output_text` continua NOT NULL. A reserva do PR3 tera de nascer com
-- algum conteudo; qual e a representacao segura disso e decisao a tomar
-- olhando o fluxo inteiro, nao aqui.
