import { describe, expect, it } from 'vitest';
import {
  buildCorrigeFacilSystemPrompt,
  formatAgeAtEvaluation,
  formatClosedResults,
} from '../report-generator';

describe('CorrigeFácil report generator', () => {
  it('preserva somente a precisão disponível da idade manual', () => {
    expect(formatAgeAtEvaluation({ years: 8 })).toBe('8 anos');
  });

  it('preserva idade calculada completa e marca idade corrigida', () => {
    expect(
      formatAgeAtEvaluation({
        years: 1,
        months: 7,
        days: 12,
        corrected: true,
      }),
    ).toBe('1 ano, 7 meses e 12 dias (idade corrigida)');
  });

  it('formata somente resultados persistidos sem incluir metadados internos', () => {
    const texto = formatClosedResults([
      {
        raw: 22,
        score: null,
        percentile: 95,
        z_score: 1.64,
        classification: 'Elevado',
        ci95: null,
        available: true,
        message: null,
        flags: ['internal_norm_row_42'],
        scales: {
          code: 'ANS',
          name: 'Ansiedade',
          kind: 'domain',
          ordinal: 1,
        },
      },
    ]);

    expect(texto).toContain('Ansiedade (ANS)');
    expect(texto).toContain('- bruto: 22');
    expect(texto).toContain('- percentil: 95');
    expect(texto).toContain('- classificação: Elevado');
    expect(texto).not.toContain('internal_norm_row_42');
    expect(texto).not.toContain('- tipo:');
    expect(texto).not.toContain('domain');
  });

  it('trava recálculo, corte, norma e diagnóstico no prompt CorrigeFácil', () => {
    const prompt = buildCorrigeFacilSystemPrompt(
      'technical',
      'AVISO FINAL TESTE',
    );

    expect(prompt).toContain('Não recalcule escores');
    expect(prompt).toContain('não selecione normas');
    expect(prompt).toContain('Não faça diagnóstico');
    expect(prompt).toContain('AVISO FINAL TESTE');
  });
});
