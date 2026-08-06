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
  buscarInstrumento,
  CAMINHO_FUNCAO,
  corrigirInstrumento,
  type InstrumentoDetalhe,
} from './api';

const ORIGEM = 'https://exemplo.supabase.co';
const TOKEN = 'jwt-do-usuario';

const DETALHE: InstrumentoDetalhe = {
  code: 'PHQ-9',
  name: 'PHQ-9',
  entry_mode: 'itens',
  score_type: 'escore_bruto',
  requires_birthdate: false,
  supports_prematurity: false,
  escalas: [],
  itens: [{ numero: 1, texto: 'a' }],
  opcoes_resposta: [{ label: 'Não', value: 0 }],
  dimensoes: [],
  arvore: {},
  faixas_classificacao: [],
};

const OK_CORRECAO = { instrument: 'PHQ-9', norm_selector: {}, resultados: {} };

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
      throw new SyntaxError('Unexpected token');
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

describe('detalhe do instrumento e correção', () => {
  it('1) GET detalhe usa o endpoint correto', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', fetchMock);

    await buscarInstrumento('PHQ-9');

    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGEM}${CAMINHO_FUNCAO}/catalogo/PHQ-9`);
  });

  it('2) o código é codificado na URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', fetchMock);

    await buscarInstrumento('C-TRF_1.5-5');

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${ORIGEM}${CAMINHO_FUNCAO}/catalogo/${encodeURIComponent('C-TRF_1.5-5')}`,
    );
  });

  it('3) o JWT vai no detalhe e na correção', async () => {
    const get = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', get);
    await buscarInstrumento('PHQ-9');
    expect(get.mock.calls[0][1].headers.authorization).toBe(`Bearer ${TOKEN}`);

    const post = vi.fn().mockResolvedValue(respostaJson(OK_CORRECAO));
    vi.stubGlobal('fetch', post);
    await corrigirInstrumento({ instrument_code: 'PHQ-9', norm_selector: {}, respostas: {} });
    expect(post.mock.calls[0][1].headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(post.mock.calls[0][1].headers['content-type']).toBe('application/json');
  });

  it('4) sessão ausente impede as duas requisições', async () => {
    mocks.sessionRef.current = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(buscarInstrumento('PHQ-9')).rejects.toMatchObject({ tipo: 'sem_sessao' });
    await expect(
      corrigirInstrumento({ instrument_code: 'PHQ-9', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'sem_sessao' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('5) POST de correção usa a rota base da função', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(OK_CORRECAO));
    vi.stubGlobal('fetch', fetchMock);

    await corrigirInstrumento({ instrument_code: 'PHQ-9', norm_selector: {}, respostas: {} });

    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGEM}${CAMINHO_FUNCAO}`);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('6 e 7) o body é o pedido literal, com zero preservado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(OK_CORRECAO));
    vi.stubGlobal('fetch', fetchMock);

    const pedido = {
      instrument_code: 'PHQ-9',
      norm_selector: {},
      respostas: { '1': 0, '2': 3 },
    };
    await corrigirInstrumento(pedido);

    const enviado = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(enviado).toEqual(pedido);
    expect(enviado.respostas['1']).toBe(0);
  });

  it('8) 400 traduzido, aproveitando a mensagem do servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ error: 'instrument_code é obrigatório' }, 400)),
    );
    const erro = await corrigirInstrumento({ instrument_code: '', norm_selector: {} }).catch(
      (e) => e,
    );
    expect(erro.tipo).toBe('dados_invalidos');
    expect(erro.message).toContain('instrument_code');
  });

  it('9) 401 traduzido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 401)));
    await expect(buscarInstrumento('X')).rejects.toMatchObject({ tipo: 'sessao_invalida' });
  });

  it('10) 403 traduzido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 403)));
    await expect(
      corrigirInstrumento({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'sem_acesso' });
  });

  it('11) 404 no detalhe vira instrumento não encontrado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ error: 'instrumento não disponível: X' }, 404)),
    );
    await expect(buscarInstrumento('X')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
  });

  it('12) 5xx traduzido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({}, 503)));
    await expect(buscarInstrumento('X')).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('422 do POST vira resposta recusada, com a mensagem da Edge', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respostaJson({ error: 'item 3: 9 não é alternativa deste item' }, 422),
        ),
    );
    const erro = await corrigirInstrumento({ instrument_code: 'X', norm_selector: {} }).catch(
      (e) => e,
    );
    expect(erro.tipo).toBe('resposta_recusada');
    expect(erro.message).toContain('item 3');
  });

  it('13) JSON inválido no POST é controlado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaQuebrada()));
    await expect(
      corrigirInstrumento({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('14) AbortSignal é repassado nas duas chamadas', async () => {
    const c = new AbortController();

    const get = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', get);
    await buscarInstrumento('PHQ-9', { signal: c.signal });
    expect(get.mock.calls[0][1].signal).toBe(c.signal);

    const post = vi.fn().mockResolvedValue(respostaJson(OK_CORRECAO));
    vi.stubGlobal('fetch', post);
    await corrigirInstrumento({ instrument_code: 'X', norm_selector: {} }, { signal: c.signal });
    expect(post.mock.calls[0][1].signal).toBe(c.signal);
  });

  it('código vazio não dispara requisição', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(buscarInstrumento('   ')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('corpo fora do contrato vira resposta_invalida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ code: 'X' })));
    await expect(buscarInstrumento('X')).rejects.toMatchObject({ tipo: 'resposta_invalida' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ instrument: 'X' })));
    await expect(
      corrigirInstrumento({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('28) o resultado devolvido é exatamente o da API, sem acréscimo', async () => {
    const resposta = {
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: {
        TOTAL: {
          raw: 18,
          score: 18,
          percentile: null,
          z: null,
          classification: 'Moderadamente grave',
          available: true,
          message: null,
          flags: [],
        },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(resposta)));

    await expect(
      corrigirInstrumento({
        instrument_code: 'PHQ-9',
        norm_selector: {},
        respostas: { '1': 2 },
      }),
    ).resolves.toEqual(resposta);
  });

  it('30) o cliente não conhece POST /avaliacao', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(OK_CORRECAO));
    vi.stubGlobal('fetch', fetchMock);
    await corrigirInstrumento({ instrument_code: 'PHQ-9', norm_selector: {}, respostas: {} });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('/avaliacao');
  });
});
