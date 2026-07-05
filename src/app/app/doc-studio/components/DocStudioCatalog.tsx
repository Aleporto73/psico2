'use client';

// Catálogo por profissão: seletor de profession_category + busca + filtro por tipo
// + lista ordenada por perfil. Categorias sem catálogo (fono/TO/médico/pediatra/outro)
// mostram estado vazio premium "em preparação". Lógica pura vem de ../template-catalog.
// Só modelos `active` aparecem (padrão de searchTemplates).

import { useMemo, useState } from 'react';
import type { DocStudioDocumentKind, ProfessionCategory, ProfileTypeKey } from '../types';
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

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | DocStudioDocumentKind>('all');

  const profileType = toProfileTypeKey(profile?.profile_type);
  const hasCatalog = activeCategory.catalog !== null;
  const availableKinds = useMemo(() => listDocumentKindsForCategory(category), [category]);

  // Evita valor de <select> fora das opções ao trocar de categoria.
  const kindValue = kind !== 'all' && availableKinds.includes(kind) ? kind : 'all';
  const documentKind = kindValue === 'all' ? undefined : kindValue;

  const results = useMemo(
    () => (hasCatalog ? searchTemplates({ query, professionCategory: category, documentKind, profileType }) : []),
    [hasCatalog, query, category, documentKind, profileType],
  );

  return (
    <div className="space-y-8">
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
          {professionCategoryOptions.map((option) => (
            <option key={option.category} value={option.category}>
              {option.title}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-pp-ink-soft">{activeCategory.description}</p>
      </div>

      <div className="space-y-3 border-t border-pp-hairline-soft pt-8">
        {!hasCatalog ? (
          <div className="rounded-2xl border border-dashed border-pp-hairline bg-pp-hairline-soft/40 px-5 py-9 text-center">
            <p className="font-serif italic text-base text-pp-ink">{activeCategory.emptyStateMessage}</p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-pp-ink-soft">
              Estamos desenhando modelos guiados premium para {activeCategory.title}. Enquanto isso, seu
              cabeçalho e identificação profissional já ficam prontos para os documentos que você criar.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="font-serif italic text-pp-ink-soft text-sm">Modelos</p>
              <span className="text-[11px] text-pp-ink-soft">{results.length} modelo(s)</span>
            </div>

            <div className="space-y-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar modelo..."
                aria-label="Buscar modelo"
                className="w-full rounded-lg border border-pp-hairline bg-white px-3 py-2 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
              />
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
            </div>

            {results.length === 0 ? (
              <p className="rounded-xl bg-pp-hairline-soft/70 px-3 py-3 text-xs leading-relaxed text-pp-ink-soft">
                Nenhum modelo encontrado. Ajuste a busca ou o filtro de tipo.
              </p>
            ) : (
              <div className="space-y-1">
                {results.map((template) => {
                  const isActive = template.id === selectedTemplate?.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => updateTemplate(template.id)}
                      aria-pressed={isActive}
                      className={`block w-full rounded-xl border-l-2 px-3.5 py-3 text-left transition ${
                        isActive ? 'border-l-pp-ink bg-pp-block-cream/60' : 'border-l-transparent hover:bg-pp-hairline-soft/70'
                      }`}
                    >
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide text-pp-ink-soft"
                        style={isActive ? { color: activeColor } : undefined}
                      >
                        {documentKindLabels[template.documentKind]}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-pp-ink">{template.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-pp-ink-soft">{template.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
