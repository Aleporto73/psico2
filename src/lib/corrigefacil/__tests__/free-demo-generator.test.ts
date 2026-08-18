// PR3 · O GERADOR sob a demonstração gratuita.
//
// O que estes testes provam é a ORDEM e as travas de ordem:
//
//     validar -> RESERVAR -> OpenAI -> FINALIZAR
//
// Reservar depois da IA seria reservar depois de já ter gasto o dinheiro —
// e, no duplo clique, depois de ter gasto duas vezes. Por isso a asserção
// central aqui não é "chamou a RPC", é "chamou a RPC ANTES da OpenAI".
//
// A OpenAI é MOCKADA em todos os casos: nenhum token real é gasto.
//
// O comportamento do banco (RLS, corrida, TTL) não se prova aqui — prova-se
// contra o Postgres, e foi provado: cluster descartável, réplica fiel das
// policies de produção, 35 casos + a corrida de duas sessões. Resultados no
// corpo do PR.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sequencia: string[] = [];

vi.mock('@/lib/openai', () => ({
  callOpenAI: vi.fn(async () => {
    sequencia.push('openai');
    return {
      content: 'RELATÓRIO GERADO PELA IA',
      model: 'mock',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
  }),
  VISION_NOT_SUPPORTED: 'VISION_NOT_SUPPORTED',
}));

import { callOpenAI } from '@/lib/openai';
import { generateCorrigeFacilReport } from '../report-generator';

const ASSESSMENT_ID = '11111111-2222-4333-8444-555555555555';
const REPORT_ID = '99999999-8888-4777-a666-555555555555';

const AVALIACAO = {
  id: ASSESSMENT_ID,
  user_id: 'user-1',
  subject_label: 'Fulano de Tal',
  subject_meta: { age_at_evaluation: { years: 8 } },
  eval_date: '2026-08-01',
  created_at: '2026-08-01',
  completed_at: '2026-08-01',
  status: 'concluida',
  instruments: { code: 'FDT', name: 'Five Digit Test' },
};

const RESULTADOS = [
  {
    raw: 22,
    score: null,
    percentile: 50,
    z_score: 0,
    classification: 'Médio',
    ci95: null,
    available: true,
    message: null,
    flags: [],
    scales: { code: 'LEITURA', name: 'Leitura', kind: 'domain', ordinal: 1 },
  },
];

/** Cliente Supabase de mentira: registra tudo e devolve filas configuradas. */
function fakeSupabase(cfg: {
  aiReports?: Array<{ data: unknown; error: unknown }>;
  rpc?: Record<string, (args: unknown) => { data: unknown; error: unknown }>;
}) {
  const filas: Record<string, Array<{ data: unknown; error: unknown }>> = {
    assessments: [{ data: AVALIACAO, error: null }],
    assessment_results: [{ data: RESULTADOS, error: null }],
    ai_reports: [...(cfg.aiReports ?? [])],
  };

  const inserts: Array<Record<string, unknown>> = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  function builder(table: string) {
    const resultado = () =>
      filas[table]?.shift() ?? { data: null, error: null };

    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'order', 'limit']) {
      b[m] = () => b;
    }
    b.insert = (row: Record<string, unknown>) => {
      sequencia.push(`insert:${table}`);
      inserts.push(row);
      return b;
    };
    b.single = () => Promise.resolve(resultado());
    b.maybeSingle = () => Promise.resolve(resultado());
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(resultado()).then(res, rej);
    return b;
  }

  return {
    inserts,
    rpcCalls,
    from: (table: string) => builder(table),
    rpc: (name: string, args: Record<string, unknown>) => {
      sequencia.push(`rpc:${name}`);
      rpcCalls.push({ name, args });
      const r = cfg.rpc?.[name];
      return Promise.resolve(r ? r(args) : { data: null, error: null });
    },
  };
}

const reservaOk = () => ({
  data: [{ report_id: REPORT_ID, reservation_status: 'reserved' }],
  error: null,
});

const linhaFinal = {
  id: REPORT_ID,
  title: 'FDT — Fulano de Tal',
  output_text: 'RELATÓRIO GERADO PELA IA',
  billing_origin: 'free_demo',
  generation_status: 'completed',
};

function chamar(
  billingOrigin: 'subscription' | 'free_demo',
  supabase: ReturnType<typeof fakeSupabase>,
) {
  return generateCorrigeFacilReport({
    supabase,
    userId: 'user-1',
    body: { source: 'corrigefacil', assessmentId: ASSESSMENT_ID, reportType: 'technical' },
    currentMonthlyCount: 7,
    monthlyLimit: 50,
    avisoFinal: 'NOTA.',
    billingOrigin,
  });
}

beforeEach(() => {
  sequencia.length = 0;
  vi.clearAllMocks();
});

describe('PR3 · fluxo pago (subscription) permanece intacto', () => {
  it('NÃO reserva, NÃO finaliza, e grava pelo INSERT de sempre', async () => {
    const supabase = fakeSupabase({
      aiReports: [{ data: { id: 'r1', output_text: 'x' }, error: null }],
    });

    const res = await chamar('subscription', supabase);

    expect(res.status).toBe(200);
    expect(supabase.rpcCalls).toHaveLength(0);
    expect(sequencia).toEqual(['openai', 'insert:ai_reports']);
  });

  it('o INSERT pago não menciona origem nem estado — cai nos defaults', async () => {
    const supabase = fakeSupabase({
      aiReports: [{ data: { id: 'r1' }, error: null }],
    });

    await chamar('subscription', supabase);

    const row = supabase.inserts[0];
    expect(row).toHaveProperty('corrigefacil_assessment_id', ASSESSMENT_ID);
    expect(row).not.toHaveProperty('billing_origin');
    expect(row).not.toHaveProperty('generation_status');
  });

  it('a cota da assinatura anda +1', async () => {
    const supabase = fakeSupabase({
      aiReports: [{ data: { id: 'r1' }, error: null }],
    });

    const body = await (await chamar('subscription', supabase)).json();
    expect(body.monthly_count).toBe(8);
  });
});

describe('PR3 · a ORDEM da demonstração gratuita', () => {
  it('reserva ANTES da OpenAI e finaliza DEPOIS dela', async () => {
    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
      aiReports: [{ data: linhaFinal, error: null }],
    });

    const res = await chamar('free_demo', supabase);

    expect(res.status).toBe(200);
    expect(sequencia).toEqual([
      'rpc:reserve_corrigefacil_free_demo_report',
      'openai',
      'rpc:complete_corrigefacil_free_demo_report',
    ]);
  });

  it('finaliza a MESMA linha reservada — nenhuma linha nova nasce', async () => {
    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
      aiReports: [{ data: linhaFinal, error: null }],
    });

    await chamar('free_demo', supabase);

    expect(supabase.inserts).toHaveLength(0);
    const complete = supabase.rpcCalls.find((c) =>
      c.name === 'complete_corrigefacil_free_demo_report',
    );
    expect(complete?.args.report_uuid).toBe(REPORT_ID);
    expect(complete?.args.new_output_text).toContain('RELATÓRIO GERADO PELA IA');
  });

  it('a demonstração NÃO anda com a cota mensal', async () => {
    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
      aiReports: [{ data: linhaFinal, error: null }],
    });

    const body = await (await chamar('free_demo', supabase)).json();
    expect(body.monthly_count).toBe(7);
    expect(body.report.billing_origin).toBe('free_demo');
  });

  it('a reserva usa a avaliação pedida, e não aceita usuário por parâmetro', async () => {
    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
      aiReports: [{ data: linhaFinal, error: null }],
    });

    await chamar('free_demo', supabase);

    const reserve = supabase.rpcCalls[0];
    expect(reserve.args).toEqual({ assessment_uuid: ASSESSMENT_ID });
    expect(Object.keys(reserve.args)).not.toContain('user_uuid');
  });
});

describe('PR3 · sem reserva, ZERO OpenAI', () => {
  const negativas: Array<[string, number]> = [
    ['already_used', 403],
    ['in_progress', 409],
    ['use_subscription', 403],
    ['ineligible', 403],
  ];

  for (const [status, esperado] of negativas) {
    it(`reserve=${status} -> ${esperado} e a IA nunca é chamada`, async () => {
      const supabase = fakeSupabase({
        rpc: {
          reserve_corrigefacil_free_demo_report: () => ({
            data: [{ report_id: null, reservation_status: status }],
            error: null,
          }),
        },
      });

      const res = await chamar('free_demo', supabase);

      expect(res.status).toBe(esperado);
      expect(callOpenAI).not.toHaveBeenCalled();
      expect(sequencia).toEqual(['rpc:reserve_corrigefacil_free_demo_report']);
    });
  }

  it('erro na própria RPC de reserva também não chega na IA', async () => {
    const supabase = fakeSupabase({
      rpc: {
        reserve_corrigefacil_free_demo_report: () => ({
          data: null,
          error: { message: 'boom' },
        }),
      },
    });

    const res = await chamar('free_demo', supabase);

    expect(res.status).toBe(500);
    expect(callOpenAI).not.toHaveBeenCalled();
  });

  it('reserva concedida sem id é tratada como falha, sem IA', async () => {
    const supabase = fakeSupabase({
      rpc: {
        reserve_corrigefacil_free_demo_report: () => ({
          data: [{ report_id: null, reservation_status: 'reserved' }],
          error: null,
        }),
      },
    });

    const res = await chamar('free_demo', supabase);

    expect(res.status).toBe(500);
    expect(callOpenAI).not.toHaveBeenCalled();
  });
});

describe('PR3 · falha depois da reserva devolve a chance', () => {
  it('OpenAI falha -> release, e nada de texto na resposta', async () => {
    vi.mocked(callOpenAI).mockRejectedValueOnce(new Error('timeout'));

    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
    });

    const res = await chamar('free_demo', supabase);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(supabase.rpcCalls.map((c) => c.name)).toEqual([
      'reserve_corrigefacil_free_demo_report',
      'release_corrigefacil_free_demo_report',
    ]);
    expect(
      supabase.rpcCalls.find((c) => c.name.startsWith('release'))?.args,
    ).toEqual({ report_uuid: REPORT_ID });
    expect(JSON.stringify(body)).not.toContain('RELATÓRIO GERADO PELA IA');
  });

  it('complete falha E a linha não aparece -> release, e o texto NÃO é entregue', async () => {
    const supabase = fakeSupabase({
      rpc: {
        reserve_corrigefacil_free_demo_report: reservaOk,
        complete_corrigefacil_free_demo_report: () => ({
          data: null,
          error: { message: 'boom' },
        }),
      },
      // a releitura não encontra nada
      aiReports: [{ data: null, error: null }],
    });

    const res = await chamar('free_demo', supabase);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(supabase.rpcCalls.map((c) => c.name)).toContain(
      'release_corrigefacil_free_demo_report',
    );
    // Nada de entregar o relatório "de brinde": se não persistiu, não entrega.
    expect(JSON.stringify(body)).not.toContain('RELATÓRIO GERADO PELA IA');
  });

  it('complete responde ERRO mas a linha EXISTE -> sucesso, e NADA de release', async () => {
    // O caso ambíguo: a RPC commitou e a resposta se perdeu na volta. A
    // verdade é a releitura — e o SELECT do usuário só enxerga completed.
    const supabase = fakeSupabase({
      rpc: {
        reserve_corrigefacil_free_demo_report: reservaOk,
        complete_corrigefacil_free_demo_report: () => ({
          data: null,
          error: { message: 'network' },
        }),
      },
      aiReports: [{ data: linhaFinal, error: null }],
    });

    const res = await chamar('free_demo', supabase);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.report.id).toBe(REPORT_ID);
    expect(supabase.rpcCalls.map((c) => c.name)).not.toContain(
      'release_corrigefacil_free_demo_report',
    );
  });

  it('erro de DADOS acontece ANTES da reserva — a chance não é gasta', async () => {
    // Avaliação sem nome: o gerador devolve 422 antes de qualquer RPC.
    const supabase = fakeSupabase({
      rpc: { reserve_corrigefacil_free_demo_report: reservaOk },
    });
    supabase.from = ((table: string) => {
      const base = fakeSupabase({}).from(table) as Record<string, unknown>;
      if (table === 'assessments') {
        base.maybeSingle = () =>
          Promise.resolve({
            data: { ...AVALIACAO, subject_label: '   ' },
            error: null,
          });
      }
      return base;
    }) as typeof supabase.from;

    const res = await chamar('free_demo', supabase);

    expect(res.status).toBe(422);
    expect(supabase.rpcCalls).toHaveLength(0);
    expect(callOpenAI).not.toHaveBeenCalled();
  });
});
