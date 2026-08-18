// PR3 · O CONTRATO da migration do backend da demonstração gratuita.
//
// Padrão de leitura de fonte já usado em fdt-free-foundation.test.ts,
// report-metadata-por-instrumento.test.ts e relatorio-pro-free-demo-
// foundation.test.ts.
//
// Aqui se prova o TEXTO: quais condições cada policy passa a exigir, que as
// três RPCs são estreitas e não aceitam usuário por parâmetro, e que nenhum
// grant foi ampliado. O COMPORTAMENTO (RLS de verdade, corrida de duas
// sessões, TTL da reserva órfã) foi provado contra um PostgreSQL 17
// descartável com réplica fiel das policies de produção — 35 casos, todos
// PASS, mais a corrida medida. Os números estão no corpo do PR.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(caminho: string) {
  return readFileSync(join(process.cwd(), caminho), 'utf8');
}

function semComentarios(sql: string) {
  return sql.replace(/^\s*--.*$/gm, '');
}

const CAMINHO =
  'supabase/migrations/20260819120000_relatorio_pro_free_demo_backend.sql';

const SQL = semComentarios(source(CAMINHO)).toLowerCase();

/** Recorta um bloco `create policy "nome" ... ;` */
function policy(nome: string) {
  const i = SQL.indexOf(`create policy "${nome}"`);
  return i === -1 ? '' : SQL.slice(i, SQL.indexOf(';', i) + 1);
}

/** Recorta o corpo de uma função entre `as $$` e o `$$;` seguinte. */
function corpoFuncao(nome: string) {
  const i = SQL.indexOf(`create or replace function public.${nome}`);
  if (i === -1) return '';
  const abre = SQL.indexOf('as $$', i);
  return SQL.slice(abre + 5, SQL.indexOf('$$;', abre + 5));
}

describe('PR3 · generation_status', () => {
  it('nasce text, NOT NULL e com default completed', () => {
    // O default é o que mantém os 72 relatórios existentes e todo INSERT do
    // fluxo pago corretos sem mencionar a coluna.
    expect(SQL).toContain(
      'add column if not exists generation_status text not null default \'completed\'',
    );
  });

  it('a CHECK é nomeada e admite exatamente pending e completed', () => {
    expect(SQL).toContain(
      'drop constraint if exists ai_reports_generation_status_check',
    );
    const i = SQL.indexOf('add constraint ai_reports_generation_status_check');
    const check = SQL.slice(i, SQL.indexOf(';', i) + 1);
    expect(check.match(/'[^']*'/g)).toEqual(["'pending'", "'completed'"]);
  });

  it('NÃO inventa failed/cancelled/expired', () => {
    // Falha sem entrega APAGA a linha. Um estado a mais seria mais um jeito
    // de consultar a verdade errado.
    for (const proibido of ["'failed'", "'cancelled'", "'expired'", "'error'"]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não usa magic string no lugar do estado', () => {
    for (const proibido of ['__pending__', 'reserved_text', 'processing']) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('output_text continua NOT NULL', () => {
    expect(SQL).not.toContain('alter column output_text');
    expect(SQL).not.toContain('drop not null');
  });
});

describe('PR3 · RLS de ai_reports', () => {
  const select = policy('users can read own ai_reports');
  const insert = policy('users can insert own ai_reports');

  it('SELECT esconde a reserva do próprio dono', () => {
    expect(select).toContain('auth.uid() = user_id');
    expect(select).toContain("generation_status = 'completed'");
  });

  it('INSERT direto passa a exigir subscription E completed', () => {
    // Sem estas duas linhas, qualquer usuário com Pró ativo poderia inserir
    // uma linha free_demo pelo PostgREST e gastar de graça a demonstração —
    // ou criar um pending invisível que nunca seria limpo.
    expect(insert).toContain("billing_origin = 'subscription'");
    expect(insert).toContain("generation_status = 'completed'");
  });

  it('INSERT preserva as regras que já existiam', () => {
    expect(insert).toContain('auth.uid() = user_id');
    expect(insert).toContain('public.has_active_assistant(auth.uid())');
    expect(insert).toContain('corrigefacil_assessment_id is null');
    expect(insert).toContain('a.user_id = auth.uid()');
  });

  it('a policy de admin não é tocada', () => {
    expect(SQL).not.toContain('admins have full access on ai_reports');
  });
});

describe('PR3 · metadata para quem não tem Relatório Pró', () => {
  const instrumentos = policy('corrigefacil_report_metadata_instruments');
  const escalas = policy('corrigefacil_report_metadata_scales');

  it('instruments: gate central E (Pró OU instrumento gratuito)', () => {
    expect(instrumentos).toContain(
      'public.can_access_corrigefacil_instrument(auth.uid(), code)',
    );
    expect(instrumentos).toContain('public.has_active_assistant(auth.uid())');
    expect(instrumentos).toContain('is_free_demo = true');
  });

  it('instruments decide pela PRÓPRIA linha, sem subconsulta', () => {
    // Subconsulta a `instruments` dentro da policy sofreria a RLS de
    // instruments — o bug medido no PR #106.
    expect(instrumentos).not.toContain('from public.instruments');
    expect(instrumentos).not.toContain('exists (');
  });

  it('scales delega ao helper novo, e não a subconsulta', () => {
    expect(escalas).toContain(
      'public.can_read_corrigefacil_report_scale(auth.uid(), id)',
    );
    expect(escalas).not.toContain('from public.instruments');
    expect(escalas).not.toContain('exists (');
  });

  it('o helper NOVO carrega a regra, e o antigo fica intocado', () => {
    // `can_access_corrigefacil_scale` significa "alcança o instrumento desta
    // escala" e é testado no PR #106 justamente por NÃO conter regra
    // comercial. A pergunta nova é outra e ganhou função própria.
    const corpo = corpoFuncao('can_read_corrigefacil_report_scale');
    expect(corpo).toContain('public.can_access_corrigefacil_instrument(user_uuid, i.code)');
    expect(corpo).toContain('public.has_active_assistant(user_uuid)');
    expect(corpo).toContain('i.is_free_demo = true');
    expect(SQL).not.toContain(
      'create or replace function public.can_access_corrigefacil_scale',
    );
  });

  it('não amplia grant de tabela nem libera norma/faixa/item', () => {
    for (const proibido of [
      'grant select on table public.instruments',
      'grant select on table public.scales',
      'norm_sets',
      'norm_entries',
      'classification_bands',
      'items',
      'option_sets',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });
});

describe('PR3 · RPC de reserva', () => {
  const corpo = corpoFuncao('reserve_corrigefacil_free_demo_report');

  it('é SECURITY DEFINER com search_path fixo', () => {
    const i = SQL.indexOf('create or replace function public.reserve_corrigefacil_free_demo_report');
    const cabecalho = SQL.slice(i, SQL.indexOf('as $$', i));
    expect(cabecalho).toContain('security definer');
    expect(cabecalho).toContain('set search_path = public');
  });

  it('NÃO aceita usuário por parâmetro — usa auth.uid()', () => {
    // Um parâmetro de usuário transformaria a função numa forma de gastar a
    // demonstração alheia.
    const assinatura = SQL.slice(
      SQL.indexOf('function public.reserve_corrigefacil_free_demo_report'),
      SQL.indexOf('returns table', SQL.indexOf('reserve_corrigefacil_free_demo_report')),
    );
    expect(assinatura).not.toContain('user_uuid');
    expect(assinatura).not.toContain('user_id');
    expect(corpo).toContain('auth.uid()');
  });

  it('Pró ativo sai por use_subscription antes de qualquer escrita', () => {
    const antesDoInsert = corpo.slice(0, corpo.indexOf('insert into public.ai_reports'));
    expect(antesDoInsert).toContain('public.has_active_assistant(v_user)');
    expect(antesDoInsert).toContain("'use_subscription'");
  });

  it('valida posse, conclusão e instrumento gratuito', () => {
    expect(corpo).toContain('a.user_id      = v_user');
    expect(corpo).toContain("a.status       = 'concluida'");
    expect(corpo).toContain('a.completed_at is not null');
    expect(corpo).toContain('i.is_free_demo');
    expect(corpo).toContain('public.can_access_corrigefacil_instrument(v_user, v_code)');
    expect(corpo).toContain("'ineligible'");
  });

  it('trata a corrida: unique_violation vira estado, não erro cru', () => {
    // O 23505 é a autoridade final; o que ele nunca pode ser é a mensagem
    // que chega ao usuário.
    expect(corpo).toContain('exception when unique_violation then');
    expect(corpo).toContain("'in_progress'");
    expect(corpo).toContain("'already_used'");
  });

  it('a reserva nasce pending, com texto vazio', () => {
    expect(corpo).toContain("'free_demo', 'pending'");
    expect(corpo).toContain("v_user, ''");
  });

  it('o TTL de 30 min só alcança PENDING', () => {
    const del = corpo.slice(
      corpo.indexOf('delete from public.ai_reports'),
      corpo.indexOf(';', corpo.indexOf('delete from public.ai_reports')),
    );
    expect(del).toContain("generation_status = 'pending'");
    expect(del).toContain("now() - interval '30 minutes'");
    expect(del).not.toContain("'completed'");
  });
});

describe('PR3 · RPCs de finalizar e liberar', () => {
  const completar = corpoFuncao('complete_corrigefacil_free_demo_report');
  const liberar = corpoFuncao('release_corrigefacil_free_demo_report');

  it('complete só alcança a reserva pending do próprio usuário', () => {
    expect(completar).toContain('and user_id           = v_user');
    expect(completar).toContain("and billing_origin    = 'free_demo'");
    expect(completar).toContain("and generation_status = 'pending'");
  });

  it('complete NÃO altera dono, avaliação, origem nem data', () => {
    const set = completar.slice(
      completar.indexOf('set title'),
      completar.indexOf('where id'),
    );
    for (const proibido of [
      'user_id',
      'corrigefacil_assessment_id',
      'billing_origin',
      'created_at',
    ]) {
      expect(set, proibido).not.toContain(proibido);
    }
    expect(set).toContain("generation_status = 'completed'");
  });

  it('complete recusa texto vazio e tipo fora do produto', () => {
    expect(completar).toContain("if v_text = '' then");
    expect(completar).toContain("not in ('family', 'school', 'technical', 'internal')");
  });

  it('release NUNCA apaga relatório concluído', () => {
    expect(liberar).toContain("and generation_status = 'pending'");
    expect(liberar).toContain("and billing_origin    = 'free_demo'");
    expect(liberar).toContain('and user_id           = v_user');
  });

  it('as três RPCs seguem o menor privilégio do repo', () => {
    for (const alvo of [
      'public.reserve_corrigefacil_free_demo_report(uuid)',
      'public.complete_corrigefacil_free_demo_report(uuid, text, text, text, text)',
      'public.release_corrigefacil_free_demo_report(uuid)',
    ]) {
      expect(SQL, alvo).toContain(`revoke all on function ${alvo} from public`);
      expect(SQL, alvo).toContain(`revoke all on function ${alvo} from anon`);
      expect(SQL, alvo).toContain(`grant execute on function ${alvo} to authenticated`);
    }
  });
});

describe('PR3 · o editor não alcança uma reserva', () => {
  it('update_corrigefacil_report_text ganha a quarta condição', () => {
    const corpo = corpoFuncao('update_corrigefacil_report_text');
    expect(corpo).toContain("and generation_status         = 'completed'");
    // e continua com as três de sempre
    expect(corpo).toContain('and user_id                   = auth.uid()');
    expect(corpo).toContain('and corrigefacil_assessment_id = assessment_uuid');
    expect(corpo).toContain('set output_text = v_final');
  });
});

describe('PR3 · a aplicação', () => {
  const ROTA = source('src/app/api/assistant/generate/route.ts');
  const GERADOR = source('src/lib/corrigefacil/report-generator.ts');

  it('a ORDEM está no código: reserve ANTES da IA, complete DEPOIS', () => {
    const reserve = GERADOR.indexOf("'reserve_corrigefacil_free_demo_report'");
    const openai = GERADOR.indexOf('await callOpenAI([');
    const complete = GERADOR.indexOf("'complete_corrigefacil_free_demo_report'");

    expect(reserve).toBeGreaterThan(-1);
    expect(reserve).toBeLessThan(openai);
    expect(openai).toBeLessThan(complete);
  });

  it('nenhum service_role no Next.js', () => {
    for (const fonte of [ROTA, GERADOR]) {
      expect(fonte).not.toContain('createAdminClient');
      expect(fonte).not.toContain('service_role');
      expect(fonte).not.toContain('SERVICE_ROLE');
    }
  });

  it('as duas contagens da cota filtram a origem', () => {
    const filtros = ROTA.match(/\.eq\('billing_origin', 'subscription'\)/g) ?? [];
    expect(filtros).toHaveLength(2);
    expect(ROTA).toContain('const MONTHLY_LIMIT = 50;');
  });

  it('o INSERT do fluxo pago continua caindo nos defaults', () => {
    expect(GERADOR).toContain('corrigefacil_assessment_id: assessmentId');
    const insert = GERADOR.slice(
      GERADOR.indexOf(".from('ai_reports')\n    .insert({"),
      GERADOR.indexOf('.select()\n    .single();'),
    );
    expect(insert).not.toContain('billing_origin');
    expect(insert).not.toContain('generation_status');
  });
});

describe('PR3 · escopo', () => {
  it('a migration não toca scoring, normas, Edge, checkout nem preço', () => {
    for (const proibido of [
      'assessment_results',
      'norm_sets',
      'purchases',
      'subscriptions',
      'products',
      'payment',
      'price',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('não redefine os gates do CorrigeFácil', () => {
    for (const proibido of [
      'create or replace function public.can_access_corrigefacil_instrument',
      'create or replace function public.has_corrigefacil_access',
      'create or replace function public.has_active_assistant',
      'alter table public.instruments',
    ]) {
      expect(SQL, proibido).not.toContain(proibido);
    }
  });

  it('entra em ordem, depois da fundação do PR2', () => {
    const todas = readdirSync(join(process.cwd(), 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const eu = '20260819120000_relatorio_pro_free_demo_backend.sql';
    const anteriores = todas.filter((f) => f < eu);
    expect(anteriores).toContain('20260818120000_ai_reports_billing_origin.sql');
    expect(todas.indexOf(eu)).toBe(anteriores.length);
  });
});
