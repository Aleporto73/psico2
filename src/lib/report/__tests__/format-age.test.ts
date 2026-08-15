// Equivalência da extração: `formatAgeAtEvaluation` mudou de arquivo no
// Bloco 7A e NÃO podia mudar de comportamento — o mesmo texto vai ao prompt
// e ao documento. Os casos abaixo cobrem as cinco formas que
// `subject_meta.age_at_evaluation` assume na prática.

import { describe, expect, it } from 'vitest';
import { formatAgeAtEvaluation } from '../format-age';
import { formatAgeAtEvaluation as doMotor } from '@/lib/corrigefacil/report-generator';

describe('idade na avaliação — formatação', () => {
  it('idade manual preserva só a precisão informada', () => {
    expect(formatAgeAtEvaluation({ years: 8 })).toBe('8 anos');
  });

  it('anos e meses', () => {
    expect(formatAgeAtEvaluation({ years: 4, months: 3 })).toBe('4 anos e 3 meses');
  });

  it('anos, meses e dias', () => {
    expect(formatAgeAtEvaluation({ years: 1, months: 7, days: 12 })).toBe(
      '1 ano, 7 meses e 12 dias',
    );
  });

  it('idade corrigida é marcada', () => {
    expect(
      formatAgeAtEvaluation({ years: 1, months: 7, days: 12, corrected: true }),
    ).toBe('1 ano, 7 meses e 12 dias (idade corrigida)');
  });

  it('dado inválido não vira texto inventado', () => {
    expect(formatAgeAtEvaluation(null)).toBeNull();
    expect(formatAgeAtEvaluation(undefined)).toBeNull();
    expect(formatAgeAtEvaluation('8 anos')).toBeNull();
    expect(formatAgeAtEvaluation({})).toBeNull();
    expect(formatAgeAtEvaluation({ months: 3 })).toBeNull();
    expect(formatAgeAtEvaluation({ years: -1 })).toBeNull();
    expect(formatAgeAtEvaluation({ years: Number.NaN })).toBeNull();
    expect(formatAgeAtEvaluation({ years: Number.POSITIVE_INFINITY })).toBeNull();
  });

  // Anos decimais passaram a ser IDADE, e não lixo: o C-TRF 1.5-5 coleta
  // 1,5 e o documento tem de mostrar 1,5. Os casos completos estão em
  // app/corrigefacil/__tests__/ctrf-idade-manual.test.ts; aqui fica a
  // fronteira do formatador.
  it('anos decimais saem com vírgula, sem arredondar', () => {
    expect(formatAgeAtEvaluation({ years: 8.5 })).toBe('8,5 anos');
    expect(formatAgeAtEvaluation({ years: 1.5 })).toBe('1,5 anos');
    expect(formatAgeAtEvaluation({ years: -1.5 })).toBeNull();
    // decimal com meses é registro incoerente: duas precisões para o mesmo
    // fato, e este arquivo não escolhe uma delas
    expect(formatAgeAtEvaluation({ years: 1.5, months: 3 })).toBeNull();
  });

  // Zero é precisão INFORMADA, diferente de ausente: "0 meses" foi coletado,
  // e some só quando a chave não existe.
  it('zero informado aparece; ausente não vira zero', () => {
    expect(formatAgeAtEvaluation({ years: 0, months: 0 })).toBe('0 anos e 0 meses');
    expect(formatAgeAtEvaluation({ years: 5, days: 2 })).toBe('5 anos e 2 dias');
  });
});

describe('equivalência com o que o motor exporta', () => {
  it('motor e documento produzem exatamente a mesma string', () => {
    const casos: unknown[] = [
      { years: 8 },
      { years: 4, months: 3 },
      { years: 1, months: 7, days: 12 },
      { years: 1, months: 7, days: 12, corrected: true },
      { years: 0, months: 0, days: 0 },
      { years: 1.5 },
      { years: 2.75 },
      {},
      null,
      'texto',
    ];

    for (const caso of casos) {
      expect(doMotor(caso)).toBe(formatAgeAtEvaluation(caso));
    }
  });
});
