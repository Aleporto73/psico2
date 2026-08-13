// =====================================================================
// PHQ-9 · o impacto funcional na TELA.
//
// O item auxiliar é respondido como qualquer outro e não pontua. Do lado
// do formulário isso tem três consequências, e são as três que este
// arquivo trava:
//
//   1. ele sai da lista numerada e ganha seção própria (`auxiliar`/`secao`)
//   2. ele NÃO segura o envio — a mesma regra do servidor
//   3. ele NÃO entra no contador de progresso
//
// A 2 é a que mais importa: se a tela exigir o auxiliar e o servidor não,
// o profissional fica travado num campo que o servidor aceitaria vazio.
// =====================================================================

import { describe, expect, it } from 'vitest';
import type { InstrumentoDetalhe } from '@/lib/corrigefacil/api';
import { INSTRUCAO_DOS_ITENS, montarModelo } from '../form-model';
import { estadoInicial, pendencias, podeEnviar, progresso } from '../form-state';

const FREQUENCIA = [
  { label: 'Nenhuma vez', value: 0 },
  { label: 'Vários dias', value: 1 },
  { label: 'Mais da metade dos dias', value: 2 },
  { label: 'Quase todos os dias', value: 3 },
];

const IMPACTO = [
  { label: 'Nenhuma dificuldade', value: 0 },
  { label: 'Pouca dificuldade', value: 1 },
  { label: 'Muita dificuldade', value: 2 },
  { label: 'Extrema dificuldade', value: 3 },
];

/** O catálogo do PHQ-9 como a Edge o devolve: nove itens na lista global e
 *  o décimo com conjunto próprio, marcado como auxiliar. */
function phq9(over: Partial<InstrumentoDetalhe> = {}): InstrumentoDetalhe {
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
      ...Array.from({ length: 9 }, (_, i) => ({
        numero: i + 1,
        texto: `Item ${i + 1}`,
      })),
      {
        numero: 10,
        texto:
          'Quanto esses sintomas dificultaram trabalho/estudo, tarefas de ' +
          'casa ou relacionamento com outras pessoas?',
        opcoes: IMPACTO,
        auxiliar: true,
        secao: 'Impacto no dia a dia',
      },
    ],
    opcoes_resposta: FREQUENCIA,
    dimensoes: [],
    arvore: {},
    faixas_classificacao: [],
    ...over,
  };
}

/** Instrumento sem item auxiliar — para provar que nada mudou para os
 *  outros vinte. */
function semAuxiliar(): InstrumentoDetalhe {
  return phq9({
    code: 'DASS-21',
    itens: Array.from({ length: 3 }, (_, i) => ({
      numero: i + 1,
      texto: `Item ${i + 1}`,
    })),
  });
}

const nove = (v: number) =>
  Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, v]));

describe('PHQ-9 · o auxiliar no modelo do formulário', () => {
  it('marca o item 10 como auxiliar, com a seção, e os nove como comuns', () => {
    const m = montarModelo(phq9());

    expect(m.itens).toHaveLength(10);
    const pontuados = m.itens.filter((i) => !i.auxiliar);
    const auxiliares = m.itens.filter((i) => i.auxiliar);

    expect(pontuados.map((i) => i.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(auxiliares.map((i) => i.numero)).toEqual([10]);
    expect(auxiliares[0].secao).toBe('Impacto no dia a dia');

    // nenhum dos nove ganha seção: a lista numerada não tem cabeçalho
    expect(pontuados.every((i) => i.secao === null)).toBe(true);
  });

  it('o auxiliar usa as alternativas DELE, e os nove a lista global', () => {
    const m = montarModelo(phq9());

    expect(m.itens[0].opcoes.map((o) => o.label)).toEqual(
      FREQUENCIA.map((o) => o.label),
    );
    expect(m.itens[9].opcoes.map((o) => o.label)).toEqual(
      IMPACTO.map((o) => o.label),
    );

    // os dois conjuntos compartilham os valores 0..3 e dizem coisas
    // diferentes — é exatamente o que a lista única não representava
    expect(m.itens[0].opcoes.map((o) => o.value)).toEqual([0, 1, 2, 3]);
    expect(m.itens[9].opcoes.map((o) => o.value)).toEqual([0, 1, 2, 3]);
    expect(m.itens[0].opcoes[3].label).not.toBe(m.itens[9].opcoes[3].label);
  });

  it('instrumento sem auxiliar não ganha marcação nenhuma', () => {
    const m = montarModelo(semAuxiliar());
    expect(m.itens.every((i) => i.auxiliar === false)).toBe(true);
    expect(m.itens.every((i) => i.secao === null)).toBe(true);
  });
});

describe('PHQ-9 · o auxiliar não segura o envio', () => {
  it('os nove respondidos bastam — o impacto em branco não é pendência', () => {
    const m = montarModelo(phq9());
    const estado = { ...estadoInicial(), respostas: nove(1) };

    expect(pendencias(m, estado)).toEqual([]);
    expect(podeEnviar(m, estado, false)).toBe(true);
  });

  it('faltando um dos NOVE, o envio trava e aponta o item certo', () => {
    const m = montarModelo(phq9());
    const respostas = nove(1);
    delete respostas[7];
    const estado = { ...estadoInicial(), respostas };

    expect(podeEnviar(m, estado, false)).toBe(false);
    expect(pendencias(m, estado)).toEqual([{ tipo: 'itens', faltam: [7] }]);
    // e o 10 nunca aparece como faltando
    expect(pendencias(m, estado)[0]).not.toHaveProperty('faltam', [7, 10]);
  });

  it('responder o impacto não muda nada no envio', () => {
    const m = montarModelo(phq9());
    const sem = { ...estadoInicial(), respostas: nove(1) };
    const com = { ...estadoInicial(), respostas: { ...nove(1), 10: 3 } };

    expect(podeEnviar(m, sem, false)).toBe(podeEnviar(m, com, false));
    expect(pendencias(m, com)).toEqual(pendencias(m, sem));
  });
});

describe('PHQ-9 · o progresso conta os nove', () => {
  it('nove de nove com o impacto em branco', () => {
    const m = montarModelo(phq9());
    const estado = { ...estadoInicial(), respostas: nove(0) };

    // o que NÃO pode acontecer: "9 de 10" com o protocolo inteiro
    // respondido, mandando o profissional procurar um item que não falta
    expect(progresso(m, estado)).toEqual({ respondidos: 9, total: 9 });
  });

  it('o impacto respondido não infla o contador', () => {
    const m = montarModelo(phq9());
    const estado = { ...estadoInicial(), respostas: { ...nove(0), 10: 2 } };
    expect(progresso(m, estado)).toEqual({ respondidos: 9, total: 9 });
  });

  it('meio protocolo conta certo', () => {
    const m = montarModelo(phq9());
    const estado = {
      ...estadoInicial(),
      respostas: { 1: 0, 2: 1, 3: 2, 10: 3 },
    };
    expect(progresso(m, estado)).toEqual({ respondidos: 3, total: 9 });
  });
});

// =====================================================================
// O ENUNCIADO dos nove itens.
//
// Ele vale para os itens 1-9 e para mais nada: o impacto funcional
// pergunta outra coisa, tem enunciado próprio e fica em seção separada.
// Como o contrato do catálogo não transporta `instrument.instruction`, o
// texto mora num mapa fechado por código de instrumento — e este bloco
// existe para travar as duas metades disso: que o PHQ-9 tem, e que
// nenhum outro instrumento ganhou.
// =====================================================================

const ENUNCIADO =
  'Durante os últimos 14 dias, com que frequência você foi afetado(a) ' +
  'por algum dos seguintes problemas?';

describe('PHQ-9 · o enunciado dos nove itens', () => {
  it('o texto é EXATAMENTE o da planilha corrigida', () => {
    expect(montarModelo(phq9()).instrucaoItens).toBe(ENUNCIADO);
    // literal, sem depender do mapa — se alguém reescrever a constante,
    // este teste é que decide quem está certo
    expect(montarModelo(phq9()).instrucaoItens).toBe(
      'Durante os últimos 14 dias, com que frequência você foi afetado(a) ' +
        'por algum dos seguintes problemas?',
    );
  });

  it('o enunciado NÃO é o do impacto funcional', () => {
    const m = montarModelo(phq9());
    const auxiliar = m.itens.find((i) => i.auxiliar)!;

    // são dois textos distintos, e o do auxiliar continua no item dele
    expect(m.instrucaoItens).not.toBe(auxiliar.texto);
    expect(m.instrucaoItens).not.toMatch(/dificultaram/);
    expect(auxiliar.texto).toMatch(/dificultaram/);
    // e a seção do auxiliar tem título próprio, que não é o enunciado
    expect(auxiliar.secao).toBe('Impacto no dia a dia');
    expect(auxiliar.secao).not.toBe(m.instrucaoItens);
  });

  it('SÓ o PHQ-9 tem enunciado: nenhum outro instrumento ganhou', () => {
    // o mapa é fechado. Este teste é o que impede um texto de vazar para
    // os outros vinte numa edição distraída.
    expect(Object.keys(INSTRUCAO_DOS_ITENS)).toEqual(['PHQ-9']);
    expect(montarModelo(semAuxiliar()).instrucaoItens).toBeNull();
    expect(montarModelo(phq9({ code: 'CES-D' })).instrucaoItens).toBeNull();
  });

  it('instrumento que não é por itens não recebe enunciado de item', () => {
    const bruto = montarModelo(
      phq9({ code: 'PHQ-9', entry_mode: 'bruto', itens: [] }),
    );
    expect(bruto.instrucaoItens).toBeNull();
  });
});
