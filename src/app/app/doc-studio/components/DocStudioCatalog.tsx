'use client';

// Catálogo por profissão: seletor de profession_category + busca + filtro por tipo.
// A lista é agrupada visualmente: "Modelos essenciais para todos" (universais) primeiro,
// depois "Modelos de {profissão}" (só quando existirem). Lógica pura em ../template-catalog.
// Só modelos `active` aparecem (padrão de searchTemplates).

import { useMemo, useState } from 'react';
import type {
  DocStudioDocumentKind,
  DocStudioTemplate,
  ProfessionCategory,
  ProfileTypeKey,
} from '../types';
import type { DocStudioState } from '../hooks/useDocStudioState';
import { listDocumentKindsForCategory, searchTemplates } from '../template-catalog';

const documentKindLabels: Record<DocStudioDocumentKind, string> = {
  formal_document: 'Documento formal',
  structured_form: 'Formulário estruturado',
  record: 'Registro',
  referral: 'Encaminhamento',
  family_orientation: 'Orientação à família',
  school_orientation: 'Orientação à escola',
  psychological_report: 'Relatório psicológico (CFP)',
};

function toProfileTypeKey(value: string | null | undefined): ProfileTypeKey {
  if (value === 'psychologist' || value === 'psychopedagogue' || value === 'both') return value;
  return 'unknown';
}

export function DocStudioCatalog({ state }: { state: DocStudioState }) {
  const { professionCategoryOptions, category, updateCategory, activeCategory, selectedTemplate, updateTemplate, activeColor, profile } =
    state;

  const [kind, setKind] = useState<'all' | DocStudioDocumentKind>('all');

  const profileType = toProfileTypeKey(profile?.profile_type);
  const hasCatalog = activeCategory.catalog !== null;
  const availableKinds = useMemo(() => listDocumentKindsForCategory(category), [category]);

  // Evita valor de <select> fora das opções ao trocar de categoria.
  const kindValue = kind !== 'all' && availableKinds.includes(kind) ? kind : 'all';
  const documentKind = kindValue === 'all' ? undefined : kindValue;

  const results = useMemo(
    () => searchTemplates({ professionCategory: category, documentKind, profileType }),
    [category, documentKind, profileType],
  );

  // Ordem da lista: (1) "Documento em branco" no topo; (2) próprios da profissão
  // (por `line`); (3) demais universais ("Documentos gerais"). Universais têm
  // `professionCategories` (todas as profissões).
  const BLANK_TEMPLATE_ID = 'universal_blank_document';
  const blankTemplate = results.find((template) => template.id === BLANK_TEMPLATE_ID) ?? null;
  const professionalResults = results.filter((template) => !template.professionCategories);
  const generalResults = results.filter(
    (template) => template.professionCategories && template.id !== BLANK_TEMPLATE_ID,
  );

  const renderItem = (template: DocStudioTemplate) => {
    const isActive = template.id === selectedTemplate?.id;
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => updateTemplate(template.id)}
        aria-pressed={isActive}
        className={`block w-full rounded-lg border-l-2 px-3.5 py-2 text-left text-sm font-medium transition ${
          isActive ? 'border-l-pp-ink bg-pp-block-cream/60 text-pp-ink' : 'border-l-transparent text-pp-ink hover:bg-pp-hairline-soft/70'
        }`}
        style={isActive ? { color: activeColor } : undefined}
      >
        {template.title}
      </button>
    );
  };

  return (
    <div className="space-y-8 rounded-2xl bg-pp-block-cream/40 p-5">
      <div className="space-y-3">
        <label htmlFor="professionCategory" className="font-serif italic text-pp-ink-soft text-sm">
          Profissão
        </label>
        <select
          id="professionCategory"
          value={category}
          onChange={(event) => updateCategory(event.target.value as ProfessionCategory)}
          aria-label="Selecionar profissão"
          className="w-full rounded-lg border border-pp-hairline bg-white px-3 py-2 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
        >
          {professionCategoryOptions
            .filter((option) => option.catalog !== null)
            .map((option) => (
              <option key={option.category} value={option.category}>
                {option.title}
              </option>
            ))}
        </select>
        <p className="text-xs leading-relaxed text-pp-ink-soft">{activeCategory.description}</p>
      </div>

      <div className="space-y-4 border-t border-pp-hairline-soft pt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif italic text-pp-ink-soft text-sm">Modelos</p>
          <span className="text-[11px] text-pp-ink-soft">{results.length} modelo(s)</span>
        </div>

        <select
          value={kindValue}
          onChange={(event) => setKind(event.target.value as 'all' | DocStudioDocumentKind)}
          aria-label="Filtrar por tipo de documento"
          className="w-full rounded-lg border border-pp-hairline bg-white px-3 py-2 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
        >
          <option value="all">Todos os tipos</option>
          {availableKinds.map((documentKindOption) => (
            <option key={documentKindOption} value={documentKindOption}>
              {documentKindLabels[documentKindOption]}
            </option>
          ))}
        </select>

        {results.length === 0 ? (
          <p className="rounded-xl bg-pp-hairline-soft/70 px-3 py-3 text-xs leading-relaxed text-pp-ink-soft">
            Nenhum modelo encontrado. Ajuste a busca ou o filtro de tipo.
          </p>
        ) : (
          <div className="space-y-6">
            {blankTemplate && (
              <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pp-ink-soft">
                  Começar do zero
                </p>
                <div className="space-y-0.5">{renderItem(blankTemplate)}</div>
              </section>
            )}

            {professionalResults.length > 0 && (
              <details className="group">
                <summary className="flex items-center justify-between gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-lg px-1 py-1 hover:bg-pp-hairline-soft/60 transition">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-pp-ink-soft">
                    Modelos de {activeCategory.title}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 text-pp-ink-soft transition-transform duration-200 group-open:rotate-180"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="mt-2 space-y-0.5">{professionalResults.map(renderItem)}</div>
              </details>
            )}

            {generalResults.length > 0 && (
              <details className="group">
                <summary className="flex items-center justify-between gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-lg px-1 py-1 hover:bg-pp-hairline-soft/60 transition">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-pp-ink-soft">
                    Documentos gerais
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 text-pp-ink-soft transition-transform duration-200 group-open:rotate-180"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="mt-2 space-y-0.5">{generalResults.map(renderItem)}</div>
              </details>
            )}

            {!hasCatalog && (
              <p className="rounded-xl border border-dashed border-pp-hairline bg-pp-hairline-soft/40 px-3.5 py-3 text-xs leading-relaxed text-pp-ink-soft">
                Modelos específicos de {activeCategory.title} em preparação.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
