// Doc Studio — camada de catálogo: busca, filtro e ordenação sobre templates.ts.
// Puro. Busca ignora acentos e caixa (via normalizeText).

import type {
  DocStudioDocumentKind,
  DocStudioTemplate,
  LineKey,
  ProfessionCategory,
  ProfileTypeKey,
} from './types';
import { catalogForCategory, templates } from './templates';
import { normalizeText } from './lib/format';

export interface CatalogFilters {
  query?: string;
  line?: LineKey;
  professionCategory?: ProfessionCategory;
  documentKind?: DocStudioDocumentKind;
  profileType?: ProfileTypeKey;
  includeHidden?: boolean;
}

export function getActiveTemplates(includeHidden = false): DocStudioTemplate[] {
  return includeHidden ? templates : templates.filter((template) => template.status === 'active');
}

export function getTemplatesForLine(line: LineKey, includeHidden = false): DocStudioTemplate[] {
  return getActiveTemplates(includeHidden).filter((template) => template.line === line);
}

/**
 * Modelos visíveis para uma profession_category. Resolve o catálogo da categoria e
 * filtra por allowedProfessionCategories. Categoria sem catálogo (fono/TO/médico/
 * pediatra/outro) retorna [] — sem fallback silencioso para outra linha.
 */
export function getTemplatesForCategory(
  category: ProfessionCategory,
  includeHidden = false,
): DocStudioTemplate[] {
  const catalog = catalogForCategory(category);
  if (!catalog) return [];
  return getActiveTemplates(includeHidden).filter(
    (template) => template.line === catalog && template.allowedProfessionCategories.includes(category),
  );
}

export function listDocumentKinds(line?: LineKey): DocStudioDocumentKind[] {
  const source = line ? getTemplatesForLine(line) : getActiveTemplates();
  return Array.from(new Set(source.map((template) => template.documentKind)));
}

export function listDocumentKindsForCategory(category: ProfessionCategory): DocStudioDocumentKind[] {
  return Array.from(new Set(getTemplatesForCategory(category).map((template) => template.documentKind)));
}

/** Recomendado primeiro: templates cujo recommendedForProfileTypes inclui o perfil. */
export function sortByProfileRecommendation(
  list: DocStudioTemplate[],
  profileType?: ProfileTypeKey,
): DocStudioTemplate[] {
  if (!profileType) return [...list];

  return [...list].sort((a, b) => {
    const aRec = a.recommendedForProfileTypes.includes(profileType) ? 0 : 1;
    const bRec = b.recommendedForProfileTypes.includes(profileType) ? 0 : 1;
    return aRec - bRec;
  });
}

function matchesQuery(template: DocStudioTemplate, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;

  const haystack = normalizeText(
    [template.title, template.category, template.description, ...template.searchTerms].join(' '),
  );

  // Todos os termos da busca precisam aparecer (AND), em qualquer ordem.
  return normalizedQuery
    .split(' ')
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function searchTemplates(filters: CatalogFilters = {}): DocStudioTemplate[] {
  const normalizedQuery = filters.query ? normalizeText(filters.query) : '';

  // Base: quando há professionCategory, parte só do que a categoria permite (pode ser []).
  const base = filters.professionCategory
    ? getTemplatesForCategory(filters.professionCategory, filters.includeHidden)
    : getActiveTemplates(filters.includeHidden);

  const filtered = base.filter((template) => {
    if (filters.line && template.line !== filters.line) return false;
    if (filters.documentKind && template.documentKind !== filters.documentKind) return false;
    return matchesQuery(template, normalizedQuery);
  });

  return sortByProfileRecommendation(filtered, filters.profileType);
}
