import { describe, expect, it } from 'vitest';
import { getActiveTemplates, listDocumentKinds, searchTemplates } from '../template-catalog';
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
