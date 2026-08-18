// PR3 · A ROTA decide a origem. O cliente não opina.
//
// Estes testes atacam a pergunta de segurança central do PR: existe algum
// payload capaz de fazer um usuário escolher a própria origem de cobrança?
// A resposta tem de ser não — nem para inventar uma demonstração gratuita
// tendo Pró ativo, nem para fingir assinatura sem ter.
//
// Também trancam a cota: os 50/mês passam a contar SOMENTE `subscription`.
// Sem esse filtro, a demonstração gratuita apareceria como "1 de 50" para
// quem assinasse depois — cobrando do plano um relatório que foi cortesia.
//
// OpenAI mockada. Nenhum token real.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const chamadas: {
  openai: number;
  gerador: Array<Record<string, unknown>>;
  filtros: Array<[string, unknown]>;
  inserts: Array<Record<string, unknown>>;
} = { openai: 0, gerador: [], filtros: [], inserts: [] };

vi.mock('@/lib/openai', () => ({
  callOpenAI: vi.fn(async () => {
    chamadas.openai += 1;
    return { content: 'TEXTO', model: 'mock', usage: null };
  }),
  VISION_NOT_SUPPORTED: 'VISION_NOT_SUPPORTED',
}));

vi.mock('@/lib/corrigefacil/report-generator', () => ({
  generateCorrigeFacilReport: vi.fn(async (args: Record<string, unknown>) => {
    chamadas.gerador.push(args);
    return Response.json({ message: 'ok', origem: args.billingOrigin });
  }),
}));

let ACESSO: { has_active_assistant: boolean } | null = { has_active_assistant: true };
let CONTAGEM = 0;

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'gte', 'order', 'limit']) b[m] = () => b;
      b.eq = (coluna: string, valor: unknown) => {
        if (table === 'ai_reports') chamadas.filtros.push([coluna, valor]);
        return b;
      };
      b.insert = (row: Record<string, unknown>) => {
        chamadas.inserts.push(row);
        return b;
      };
      b.single = async () => ({ data: { id: 'r1' }, error: null });
      b.maybeSingle = async () =>
        table === 'user_access_status'
          ? { data: ACESSO, error: null }
          : { data: null, error: null };
      b.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ count: CONTAGEM, error: null }).then(res);
      return b;
    },
  })),
}));

import { GET, POST } from '@/app/api/assistant/generate/route';
import { generateCorrigeFacilReport } from '@/lib/corrigefacil/report-generator';

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost/api/assistant/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

const CORRIGEFACIL = {
  source: 'corrigefacil',
  assessmentId: '11111111-2222-4333-8444-555555555555',
  reportType: 'technical',
};

const MANUAL = {
  subjectIdentification: 'Fulano',
  area: 'Psicopedagogia',
  objetivo: 'Devolutiva',
  additionalNotes: 'dados da planilha',
};

beforeEach(() => {
  chamadas.openai = 0;
  chamadas.gerador = [];
  chamadas.filtros = [];
  chamadas.inserts = [];
  ACESSO = { has_active_assistant: true };
  CONTAGEM = 0;
  vi.clearAllMocks();
});

describe('PR3 · COM Relatório Pró ativo', () => {
  it('CorrigeFácil vai pelo fluxo pago, e a demo não é tocada', async () => {
    await post(CORRIGEFACIL);

    expect(generateCorrigeFacilReport).toHaveBeenCalledTimes(1);
    expect(chamadas.gerador[0].billingOrigin).toBe('subscription');
  });

  it('relatório manual continua gerando normalmente', async () => {
    const res = await post(MANUAL);

    expect(res.status).toBe(200);
    expect(chamadas.openai).toBe(1);
    expect(chamadas.inserts[0]).not.toHaveProperty('billing_origin');
  });

  it('a cota anda +1 no fluxo pago', async () => {
    CONTAGEM = 7;
    const body = await (await post(MANUAL)).json();
    expect(body.monthly_count).toBe(8);
  });

  it('no teto de 50 devolve 429, sem chamar a IA', async () => {
    CONTAGEM = 50;
    const res = await post(MANUAL);

    expect(res.status).toBe(429);
    expect(chamadas.openai).toBe(0);
  });
});

describe('PR3 · SEM Relatório Pró ativo', () => {
  beforeEach(() => {
    ACESSO = { has_active_assistant: false };
  });

  it('relatório manual continua sendo 403, e a IA nunca roda', async () => {
    const res = await post(MANUAL);

    expect(res.status).toBe(403);
    expect(chamadas.openai).toBe(0);
    expect(generateCorrigeFacilReport).not.toHaveBeenCalled();
  });

  it('CorrigeFácil segue para o gerador como free_demo', async () => {
    await post(CORRIGEFACIL);

    expect(chamadas.gerador[0].billingOrigin).toBe('free_demo');
  });

  it('o teto de 50 NÃO bloqueia a demonstração', async () => {
    // A conta pode ter 50 relatórios pagos de um plano vencido: isso não tem
    // nada a ver com a demonstração, que é uma só na vida e vem do banco.
    CONTAGEM = 50;
    await post(CORRIGEFACIL);

    expect(chamadas.gerador).toHaveLength(1);
    expect(chamadas.gerador[0].billingOrigin).toBe('free_demo');
  });
});

describe('PR3 · o cliente NÃO escolhe a origem', () => {
  it('payload pedindo free_demo COM Pró ativo continua subscription', async () => {
    await post({ ...CORRIGEFACIL, billing_origin: 'free_demo', billingOrigin: 'free_demo' });

    expect(chamadas.gerador[0].billingOrigin).toBe('subscription');
  });

  it('payload pedindo subscription SEM Pró continua free_demo', async () => {
    ACESSO = { has_active_assistant: false };
    await post({ ...CORRIGEFACIL, billing_origin: 'subscription' });

    expect(chamadas.gerador[0].billingOrigin).toBe('free_demo');
  });

  it('payload não consegue burlar o 403 do relatório manual', async () => {
    ACESSO = { has_active_assistant: false };
    const res = await post({ ...MANUAL, billing_origin: 'subscription' });

    expect(res.status).toBe(403);
    expect(chamadas.openai).toBe(0);
  });
});

describe('PR3 · a cota conta SOMENTE subscription', () => {
  it('o POST filtra a contagem por billing_origin', async () => {
    await post(MANUAL);
    expect(chamadas.filtros).toContainEqual(['billing_origin', 'subscription']);
    expect(chamadas.filtros).toContainEqual(['user_id', 'user-1']);
  });

  it('o GET filtra a contagem por billing_origin', async () => {
    CONTAGEM = 3;
    const res = await GET();
    const body = await res.json();

    expect(chamadas.filtros).toContainEqual(['billing_origin', 'subscription']);
    expect(body.monthly_count).toBe(3);
    expect(body.monthly_limit).toBe(50);
  });

  it('o GET segue exigindo Relatório Pró', async () => {
    ACESSO = { has_active_assistant: false };
    expect((await GET()).status).toBe(403);
  });
});
