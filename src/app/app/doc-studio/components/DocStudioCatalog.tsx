'use client';

// Catálogo: seletor de linha (= filtro de linha) + busca + filtro por tipo de
// documento + lista ordenada por perfil. Lógica pura vem de ../template-catalog.
// Só modelos `active` aparecem (padrão de searchTemplates). Favoritos/recentes: futuro.

import { useMemo, useState } from 'react';
import type { DocStudioDocumentKind, ProfileTypeKey } from '../types';
import type { DocStudioState } from '../hooks/useDocStudioState';
import { listDocumentKinds, searchTemplates } from '../template-catalog';

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
  const { lineOptions, line, updateLine, activeLine, selectedTemplate, updateTemplate, activeColor, profile } = state;

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | DocStudioDocumentKind>('all');

  const profileType = toProfileTypeKey(profile?.profile_type);
  const availableKinds = useMemo(() => listDocumentKinds(line), [line]);

  // Evita valor de <select> fora das opções ao trocar de linha.
  const kindValue = kind !== 'all' && availableKinds.includes(kind) ? kind : 'all';
  const documentKind = kindValue === 'all' ? undefined : kindValue;

  const results = useMemo(
    () => searchTemplates({ query, line, documentKind, profileType }),
    [query, line, documentKind, profileType],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="font-serif italic text-pp-ink-soft text-sm">Linha</p>
        <div className="inline-flex w-full rounded-full bg-pp-hairline-soft p-1">
          {lineOptions.map((option) => {
            const isActive = option.key === line;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => updateLine(option.key)}
                aria-pressed={isActive}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition ${
                  isActive ? 'bg-pp-ink text-pp-canvas shadow-sm' : 'text-pp-ink-soft hover:text-pp-ink'
                }`}
              >
                {option.title.split(' / ')[0]}
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-pp-ink-soft">{activeLine.description}</p>
      </div>

      <div className="space-y-3 border-t border-pp-hairline-soft pt-8">
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
              const isActive = template.id === selectedTemplate.id;
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
      </div>
    </div>
  );
}
