// Doc Studio — camada de catálogo: busca, filtro e ordenação sobre templates.ts.
// Puro. Busca ignora acentos e caixa (via normalizeText).

import type {
  DocStudioDocumentKind,
  DocStudioTemplate,
  LineKey,
  ProfileTypeKey,
} from './types';
import { templates } from './templates';
import { normalizeText } from './lib/format';

export interface CatalogFilters {
  query?: string;
  line?: LineKey;
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

export function listDocumentKinds(line?: LineKey): DocStudioDocumentKind[] {
  const source = line ? getTemplatesForLine(line) : getActiveTemplates();
  return Array.from(new Set(source.map((template) => template.documentKind)));
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

  const filtered = getActiveTemplates(filters.includeHidden).filter((template) => {
    if (filters.line && template.line !== filters.line) return false;
    if (filters.documentKind && template.documentKind !== filters.documentKind) return false;
    return matchesQuery(template, normalizedQuery);
  });

  return sortByProfileRecommendation(filtered, filters.profileType);
}
