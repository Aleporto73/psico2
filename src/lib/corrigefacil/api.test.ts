import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sessionRef: { current: null as { access_token: string } | null },
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mocks.sessionRef.current } }),
    },
  }),
}));

import {
  buscarCatalogo,
  CAMINHO_FUNCAO,
  CorrigeFacilError,
  traduzirStatus,
  type InstrumentoResumo,
} from './api';

const ORIGEM = 'https://exemplo.supabase.co';
const TOKEN = 'jwt-do-usuario';

const INSTRUMENTOS: InstrumentoResumo[] = [
  {
    code: 'PHQ-9',
    name: 'PHQ-9 — Questionário de Saúde do Paciente',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
  },
];

function respostaJson(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as unknown as Response;
}

function respostaQuebrada(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  } as unknown as Response;
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGEM;
});

beforeEach(() => {
  mocks.sessionRef.current = { access_token: TOKEN };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cliente da Edge do CorrigeFácil', () => {
  it('13) envia o JWT da sessão no header Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson({ instrumentos: INSTRUMENTOS }));
    vi.stubGlobal('fetch', fetchMock);

    await buscarCatalogo();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers['content-type']).toBe('application/json');
    expect(init.method).toBe('GET');
    // nunca a chave de serviço no navegador
    expect(JSON.stringify(init)).not.toContain('service_role');
  });

  it('14) usa o endpoint real da função', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson({ instrumentos: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await buscarCatalogo();

    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGEM}${CAMINHO_FUNCAO}/catalogo`);
    expect(CAMINHO_FUNCAO).toBe('/functions/v1/corrigir');
  });

  it('15) 401 vira sessão inválida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 401)));

    await expect(buscarCatalogo()).rejects.toMatchObject({
      tipo: 'sessao_invalida',
      status: 401,
    });
  });

  it('16) 403 vira acesso comercial negado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 403)));

    const erro = await buscarCatalogo().catch((e) => e);
    expect(erro).toBeInstanceOf(CorrigeFacilError);
    expect(erro.tipo).toBe('sem_acesso');
    expect(erro.message).toContain('não liberado');
  });

  it('16b) 404 vira recurso ausente', () => {
    expect(traduzirStatus(404).tipo).toBe('nao_encontrado');
  });

  it('17) 5xx vira indisponibilidade temporária', async () => {
    for (const status of [500, 502, 503]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({}, status)));
      const erro = await buscarCatalogo().catch((e) => e);
      expect(erro.tipo, String(status)).toBe('indisponivel');
    }
  });

  it('18) JSON inválido vira erro controlado, não estouro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaQuebrada()));

    await expect(buscarCatalogo()).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('18b) 200 com corpo fora do contrato vira resposta_invalida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ outra_coisa: 1 })));

    await expect(buscarCatalogo()).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('19) sem sessão: NÃO dispara requisição', async () => {
    mocks.sessionRef.current = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(buscarCatalogo()).rejects.toMatchObject({ tipo: 'sem_sessao' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('20) AbortSignal é repassado ao fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson({ instrumentos: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await buscarCatalogo({ signal: controller.signal });

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('20b) devolve exatamente os instrumentos do contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ instrumentos: INSTRUMENTOS })));

    await expect(buscarCatalogo()).resolves.toEqual(INSTRUMENTOS);
  });
});
