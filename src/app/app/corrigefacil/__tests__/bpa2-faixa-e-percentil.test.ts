// =====================================================================
// BPA-2 · os dois últimos pontos de paridade com a planilha controladora.
//
//   A · a IDADE resolve a faixa etária. A conversão por idade deixa de
//       pedir a faixa ao profissional, e manda a idade crua ao servidor
//       como chave numérica. A tela NÃO calcula faixa nenhuma: quem sabe
//       que 25 anos cai em 21-30 são os ranges dos `norm_sets`, e eles não
//       chegam ao browser.
//
//   B · percentil `< 1`. No BPA-2 a tabela normativa começa no percentil
//       1. Bruto abaixo do primeiro ponto sai da Edge com
//       `percentile: null` + `classification: 'Muito inferior'` e
//       `available: true` — o resultado EXISTE. "< 1" é como esse `null`
//       se escreve; nada vira 0, 1 nem 0,5, e nada é gravado.
//
// O que este arquivo protege, além do que ele exige:
//
//   · a conversão por escolaridade continua com a faixa MANUAL;
//   · os outros 20 instrumentos não ganham nem campo oculto nem "< 1";
//   · a regra do percentil é UMA, e os quatro destinos leem dela;
//   · o gráfico não entra nesta conta — `percentile` continua null, e
//     ponto sem barra continua sendo a leitura correta.
// =====================================================================

import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe, ResultadoEscala } from '@/lib/corrigefacil/api';
import {
  PERCENTIL_ABAIXO_DO_PRIMEIRO,
  textoDePercentil,
} from '@/lib/corrigefacil/metricas-instrumento';
import { formatClosedResults } from '@/lib/corrigefacil/report-generator';
import { colunasVisiveis, montarLinhas } from '@/lib/report/document-model';
import {
  FAIXA_PELA_IDADE,
  montarModelo,
  resolvidaPelaIdade,
} from '../avaliar/[code]/form-model';
import {
  estadoInicial,
  escolherDimensao,
  montarPedido,
  pendencias,
} from '../avaliar/[code]/form-state';
import {
  identificacaoInicial,
  montarPedidoAvaliacao,
} from '../avaliar/[code]/save-model';

// ---------------------------------------------------------------------
// o instrumento como o catálogo o entrega
// ---------------------------------------------------------------------

const ESCOLARIDADES = [
  'Não alfabetizado',
  'Ensino Fundamental',
  'Ensino Médio Técnico/Profissionalizante',
  'Ensino Superior e/ou Pós-Graduação',
];

/** As três dimensões do BPA-2, com as opções que a Edge devolve: a
 *  dimensão `faixa` traz faixa etária E escolaridade na mesma lista, que
 *  é justamente o que torna a escolha manual por idade um convite ao erro. */
function detalheBpa2(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
  return {
    code: 'BPA-2',
    name: 'BPA-2 — Bateria Psicológica para Avaliação da Atenção',
    entry_mode: 'componentes',
    score_type: 'percentil',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      { code: 'AA', name: 'Atenção alternada', kind: 'primaria', description: null, bruto_min: null, bruto_max: null },
      { code: 'AC', name: 'Atenção concentrada', kind: 'primaria', description: null, bruto_min: null, bruto_max: null },
      { code: 'AD', name: 'Atenção dividida', kind: 'primaria', description: null, bruto_min: null, bruto_max: null },
      { code: 'AG', name: 'Atenção geral', kind: 'composta', description: null, bruto_min: null, bruto_max: null },
    ],
    itens: [],
    opcoes_resposta: [],
    dimensoes: [
      { code: 'grupo', label: 'Grupo normativo', manual: true, opcoes: ['Brasil', 'Sudeste'] },
      { code: 'conversao', label: 'Conversão', manual: true, opcoes: ['idade', 'escolaridade'] },
      {
        code: 'faixa',
        label: 'Faixa',
        manual: false,
        opcoes: ['21-30', '31-40', '81+', 'Amostra total', ...ESCOLARIDADES],
      },
    ],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

const MODELO = montarModelo(detalheBpa2());

/** Protocolo completo: os três componentes das três escalas primárias. */
function componentesCompletos() {
  const c = { acertos: 100, erros: 3, omissoes: 2 };
  return { AA: { ...c }, AC: { ...c }, AD: { ...c } };
}

function estadoBpa2(selector: Record<string, string>) {
  return {
    ...estadoInicial(),
    selector,
    componentes: componentesCompletos(),
  };
}

// ---------------------------------------------------------------------
// A · idade determina faixa
// ---------------------------------------------------------------------

describe('BPA-2 por idade · a faixa é do servidor', () => {
  const POR_IDADE = { grupo: 'Brasil', conversao: 'idade' };

  it('1) a dimensão Faixa não é desenhada nem exigida', () => {
    expect(resolvidaPelaIdade(MODELO, POR_IDADE, 'faixa')).toBe(true);
    // as outras duas continuam sendo escolha do profissional
    expect(resolvidaPelaIdade(MODELO, POR_IDADE, 'grupo')).toBe(false);
    expect(resolvidaPelaIdade(MODELO, POR_IDADE, 'conversao')).toBe(false);

    const faltando = pendencias(MODELO, estadoBpa2(POR_IDADE));
    expect(faltando).toEqual([]);
  });

  it('1) o payload leva chave=25 e NENHUMA faixa escolhida à mão', () => {
    const pedido = montarPedido(MODELO, estadoBpa2(POR_IDADE), '25');
    expect(pedido.norm_selector).toEqual({
      grupo: 'Brasil',
      conversao: 'idade',
      chave: 25,
    });
    // número, não texto: a chave é numérica do lado do servidor
    expect(typeof pedido.norm_selector.chave).toBe('number');
    expect(pedido.norm_selector).not.toHaveProperty('faixa');
  });

  it('1) faixa que tenha sobrado no estado NÃO viaja no corpo', () => {
    // selector explícito manda no servidor: uma faixa antiga que escapasse
    // seria obedecida, e a idade informada viraria decoração
    const sujo = { ...POR_IDADE, faixa: '31-40' };
    const pedido = montarPedido(MODELO, estadoBpa2(sujo), '25');
    expect(pedido.norm_selector).toEqual({
      grupo: 'Brasil',
      conversao: 'idade',
      chave: 25,
    });
  });

  it('1) a tela não calcula faixa: manda a idade crua, inclusive 121', () => {
    // 121 é o caso que o teto artificial de 120 quebrava no servidor. Aqui
    // o ponto é outro e é o mesmo de sempre: a tela não traduz idade em
    // faixa, então não há tabela nenhuma para envelhecer aqui.
    for (const idade of ['6', '25', '81', '121', '130']) {
      const pedido = montarPedido(MODELO, estadoBpa2(POR_IDADE), idade);
      expect(pedido.norm_selector.chave).toBe(Number(idade));
    }
    const corpo = JSON.stringify(montarPedido(MODELO, estadoBpa2(POR_IDADE), '25'));
    for (const faixa of ['21-30', '31-40', '81+', 'Amostra total']) {
      expect(corpo).not.toContain(faixa);
    }
  });

  it('1) idade em branco não vira chave 0 — 0 é uma idade', () => {
    const pedido = montarPedido(MODELO, estadoBpa2(POR_IDADE), '   ');
    expect(pedido.norm_selector).toEqual({ grupo: 'Brasil', conversao: 'idade' });
  });

  it('1) o que é GRAVADO usa a mesma idade que corrigiu', () => {
    const identificacao = {
      ...identificacaoInicial(),
      nome: 'A. B.',
      idadeAnos: '25',
    };
    const pedido = montarPedidoAvaliacao(
      MODELO,
      estadoBpa2(POR_IDADE),
      identificacao,
    );
    expect(pedido.norm_selector).toEqual({
      grupo: 'Brasil',
      conversao: 'idade',
      chave: 25,
    });
  });

  it('2) por escolaridade a Faixa continua visível e exigida', () => {
    const porEscolaridade = { grupo: 'Brasil', conversao: 'escolaridade' };
    expect(resolvidaPelaIdade(MODELO, porEscolaridade, 'faixa')).toBe(false);

    const faltando = pendencias(MODELO, estadoBpa2(porEscolaridade));
    expect(faltando).toEqual([{ tipo: 'dimensoes', faltam: ['Faixa'] }]);

    // escolhida, o envio libera e ela vai no corpo como sempre foi —
    // nenhuma chave numérica entra aqui
    const escolhida = {
      ...porEscolaridade,
      faixa: 'Ensino Superior e/ou Pós-Graduação',
    };
    expect(pendencias(MODELO, estadoBpa2(escolhida))).toEqual([]);
    expect(montarPedido(MODELO, estadoBpa2(escolhida), '25').norm_selector).toEqual(
      escolhida,
    );
  });

  it('trocar a conversão limpa a faixa que já estava escolhida', () => {
    const antes = { grupo: 'Brasil', conversao: 'escolaridade', faixa: ESCOLARIDADES[0] };
    expect(escolherDimensao(MODELO, antes, 1, 'idade')).toEqual({
      grupo: 'Brasil',
      conversao: 'idade',
    });
  });

  it('a regra é do BPA-2, não de todo manual_choice=false', () => {
    // o ponto que separa esta correção de uma varredura genérica: há
    // instrumentos com a mesma configuração histórica de catálogo, e eles
    // continuam pedindo a escolha
    // O FDT entrou no mapa em 2026-08: a idade é a ÚNICA chave
    // normativa dele, e resolve sozinha uma entre nove faixas. A
    // guarda continua fechada — quem entra aqui é decisão, não
    // varredura de `manual_choice=false`.
    expect(Object.keys(FAIXA_PELA_IDADE)).toEqual(['BPA-2', 'FDT']);

    const outro = montarModelo(
      detalheBpa2({
        code: 'ETPC',
        dimensoes: [
          { code: 'conversao', label: 'Conversão', manual: true, opcoes: ['idade'] },
          { code: 'faixa', label: 'Faixa', manual: false, opcoes: ['6', '7'] },
        ],
      }),
    );
    const selector = { conversao: 'idade' };
    expect(resolvidaPelaIdade(outro, selector, 'faixa')).toBe(false);
    expect(pendencias(outro, estadoBpa2(selector))).toEqual([
      { tipo: 'dimensoes', faltam: ['Faixa'] },
    ]);
    expect(montarPedido(outro, estadoBpa2(selector), '25').norm_selector).toEqual({
      conversao: 'idade',
    });
  });
});

// ---------------------------------------------------------------------
// B · percentil < 1
// ---------------------------------------------------------------------

/** O resultado como a Edge o devolve. `available: true` é o ponto: o
 *  resultado existe, e o percentil é que está abaixo do primeiro ponto. */
function resultado(over: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: 12,
    score: null,
    percentile: null,
    z: null,
    classification: 'Muito inferior',
    available: true,
    message: null,
    flags: [],
    ...over,
  };
}

describe('BPA-2 · percentil abaixo do primeiro ponto tabelado', () => {
  it('3) percentil nulo + Muito inferior + disponível vira "< 1"', () => {
    expect(textoDePercentil('BPA-2', resultado())).toBe('< 1');
  });

  it('4) percentil numérico continua sendo o número', () => {
    expect(textoDePercentil('BPA-2', resultado({ percentile: 60, classification: 'Média' }))).toBe('60');
    // e o número manda mesmo quando a classificação é a da primeira faixa
    expect(textoDePercentil('BPA-2', resultado({ percentile: 1 }))).toBe('1');
  });

  it('5) outro instrumento com percentil nulo NÃO ganha "< 1"', () => {
    expect(textoDePercentil('EPQ-J', resultado())).toBe(null);
    expect(textoDePercentil('ERA-A', resultado())).toBe(null);
    expect(textoDePercentil(undefined, resultado())).toBe(null);
    // e o mapa é fechado: um instrumento a mais aqui é decisão, não descuido
    expect(Object.keys(PERCENTIL_ABAIXO_DO_PRIMEIRO)).toEqual(['BPA-2']);
  });

  it('nem toda ausência de percentil é "< 1"', () => {
    // outra classificação: o nulo ali não é o piso da tabela
    expect(textoDePercentil('BPA-2', resultado({ classification: 'Média' }))).toBe(null);
    // sem classificação nenhuma
    expect(textoDePercentil('BPA-2', resultado({ classification: null }))).toBe(null);
    // indisponível não tem quantitativo NENHUM, nem texto
    expect(
      textoDePercentil('BPA-2', resultado({ available: false, message: 'sem norma' })),
    ).toBe(null);
  });

  it('6) o documento profissional/PDF imprime "< 1" e mantém a coluna', () => {
    const linhas = montarLinhas({ AA: resultado(), AC: resultado({ percentile: 60 }) }, 'BPA-2');
    expect(linhas.map((l) => l.percentilTexto)).toEqual(['< 1', '60']);
    // o número gravado continua sendo o que o servidor gravou
    expect(linhas.map((l) => l.percentil)).toEqual([null, 60]);
    expect(colunasVisiveis(linhas).percentil).toBe(true);

    // e a coluna existe mesmo quando TODAS as linhas são "< 1" — é
    // justamente aí que ela tem o que dizer
    const soAbaixo = montarLinhas({ AA: resultado(), AC: resultado() }, 'BPA-2');
    expect(colunasVisiveis(soAbaixo).percentil).toBe(true);
  });

  it('6) outro instrumento sem percentil continua sem a coluna', () => {
    const linhas = montarLinhas({ TOTAL: resultado() }, 'CES-D');
    expect(linhas[0].percentilTexto).toBe(null);
    expect(colunasVisiveis(linhas).percentil).toBe(false);
  });

  it('7) o Relatório Pró recebe literalmente "- percentil: < 1"', () => {
    const linha = {
      raw: 12,
      score: null,
      percentile: null,
      z_score: null,
      classification: 'Muito inferior',
      ci95: null,
      available: true,
      message: null,
      flags: [],
      scales: { code: 'AA', name: 'Atenção alternada', ordinal: 0 },
    };
    const texto = formatClosedResults([linha], 'BPA-2');
    expect(texto).toContain('- percentil: < 1');
    expect(texto).not.toContain('- percentil: 0');
    expect(texto).not.toContain('- percentil: 1\n');
    expect(texto).not.toContain('null');
  });

  it('7) percentil numérico chega ao Relatório Pró como sempre chegou', () => {
    const linha = {
      raw: 90,
      score: null,
      percentile: 60,
      z_score: null,
      classification: 'Média',
      ci95: null,
      available: true,
      message: null,
      flags: [],
      scales: { code: 'AA', name: 'Atenção alternada', ordinal: 0 },
    };
    expect(formatClosedResults([linha], 'BPA-2')).toContain('- percentil: 60');
  });

  it('7) linha indisponível não ganha percentil no Relatório Pró', () => {
    const linha = {
      raw: null,
      score: null,
      percentile: null,
      z_score: null,
      classification: null,
      ci95: null,
      available: false,
      message: 'não há norma publicada para esta idade neste domínio',
      flags: [],
      scales: { code: 'AA', name: 'Atenção alternada', ordinal: 0 },
    };
    const texto = formatClosedResults([linha], 'BPA-2');
    expect(texto).not.toContain('percentil');
    expect(texto).toContain('- disponível: não');
  });
});
