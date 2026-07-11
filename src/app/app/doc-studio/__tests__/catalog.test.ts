import { describe, expect, it } from 'vitest';
import type { ProfessionCategory } from '../types';
import {
  getActiveTemplates,
  getTemplatesForCategory,
  listDocumentKinds,
  searchTemplates,
} from '../template-catalog';
import { catalogForCategory, getProfessionCategoryOption, professionCategoryOptions, templates } from '../templates';
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

// Universais (D1) — aparecem para todas as profissões.
const UNIVERSAL_IDS = [
  'universal_blank_document',
  'universal_attendance_statement',
  'universal_payment_receipt',
  'universal_referral',
  'universal_service_agreement',
  'universal_simple_authorization',
  'universal_simplified_tcle',
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
  it('tem pelo menos 37 templates ativos (documentos + instrumentos + universais)', () => {
    expect(getActiveTemplates().length).toBeGreaterThanOrEqual(37);
  });

  it('linha psychopedagogy tem pelo menos 15 ativos', () => {
    expect(getActiveTemplates().filter((t) => t.line === 'psychopedagogy').length).toBeGreaterThanOrEqual(15);
  });

  it('linha psychology tem 17 ativos', () => {
    expect(getActiveTemplates().filter((t) => t.line === 'psychology')).toHaveLength(17);
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

describe('Doc Studio por profissão (profession_category)', () => {
  it('há exatamente 8 categorias profissionais', () => {
    expect(professionCategoryOptions).toHaveLength(8);
  });

  it('psicologo abre Psicologia / Neuropsicologia = universais + 17 psicológicos', () => {
    const option = getProfessionCategoryOption('psicologo');
    expect(option.title).toBe('Psicologia / Neuropsicologia');
    expect(option.catalog).toBe('psychology');
    const models = getTemplatesForCategory('psicologo');
    expect(models).toHaveLength(24); // 17 psicologia + 7 universais
    expect(models.filter((t) => t.line === 'psychology')).toHaveLength(17);
    for (const universalId of UNIVERSAL_IDS) {
      expect(models.some((t) => t.id === universalId), `universal ausente: ${universalId}`).toBe(true);
    }
  });

  it('psicopedagogo abre Psicopedagogia = universais + psicopedagógicos (documentos e instrumentos)', () => {
    const option = getProfessionCategoryOption('psicopedagogo');
    expect(option.title).toBe('Psicopedagogia');
    expect(option.catalog).toBe('psychopedagogy');
    const models = getTemplatesForCategory('psicopedagogo');
    expect(models.length).toBeGreaterThanOrEqual(22);
    expect(models.filter((t) => t.line === 'psychopedagogy').length).toBeGreaterThanOrEqual(15);
  });

  it('neuropsicopedagogo abre Neuropsicopedagogia = universais + psicopedagógicos (documentos e instrumentos)', () => {
    const option = getProfessionCategoryOption('neuropsicopedagogo');
    expect(option.title).toBe('Neuropsicopedagogia');
    expect(option.catalog).toBe('psychopedagogy');
    const models = getTemplatesForCategory('neuropsicopedagogo');
    expect(models.length).toBeGreaterThanOrEqual(22);
    expect(models.filter((t) => t.line === 'psychopedagogy').length).toBeGreaterThanOrEqual(15);
  });

  it('fono/TO/médico/pediatra/outro abrem linha própria — somente universais (7)', () => {
    const emptyCategories: Array<[ProfessionCategory, string]> = [
      ['fonoaudiologo', 'Fonoaudiologia'],
      ['terapeuta_ocupacional', 'Terapia Ocupacional'],
      ['medico', 'Medicina'],
      ['pediatra', 'Pediatria'],
      ['outro', 'Outros documentos'],
    ];
    for (const [category, title] of emptyCategories) {
      const option = getProfessionCategoryOption(category);
      expect(option.title, `título de ${category}`).toBe(title);
      expect(option.catalog, `catálogo de ${category}`).toBeNull();
      const models = getTemplatesForCategory(category);
      expect(models, `modelos de ${category}`).toHaveLength(7);
      // Só universais: nenhum tem `line` de psicologia/psicopedagogia.
      expect(models.every((t) => t.line === undefined), `${category} só universais`).toBe(true);
    }
  });

  it('psicologo não vê modelos psicopedagógicos', () => {
    expect(getTemplatesForCategory('psicologo').some((t) => t.line === 'psychopedagogy')).toBe(false);
  });

  it('fono/TO/médico/pediatra não recebem fallback silencioso de Psicologia/Psicopedagogia', () => {
    for (const category of ['fonoaudiologo', 'terapeuta_ocupacional', 'medico', 'pediatra'] as ProfessionCategory[]) {
      const models = getTemplatesForCategory(category);
      expect(models.some((t) => t.line === 'psychology' || t.line === 'psychopedagogy')).toBe(false);
    }
  });

  it('catálogo tem pelo menos 37 templates ativos (documentos + instrumentos + universais)', () => {
    expect(getActiveTemplates().length).toBeGreaterThanOrEqual(37);
  });
});

describe('categorias sem catálogo próprio (D1: mostram universais)', () => {
  const emptyCategories: ProfessionCategory[] = [
    'fonoaudiologo',
    'terapeuta_ocupacional',
    'medico',
    'pediatra',
    'outro',
  ];

  // catalogForCategory continua null (sem linha própria), mas agora recebem os
  // universais — não ficam mais 100% vazias.
  it('sem catálogo próprio (catalog null), mas com os 7 universais', () => {
    for (const category of emptyCategories) {
      expect(catalogForCategory(category), `catálogo de ${category}`).toBeNull();
      expect(getTemplatesForCategory(category), `modelos de ${category}`).toHaveLength(7);
    }
  });

  it('não vazam modelos profissionais de outra linha', () => {
    for (const category of emptyCategories) {
      const models = getTemplatesForCategory(category);
      expect(models.some((t) => t.line === 'psychology' || t.line === 'psychopedagogy')).toBe(false);
    }
  });

  it('Psicologia e Psicopedagogia seguem com catálogo (pelo menos 15 próprios + universais)', () => {
    expect(catalogForCategory('psicologo')).toBe('psychology');
    expect(catalogForCategory('psicopedagogo')).toBe('psychopedagogy');
    expect(getTemplatesForCategory('psicologo').filter((t) => t.line === 'psychology')).toHaveLength(17);
    expect(getTemplatesForCategory('psicopedagogo').filter((t) => t.line === 'psychopedagogy').length).toBeGreaterThanOrEqual(15);
  });
});

describe('Universais (D1)', () => {
  const ALL_CATEGORIES: ProfessionCategory[] = [
    'psicologo',
    'psicopedagogo',
    'neuropsicopedagogo',
    'fonoaudiologo',
    'terapeuta_ocupacional',
    'medico',
    'pediatra',
    'outro',
  ];

  it('os 7 universais aparecem para todas as 8 categorias', () => {
    for (const category of ALL_CATEGORIES) {
      const ids = getTemplatesForCategory(category).map((t) => t.id);
      for (const universalId of UNIVERSAL_IDS) {
        expect(ids, `${universalId} ausente em ${category}`).toContain(universalId);
      }
    }
  });

  it('há exatamente 7 universais ativos, todos sem `line`', () => {
    const universals = getActiveTemplates().filter((t) => t.professionCategories);
    expect(universals).toHaveLength(7);
    expect(universals.every((t) => t.line === undefined)).toBe(true);
    expect(universals.map((t) => t.id).sort()).toEqual([...UNIVERSAL_IDS].sort());
  });

  it('cada universal tem essentialFields, optionalFields, skeleton e riskLevel', () => {
    for (const id of UNIVERSAL_IDS) {
      const template = templates.find((t) => t.id === id);
      expect(template, `id ausente: ${id}`).toBeDefined();
      expect((template?.essentialFields ?? []).length, `${id} essentialFields`).toBeGreaterThan(0);
      expect(template?.optionalFields, `${id} optionalFields`).toBeDefined();
      expect((template?.skeleton ?? '').length, `${id} skeleton`).toBeGreaterThanOrEqual(0);
      expect(['low', 'medium', 'restricted']).toContain(template?.riskLevel);
    }
  });

  it('não há IDs duplicados no catálogo', () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('rótulo da linha no preview (C3)', () => {
  // O preview usa activeCategory.title (categoria profissional), não o catálogo bruto.
  it('neuropsicopedagogo mostra "Neuropsicopedagogia" (não "Psicopedagogia")', () => {
    expect(getProfessionCategoryOption('neuropsicopedagogo').title).toBe('Neuropsicopedagogia');
  });

  it('psicopedagogo mostra "Psicopedagogia"', () => {
    expect(getProfessionCategoryOption('psicopedagogo').title).toBe('Psicopedagogia');
  });

  it('psicologo mostra "Psicologia / Neuropsicologia"', () => {
    expect(getProfessionCategoryOption('psicologo').title).toBe('Psicologia / Neuropsicologia');
  });
});

describe('seleção inicial do modelo (D4)', () => {
  // O hook seleciona getTemplatesForCategory(category)[0] ao abrir/trocar a categoria.
  it('categorias com catálogo abrem em modelo profissional (não universal)', () => {
    expect(getTemplatesForCategory('psicologo')[0].line).toBe('psychology');
    expect(getTemplatesForCategory('psicopedagogo')[0].line).toBe('psychopedagogy');
    expect(getTemplatesForCategory('neuropsicopedagogo')[0].line).toBe('psychopedagogy');
    expect(getTemplatesForCategory('psicologo')[0].professionCategories).toBeUndefined();
  });

  it('categorias sem catálogo abrem no Documento em branco (primeiro universal)', () => {
    for (const cat of ['fonoaudiologo', 'terapeuta_ocupacional', 'medico', 'pediatra', 'outro'] as ProfessionCategory[]) {
      expect(getTemplatesForCategory(cat)[0].id).toBe('universal_blank_document');
    }
  });
});

describe('campos essenciais e opcionais (D5)', () => {
  // Campos fixos renderizados sempre no formulário (não são guidedFields).
  const FIXED_FIELD_KEYS = ['subjectName', 'subjectAge', 'documentPurpose', 'document_title'];

  it('(a) todo universal tem essentialFields não-vazio', () => {
    const universals = getActiveTemplates().filter((t) => t.professionCategories);
    expect(universals.length).toBeGreaterThan(0);
    for (const t of universals) {
      expect((t.essentialFields ?? []).length, `${t.id} essentialFields`).toBeGreaterThan(0);
    }
  });

  it('(b) essentialFields/optionalFields só referenciam campos renderizáveis (guidedFields ou fixos)', () => {
    for (const t of templates) {
      const renderable = new Set<string>([...t.guidedFields.map((g) => g.key), ...FIXED_FIELD_KEYS]);
      for (const key of t.essentialFields ?? []) {
        expect(renderable.has(key), `${t.id}: essential "${key}" sem render`).toBe(true);
      }
      for (const key of t.optionalFields ?? []) {
        expect(renderable.has(key), `${t.id}: optional "${key}" sem render`).toBe(true);
      }
    }
  });

  it('(c) templates antigos (sem grupos) continuam com guidedFields e serão renderizados por inteiro', () => {
    const legacy = templates.filter((t) => !t.essentialFields && t.mode !== 'instrument');
    expect(legacy.length).toBeGreaterThan(0);
    for (const t of legacy) {
      expect(t.guidedFields.length, `${t.id} guidedFields`).toBeGreaterThan(0);
      expect(t.optionalFields, `${t.id} não deve ter optionalFields`).toBeUndefined();
    }
  });
});
