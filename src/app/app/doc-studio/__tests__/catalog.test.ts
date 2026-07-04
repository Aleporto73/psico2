import { describe, expect, it } from 'vitest';
import { getActiveTemplates, listDocumentKinds, searchTemplates } from '../template-catalog';
import { templates } from '../templates';
import { normalizeText } from '../lib/format';

function ids(list: ReturnType<typeof searchTemplates>): string[] {
  return list.map((template) => template.id).sort();
}

describe('busca ignora acento e caixa', () => {
  it('normaliza acento e caixa de forma equivalente', () => {
    expect(normalizeText('Avaliação')).toBe('avaliacao');
    expect(normalizeText('avaliação')).toBe(normalizeText('avaliacao'));
  });

  it('encontra "família" buscando "familia" (sem acento)', () => {
    const result = searchTemplates({ query: 'familia' });
    expect(result.some((template) => template.id === 'family-feedback')).toBe(true);
  });

  it('ignora maiúsculas/minúsculas', () => {
    const lower = searchTemplates({ query: 'família' });
    const upper = searchTemplates({ query: 'FAMÍLIA' });
    expect(ids(upper)).toEqual(ids(lower));
    expect(upper.some((template) => template.id === 'family-feedback')).toBe(true);
  });
});

describe('templates hidden não aparecem por padrão', () => {
  it('só retorna templates active na busca', () => {
    expect(searchTemplates().every((template) => template.status === 'active')).toBe(true);
  });

  it('getActiveTemplates exclui hidden por padrão', () => {
    expect(getActiveTemplates().every((template) => template.status === 'active')).toBe(true);
  });
});

describe('filtros', () => {
  it('filtra por linha', () => {
    expect(searchTemplates({ line: 'psychology' }).every((template) => template.line === 'psychology')).toBe(true);
    expect(searchTemplates({ line: 'psychopedagogy' }).every((template) => template.line === 'psychopedagogy')).toBe(
      true,
    );
  });

  it('filtra por tipo de documento existente na linha', () => {
    const kinds = listDocumentKinds('psychopedagogy');
    expect(kinds).toContain('referral');
    const referrals = searchTemplates({ line: 'psychopedagogy', documentKind: 'referral' });
    expect(referrals.length).toBeGreaterThan(0);
    expect(referrals.every((template) => template.documentKind === 'referral')).toBe(true);
  });

  it('retorna vazio quando a busca não casa', () => {
    expect(searchTemplates({ query: 'zzzzzznaoexiste' })).toHaveLength(0);
  });
});

describe('ordenação por profile_type não quebra', () => {
  it('mantém o mesmo conjunto, apenas reordenado', () => {
    const base = searchTemplates({});
    const sorted = searchTemplates({ profileType: 'psychologist' });
    expect(ids(sorted)).toEqual(ids(base));
  });

  it('coloca recomendados do perfil primeiro', () => {
    const sorted = searchTemplates({ profileType: 'psychologist' });
    const firstRecommendedIndex = sorted.findIndex((template) =>
      template.recommendedForProfileTypes.includes('psychologist'),
    );
    const firstNotRecommendedIndex = sorted.findIndex(
      (template) => !template.recommendedForProfileTypes.includes('psychologist'),
    );
    if (firstRecommendedIndex !== -1 && firstNotRecommendedIndex !== -1) {
      expect(firstRecommendedIndex).toBeLessThan(firstNotRecommendedIndex);
    }
  });
});

// ── Travas do catálogo v1 (spec v1.1) ──────────────────────────────────────

const HIDDEN_ID = 'psychological-followup-summary';

// Ids esperados por linha (chaves internas; os títulos batem com a spec v1.1).
const PSYCHOPEDAGOGY_IDS = [
  'psychopedagogy-anamnesis',
  'psychopedagogy-family-interview',
  'psychopedagogy-learner-interview',
  'psychopedagogy-teacher-interview',
  'psychopedagogy-school-observation',
  'psychopedagogy-play-observation',
  'psychopedagogy-session',
  'family-feedback',
  'school-feedback',
  'school-followup',
  'psychopedagogy-observation-report',
  'psychopedagogy-aee-report',
  'psychopedagogy-support-plan',
  'psychopedagogy-referral',
  'psychopedagogy-authorization',
] as const;

const PSYCHOLOGY_ACTIVE_IDS = [
  'psychology-anamnesis-adult',
  'psychology-anamnesis-child',
  'psychological-progress-note',
  'psychology-treatment-plan',
  'psychological-report',
  'psychological-report-cfp',
  'psychology-opinion',
  'psychological-referral',
  'psychology-clinical-feedback',
  'psychology-family-guidance',
  'psychology-therapy-contract',
  'psychology-minor-authorization',
  'psychology-online-protocol',
  'psychology-attendance-declaration',
  'psychology-tcle',
] as const;

// Termos proibidos por palavra (não substring): "ia" casaria com "psicologia",
// "cid" com outras palavras. Tokenizamos e comparamos por igualdade de token.
const FORBIDDEN_CLINICAL = ['laudo', 'diagnostico', 'dsm', 'cid', 'teste', 'escala'];
const FORBIDDEN_AI = ['ia', 'ai'];

function words(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

describe('catálogo v1 — contagem e status', () => {
  it('tem 30 templates ativos', () => {
    expect(getActiveTemplates()).toHaveLength(30);
  });

  it('linha psychopedagogy tem 15 ativos', () => {
    expect(getActiveTemplates().filter((t) => t.line === 'psychopedagogy')).toHaveLength(15);
  });

  it('linha psychology tem 15 ativos', () => {
    expect(getActiveTemplates().filter((t) => t.line === 'psychology')).toHaveLength(15);
  });

  it('existe exatamente 1 template hidden: psychological-followup-summary', () => {
    const hidden = templates.filter((t) => t.status === 'hidden');
    expect(hidden.map((t) => t.id)).toEqual([HIDDEN_ID]);
  });
});

describe('catálogo v1 — ids da spec', () => {
  it('todos os ids psicopedagógicos existem, active e na linha psychopedagogy', () => {
    expect(PSYCHOPEDAGOGY_IDS).toHaveLength(15);
    for (const id of PSYCHOPEDAGOGY_IDS) {
      const template = templates.find((t) => t.id === id);
      expect(template, `id ausente: ${id}`).toBeDefined();
      expect(template?.status).toBe('active');
      expect(template?.line).toBe('psychopedagogy');
    }
  });

  it('todos os ids psicológicos ativos existem, active e na linha psychology (hidden não conta)', () => {
    expect(PSYCHOLOGY_ACTIVE_IDS).toHaveLength(15);
    expect(PSYCHOLOGY_ACTIVE_IDS).not.toContain(HIDDEN_ID);
    for (const id of PSYCHOLOGY_ACTIVE_IDS) {
      const template = templates.find((t) => t.id === id);
      expect(template, `id ausente: ${id}`).toBeDefined();
      expect(template?.status).toBe('active');
      expect(template?.line).toBe('psychology');
    }
  });
});

describe('relatório psicológico estruturado CFP', () => {
  const cfp = templates.find((t) => t.id === 'psychological-report-cfp');

  it('existe e está active', () => {
    expect(cfp).toBeDefined();
    expect(cfp?.status).toBe('active');
  });

  it('tem metadados obrigatórios (kind/risco/cabeçalho/profissão/rodapé)', () => {
    expect(cfp?.documentKind).toBe('psychological_report');
    expect(cfp?.riskLevel).toBe('restricted');
    expect(cfp?.requiresHeader).toBe(true);
    expect(cfp?.allowedProfessionCategories).toContain('psicologo');
    expect((cfp?.ethicalFooter ?? '').trim().length).toBeGreaterThan(0);
  });

  it('tem as 5 seções estruturais na ordem CFP', () => {
    expect(cfp?.sections.map((s) => s.title)).toEqual([
      'Identificação',
      'Descrição da demanda',
      'Procedimento',
      'Análise',
      'Conclusão',
    ]);
  });
});

describe('segurança de linguagem — templates ativos', () => {
  const active = getActiveTemplates();

  it('nenhum título ativo contém termo clínico proibido', () => {
    for (const template of active) {
      const tokens = words(template.title);
      for (const forbidden of FORBIDDEN_CLINICAL) {
        expect(tokens, `título "${template.title}" contém "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });

  it('nenhum searchTerm ativo contém termo clínico proibido', () => {
    for (const template of active) {
      const tokens = template.searchTerms.flatMap(words);
      for (const forbidden of FORBIDDEN_CLINICAL) {
        expect(tokens, `searchTerms de "${template.title}" contém "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });

  it('nenhum título, descrição ou searchTerm ativo promete IA', () => {
    for (const template of active) {
      const tokens = [
        ...words(template.title),
        ...words(template.description),
        ...template.searchTerms.flatMap(words),
      ];
      for (const forbidden of FORBIDDEN_AI) {
        expect(tokens, `"${template.title}" contém token "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});
