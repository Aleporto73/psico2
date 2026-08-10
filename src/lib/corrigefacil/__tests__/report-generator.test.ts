import { describe, expect, it } from 'vitest';
import {
  buildCorrigeFacilSystemPrompt,
  formatAgeAtEvaluation,
  formatClosedResults,
  professionalText,
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

  it('manda profissão flexionada e sigla ao prompt, nunca o código do banco', () => {
    const texto = professionalText({
      display_name: 'Ana Souza',
      gender: 'F',
      profession_category: 'psicologo',
      credential_type: 'crp',
      credential_number: '06/12345',
    });

    expect(texto).toContain('Profissão: Psicóloga');
    expect(texto).toContain('Registro/credencial: CRP 06/12345');
    expect(texto).not.toContain('psicologo');
    expect(texto).not.toContain('crp 06/12345');
  });

  it('sem gênero usa a forma neutra e não quebra o bloco', () => {
    const texto = professionalText({
      display_name: 'Alex Lima',
      profession_category: 'fonoaudiologo',
      credential_type: 'crfa',
      credential_number: '1234',
    });

    expect(texto).toContain('Nome: Alex Lima');
    expect(texto).toContain('Profissão: Fonoaudiólogo(a)');
    expect(texto).toContain('Registro/credencial: CRFa 1234');
  });

  it('categoria sem rótulo publicável omite a linha em vez de vazar o código', () => {
    const texto = professionalText({
      display_name: 'Chris Reis',
      profession_category: 'outro',
      credential_type: 'nao_informado',
      credential_number: null,
    });

    expect(texto).toBe('Nome: Chris Reis');
    expect(texto).not.toContain('Profissão:');
    expect(texto).not.toContain('outro');
    expect(texto).not.toContain('nao_informado');
  });

  it('perfil ausente continua declarado como ausente', () => {
    expect(professionalText(null)).toBe('Perfil profissional: não incluído.');
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
