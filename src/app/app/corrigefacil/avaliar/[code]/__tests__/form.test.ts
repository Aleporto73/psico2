import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import { montarModelo } from '../form-model';
import {
  escolherDimensao,
  estadoInicial,
  montarPedido,
  opcoesDaDimensao,
  pendencias,
  podeEnviar,
} from '../form-state';

function detalhe(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'PHQ-9',
    name: 'PHQ-9 — Questionário de Saúde do Paciente',
    entry_mode: 'itens',
    score_type: 'escore_bruto',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      {
        code: 'TOTAL',
        name: 'Pontuação total',
        kind: 'primaria',
        description: null,
        bruto_min: 0,
        bruto_max: 27,
      },
    ],
    itens: [
      { numero: 1, texto: 'Pouco interesse em fazer as coisas' },
      { numero: 2, texto: 'Sentir-se para baixo' },
    ],
    opcoes_resposta: [
      { label: 'Nenhuma vez', value: 0 },
      { label: 'Vários dias', value: 1 },
      { label: 'Quase todos os dias', value: 3 },
    ],
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

describe('modelo do formulário', () => {
  it('20) preserva a ordem dos itens vinda da API', () => {
    const m = montarModelo(
      detalhe({
        itens: [
          { numero: 3, texto: 'c' },
          { numero: 1, texto: 'a' },
          { numero: 2, texto: 'b' },
        ],
      }),
    );
    expect(m.itens.map((i) => i.numero)).toEqual([3, 1, 2]);
  });

  it('21) preserva as opções: global por padrão, própria quando o item tem', () => {
    const m = montarModelo(
      detalhe({
        itens: [
          { numero: 1, texto: 'usa a global' },
          {
            numero: 2,
            texto: 'tem conjunto próprio',
            opcoes: [
              { label: 'Nada', value: 0 },
              { label: 'Muito', value: 4 },
            ],
          },
        ],
      }),
    );
    expect(m.itens[0].opcoes.map((o) => o.value)).toEqual([0, 1, 3]);
    expect(m.itens[1].opcoes.map((o) => o.label)).toEqual(['Nada', 'Muito']);
  });

  it('24) data de nascimento só quando requires_birthdate=true', () => {
    expect(montarModelo(detalhe()).exigeDataNascimento).toBe(false);
    expect(montarModelo(detalhe({ requires_birthdate: true })).exigeDataNascimento).toBe(true);
  });

  it('25) prematuridade só quando supports_prematurity=true', () => {
    expect(montarModelo(detalhe()).suportaPrematuridade).toBe(false);
    expect(
      montarModelo(detalhe({ supports_prematurity: true })).suportaPrematuridade,
    ).toBe(true);
  });

  it('dimensão calculada sai dos selects e não bloqueia o instrumento', () => {
    const m = montarModelo(
      detalhe({
        requires_birthdate: true,
        dimensoes: [{ code: 'idade', label: 'Idade', manual: false, opcoes: [] }],
      }),
    );
    expect(m.bloqueio).toBeNull();
    expect(m.exigeDataNascimento).toBe(true);
    expect(m.dimensoes).toHaveLength(0);
  });

  it('entry_mode bruto/componentes ignora escala composta', () => {
    const escalas = [
      { code: 'A', name: 'A', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 10 },
      { code: 'T', name: 'Total', kind: 'composta', description: null, bruto_min: null, bruto_max: null },
    ];
    expect(montarModelo(detalhe({ entry_mode: 'bruto', escalas })).escalas.map((e) => e.code)).toEqual(['A']);
    expect(
      montarModelo(detalhe({ entry_mode: 'componentes', escalas })).escalas.map((e) => e.code),
    ).toEqual(['A']);
  });

  it('entry_mode desconhecido bloqueia', () => {
    expect(montarModelo(detalhe({ entry_mode: 'formato_novo' })).bloqueio).toBe(
      'modo_desconhecido',
    );
  });
});

describe('estado, validação e payload', () => {
  const m = montarModelo(detalhe());

  it('22) item obrigatório vazio bloqueia o envio', () => {
    const estado = estadoInicial();
    expect(pendencias(m, estado)[0]).toEqual({ tipo: 'itens', faltam: [1, 2] });
    expect(podeEnviar(m, estado, false)).toBe(false);
  });

  it('23) valor zero é resposta válida e libera o envio', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 0, 2: 0 } };
    expect(pendencias(m, estado)).toEqual([]);
    expect(podeEnviar(m, estado, false)).toBe(true);
    expect(montarPedido(m, estado).respostas).toEqual({ '1': 0, '2': 0 });
  });

  it('instrumento por data exige nascimento e data da avaliação', () => {
    const md = montarModelo(detalhe({ requires_birthdate: true }));
    const estado = { ...estadoInicial(), respostas: { 1: 0, 2: 0 } };
    expect(pendencias(md, estado)).toContainEqual({
      tipo: 'datas',
      faltam: ['Nascimento', 'Data da avaliação'],
    });
    expect(podeEnviar(md, estado, false)).toBe(false);
  });

  it('datas preenchidas liberam o envio sem calcular idade no cliente', () => {
    const md = montarModelo(detalhe({ requires_birthdate: true }));
    const estado = {
      ...estadoInicial(),
      birthDate: '2018-02-10',
      evaluationDate: '2026-08-07',
      respostas: { 1: 0, 2: 0 },
    };
    expect(pendencias(md, estado)).toEqual([]);
    expect(podeEnviar(md, estado, false)).toBe(true);
    expect(montarPedido(md, estado).norm_selector).toEqual({});
  });

  it('26) payload segue o contrato do POST /corrigir', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 1, 2: 3 } };
    const pedido = montarPedido(m, estado);

    expect(pedido).toEqual({
      instrument_code: 'PHQ-9',
      norm_selector: {},
      respostas: { '1': 1, '2': 3 },
    });
    expect(pedido).not.toHaveProperty('subject_label');
    expect(pedido).not.toHaveProperty('subject_meta');
    expect(pedido).not.toHaveProperty('brutos');
  });

  it('selector resolvido pelo servidor é repassado sem transformação', () => {
    const estado = {
      ...estadoInicial(),
      selector: { idade: '8' },
      respostas: { 1: 1, 2: 3 },
    };
    expect(montarPedido(m, estado).norm_selector).toEqual({ idade: '8' });
  });

  it('26b) entry_mode bruto envia brutos por código de escala', () => {
    const mb = montarModelo(detalhe({ entry_mode: 'bruto' }));
    const pedido = montarPedido(mb, { ...estadoInicial(), brutos: { TOTAL: 0 } });
    expect(pedido.brutos).toEqual({ TOTAL: 0 });
    expect(pedido.respostas).toBeUndefined();
  });

  it('26c) entry_mode componentes envia o objeto de componentes', () => {
    const mc = montarModelo(detalhe({ entry_mode: 'componentes' }));
    const estado = {
      ...estadoInicial(),
      componentes: { TOTAL: { acertos: 10, erros: 2, omissoes: 0 } },
    };
    expect(pendencias(mc, estado)).toEqual([]);
    expect(montarPedido(mc, estado).brutos).toEqual({
      TOTAL: { acertos: 10, erros: 2, omissoes: 0 },
    });
  });

  it('26d) componentes incompleto ainda pendura o envio', () => {
    const mc = montarModelo(detalhe({ entry_mode: 'componentes' }));
    const estado = { ...estadoInicial(), componentes: { TOTAL: { acertos: 1, erros: 1 } } };
    expect(pendencias(mc, estado)[0]).toEqual({ tipo: 'componentes', faltam: ['TOTAL'] });
  });

  it('27) envio duplo é bloqueado enquanto a chamada está em curso', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 1, 2: 1 } };
    expect(podeEnviar(m, estado, false)).toBe(true);
    expect(podeEnviar(m, estado, true)).toBe(false);
  });

  it('29) nenhum cálculo psicométrico local: o payload não carrega escore', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 3, 2: 3 } };
    const serializado = JSON.stringify(montarPedido(m, estado));
    for (const proibido of ['score', 'classification', 'percentile', 'total', 'raw']) {
      expect(serializado.toLowerCase()).not.toContain(proibido);
    }
  });

  it('30) nada de persistência: o módulo não conhece POST /avaliacao', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 1, 2: 1 } };
    expect(JSON.stringify(montarPedido(m, estado))).not.toContain('avaliacao');
  });
});

describe('dimensões de norma em cascata', () => {
  const comDimensoes = detalhe({
    dimensoes: [
      { code: 'regiao', label: 'Região', manual: true, opcoes: ['Sul', 'Sudeste'] },
      { code: 'sexo', label: 'Sexo', manual: true, opcoes: ['F', 'M'] },
    ],
    arvore: { Sul: { F: null }, Sudeste: { F: null, M: null } },
  });
  const m = montarModelo(comDimensoes);

  it('a primeira dimensão oferece as raízes da árvore', () => {
    expect(opcoesDaDimensao(m, comDimensoes.arvore, 0, {})).toEqual(['Sul', 'Sudeste']);
  });

  it('a segunda depende da primeira', () => {
    expect(opcoesDaDimensao(m, comDimensoes.arvore, 1, { regiao: 'Sul' })).toEqual(['F']);
    expect(opcoesDaDimensao(m, comDimensoes.arvore, 1, { regiao: 'Sudeste' })).toEqual(['F', 'M']);
  });

  it('trocar a primeira invalida a segunda', () => {
    const selector = { regiao: 'Sudeste', sexo: 'M' };
    expect(escolherDimensao(m, selector, 0, 'Sul')).toEqual({ regiao: 'Sul' });
  });

  it('dimensão não escolhida impede o envio', () => {
    const estado = { ...estadoInicial(), respostas: { 1: 1, 2: 1 } };
    expect(pendencias(m, estado).some((p) => p.tipo === 'dimensoes')).toBe(true);
  });
});
