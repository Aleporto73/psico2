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
  buscarAvaliacao,
  CAMINHO_FUNCAO,
  listarAvaliacoes,
  salvarAvaliacao,
  type AvaliacaoDetalhe,
} from './api';

const ORIGEM = 'https://exemplo.supabase.co';
const TOKEN = 'jwt-do-usuario';
const ID = '15acc4e1-9089-44ad-afbe-e238aed45ca0';

const CRIADA = {
  assessment_id: ID,
  instrument: 'PHQ-9',
  norm_selector: {},
  status: 'concluida',
  resultados: {},
};

const DETALHE: AvaliacaoDetalhe = {
  assessment_id: ID,
  instrument: 'PHQ-9',
  status: 'concluida',
  norm_selector: {},
  subject_meta: { respondent_name: 'Auto-relato' },
  subject_label: 'SMK.A',
  created_at: '2026-08-06T00:52:40.098Z',
  completed_at: '2026-08-06T00:52:40.098Z',
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

describe('salvar, listar e abrir avaliação', () => {
  it('1) POST /avaliacao usa o endpoint correto', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(CRIADA, 201));
    vi.stubGlobal('fetch', fetchMock);

    await salvarAvaliacao({ instrument_code: 'PHQ-9', norm_selector: {}, respostas: {} });

    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGEM}${CAMINHO_FUNCAO}/avaliacao`);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('2) o body é fiel ao contrato, com zero preservado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(CRIADA, 201));
    vi.stubGlobal('fetch', fetchMock);

    const pedido = {
      instrument_code: 'PHQ-9',
      norm_selector: {},
      respostas: { '1': 0, '2': 3 },
      subject_label: 'A.B.C.',
      subject_meta: { respondent_name: 'Auto-relato' },
    };
    await salvarAvaliacao(pedido);

    const enviado = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(enviado).toEqual(pedido);
    expect(enviado.respostas['1']).toBe(0);
  });

  it('3) o JWT vai nas três chamadas', async () => {
    const casos: Array<[string, unknown, () => Promise<unknown>]> = [
      ['salvar', CRIADA, () => salvarAvaliacao({ instrument_code: 'X', norm_selector: {} })],
      ['listar', [], () => listarAvaliacoes()],
      ['detalhe', DETALHE, () => buscarAvaliacao(ID)],
    ];

    for (const [nome, resposta, executar] of casos) {
      const fetchMock = vi.fn().mockResolvedValue(respostaJson(resposta));
      vi.stubGlobal('fetch', fetchMock);

      await executar();

      expect(fetchMock.mock.calls[0][1].headers.authorization, nome).toBe(`Bearer ${TOKEN}`);
      expect(fetchMock.mock.calls[0][1].headers['content-type'], nome).toBe('application/json');
    }
  });

  it('4) sessão ausente impede as três requisições', async () => {
    mocks.sessionRef.current = null;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'sem_sessao' });
    await expect(listarAvaliacoes()).rejects.toMatchObject({ tipo: 'sem_sessao' });
    await expect(buscarAvaliacao(ID)).rejects.toMatchObject({ tipo: 'sem_sessao' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('5 e 6) GET /avaliacoes usa o endpoint e codifica os parâmetros reais', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson([]));
    vi.stubGlobal('fetch', fetchMock);

    await listarAvaliacoes({ limit: 100, offset: 20 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${ORIGEM}${CAMINHO_FUNCAO}/avaliacoes?limit=100&offset=20`,
    );
  });

  it('5b) sem parâmetros não sai query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson([]));
    vi.stubGlobal('fetch', fetchMock);
    await listarAvaliacoes();
    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGEM}${CAMINHO_FUNCAO}/avaliacoes`);
  });

  it('7) GET /avaliacao/:id codifica o identificador', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', fetchMock);

    await buscarAvaliacao('a/b c');

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${ORIGEM}${CAMINHO_FUNCAO}/avaliacao/${encodeURIComponent('a/b c')}`,
    );
  });

  it('35) id vazio não dispara requisição', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(buscarAvaliacao('  ')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('8) 400 traduzido com a mensagem do servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ error: 'informe respostas ou brutos' }, 400)),
    );
    const erro = await salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }).catch((e) => e);
    expect(erro.tipo).toBe('dados_invalidos');
    expect(erro.message).toContain('respostas');
  });

  it('9) 401 traduzido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 401)));
    await expect(listarAvaliacoes()).rejects.toMatchObject({ tipo: 'sessao_invalida' });
  });

  it('10) 403 traduzido no salvamento — o histórico não passa pelo gate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ error: 'x' }, 403)));
    await expect(
      salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'sem_acesso' });
  });

  it('11 e 36) 404 no detalhe não revela nada além do tipo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaJson({ error: 'avaliação não encontrada' }, 404)),
    );
    const erro = await buscarAvaliacao(ID).catch((e) => e);
    expect(erro.tipo).toBe('nao_encontrado');
    // nada do registro alheio vaza no erro
    expect(JSON.stringify(erro.message)).not.toContain('SMK');
  });

  it('12) 422 real do POST /avaliacao: protocolo incompleto', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          respostaJson({ error: 'protocolo incompleto: 1 item(ns) sem resposta: 9' }, 422),
        ),
    );
    const erro = await salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }).catch((e) => e);
    expect(erro.tipo).toBe('resposta_recusada');
    expect(erro.message).toContain('protocolo incompleto');
  });

  it('13) 5xx traduzido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({}, 500)));
    await expect(listarAvaliacoes()).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('14) JSON inválido é controlado nas três', async () => {
    for (const executar of [
      () => salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }),
      () => listarAvaliacoes(),
      () => buscarAvaliacao(ID),
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaQuebrada()));
      await expect(executar()).rejects.toMatchObject({ tipo: 'resposta_invalida' });
    }
  });

  it('15) AbortSignal é repassado nas três', async () => {
    const c = new AbortController();

    const post = vi.fn().mockResolvedValue(respostaJson(CRIADA, 201));
    vi.stubGlobal('fetch', post);
    await salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }, { signal: c.signal });
    expect(post.mock.calls[0][1].signal).toBe(c.signal);

    const lista = vi.fn().mockResolvedValue(respostaJson([]));
    vi.stubGlobal('fetch', lista);
    await listarAvaliacoes({}, { signal: c.signal });
    expect(lista.mock.calls[0][1].signal).toBe(c.signal);

    const det = vi.fn().mockResolvedValue(respostaJson(DETALHE));
    vi.stubGlobal('fetch', det);
    await buscarAvaliacao(ID, { signal: c.signal });
    expect(det.mock.calls[0][1].signal).toBe(c.signal);
  });

  it('28 e 37) listagem e detalhe devolvem exatamente o que a API mandou', async () => {
    const lista = [
      { id: 'a', instrument_code: 'PHQ-9', subject_label: 'A', subject_meta: {}, status: 'concluida', completed_at: null },
      { id: 'b', instrument_code: 'CES-D', subject_label: 'B', subject_meta: {}, status: 'concluida', completed_at: null },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(lista)));
    await expect(listarAvaliacoes()).resolves.toEqual(lista);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(DETALHE)));
    await expect(buscarAvaliacao(ID)).resolves.toEqual(DETALHE);
  });

  it('corpo fora do contrato vira resposta_invalida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ nao: 'array' })));
    await expect(listarAvaliacoes()).rejects.toMatchObject({ tipo: 'resposta_invalida' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ instrument: 'X' })));
    await expect(buscarAvaliacao(ID)).rejects.toMatchObject({ tipo: 'resposta_invalida' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson({ instrument: 'X' }, 201)));
    await expect(
      salvarAvaliacao({ instrument_code: 'X', norm_selector: {} }),
    ).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('o detalhe NÃO traz respostas brutas do protocolo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaJson(DETALHE)));
    const d = await buscarAvaliacao(ID);
    expect(d).not.toHaveProperty('respostas');
    expect(d).not.toHaveProperty('brutos');
  });
});
