import { describe, expect, it } from 'vitest';
import type {
  InstrumentoDetalhe,
  ResultadoEscala,
} from '@/lib/corrigefacil/api';
import {
  faixasDivergemDoResultado,
  respostaDaAvaliacao,
} from '../graph-coherence';

function resultado(over: Partial<ResultadoEscala> = {}): ResultadoEscala {
  return {
    raw: null,
    score: null,
    percentile: null,
    z: null,
    classification: null,
    available: true,
    message: null,
    flags: [],
    ...over,
  };
}

/** PHQ-9: score_band com faixas em `score`, do registro visual aprovado. */
function phq9(labels: string[]): InstrumentoDetalhe {
  return {
    code: 'PHQ-9',
    name: 'PHQ-9',
    entry_mode: 'itens',
    score_type: 'score',
    requires_birthdate: false,
    supports_prematurity: false,
    escalas: [
      { code: 'TOTAL', name: 'Total', kind: 'total', description: null, bruto_min: 0, bruto_max: 27 },
    ],
    itens: [],
    opcoes_resposta: [],
    dimensoes: [],
    arvore: {},
    faixas_classificacao: labels.map((label, i) => ({
      scale: null,
      basis: 'score',
      min: i * 5,
      max: i * 5 + 4,
      label,
    })),
  };
}

describe('adaptação da avaliação salva', () => {
  it('reaproveita os três campos sem derivar nenhum valor', () => {
    const avaliacao = {
      instrument: 'PHQ-9',
      norm_selector: { faixa: 'adulto' },
      resultados: { TOTAL: resultado({ score: 12, classification: 'Moderado' }) },
    };

    expect(respostaDaAvaliacao(avaliacao)).toEqual({
      instrument: 'PHQ-9',
      norm_selector: { faixa: 'adulto' },
      resultados: avaliacao.resultados,
    });
    // mesma referência: nada é copiado, transformado ou recalculado
    expect(respostaDaAvaliacao(avaliacao).resultados).toBe(avaliacao.resultados);
  });
});

describe('fail closed — faixas de hoje contra resultado congelado', () => {
  it('não dispara quando a classificação salva casa com uma faixa atual', () => {
    const detalhe = phq9(['Mínimo', 'Leve', 'Moderado']);
    const resposta = respostaDaAvaliacao({
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: { TOTAL: resultado({ score: 12, classification: 'Moderado' }) },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(false);
  });

  // O modo de falha que motivou a guarda: `montarSegmentos` casa por RÓTULO.
  // Rótulo renomeado no acervo ⇒ nenhum segmento marcado ⇒ régua sem faixa
  // destacada, sem erro nenhum. O gráfico sai completo e mudo.
  it('dispara quando nenhuma faixa atual reconhece a classificação salva', () => {
    const detalhe = phq9(['Mínimo', 'Leve', 'Moderadamente grave']);
    const resposta = respostaDaAvaliacao({
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: { TOTAL: resultado({ score: 12, classification: 'Moderado' }) },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(true);
  });

  it('escala indisponível não é conferida', () => {
    const detalhe = phq9(['Mínimo', 'Leve', 'Moderado']);
    const resposta = respostaDaAvaliacao({
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: {
        TOTAL: resultado({
          classification: 'Rótulo que não existe mais',
          available: false,
          message: 'sem norma publicada',
        }),
      },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(false);
  });

  it('resultado sem classificação não é conferido', () => {
    const detalhe = phq9(['Mínimo', 'Leve', 'Moderado']);
    const resposta = respostaDaAvaliacao({
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: { TOTAL: resultado({ score: 12 }) },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(false);
  });

  // AUSÊNCIA DE RÉGUA NÃO É DIVERGÊNCIA. É o caso normal de instrumentos
  // cujos cortes não chegam ao cliente — o DCDQ resolve o corte por faixa
  // etária em norm_entries — e das famílias que plotam `classification`, em
  // que `basisDaMetrica` devolve null. Disparar aqui recusaria gráficos
  // corretos.
  it('sem faixas publicadas não há divergência a declarar', () => {
    const detalhe = phq9([]);
    const resposta = respostaDaAvaliacao({
      instrument: 'PHQ-9',
      norm_selector: {},
      resultados: { TOTAL: resultado({ score: 12, classification: 'Moderado' }) },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(false);
  });

  it('instrumento fora do registro visual não é declarado incoerente', () => {
    const detalhe = { ...phq9(['Mínimo']), code: 'INSTRUMENTO-INEXISTENTE' };
    const resposta = respostaDaAvaliacao({
      instrument: 'INSTRUMENTO-INEXISTENTE',
      norm_selector: {},
      resultados: { TOTAL: resultado({ score: 1, classification: 'Qualquer' }) },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(false);
  });

  it('uma única escala divergente já fecha o gráfico inteiro', () => {
    const detalhe: InstrumentoDetalhe = {
      ...phq9([]),
      code: 'DASS-21',
      escalas: [
        { code: 'DEPRESSAO', name: 'Depressão', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 42 },
        { code: 'ANSIEDADE', name: 'Ansiedade', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 42 },
        { code: 'ESTRESSE', name: 'Estresse', kind: 'primaria', description: null, bruto_min: 0, bruto_max: 42 },
      ],
      faixas_classificacao: [
        { scale: 'DEPRESSAO', basis: 'score', min: 0, max: 9, label: 'Normal' },
        { scale: 'ANSIEDADE', basis: 'score', min: 0, max: 7, label: 'Normal' },
        { scale: 'ESTRESSE', basis: 'score', min: 0, max: 14, label: 'Normal' },
      ],
    };

    const resposta = respostaDaAvaliacao({
      instrument: 'DASS-21',
      norm_selector: {},
      resultados: {
        DEPRESSAO: resultado({ score: 4, classification: 'Normal' }),
        ANSIEDADE: resultado({ score: 3, classification: 'Normal' }),
        // só esta não casa
        ESTRESSE: resultado({ score: 5, classification: 'Levemente elevado' }),
      },
    });

    expect(faixasDivergemDoResultado(detalhe, resposta)).toBe(true);
  });
});
