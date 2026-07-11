'use client';

// Campos guiados + ações (copiar/imprimir) + status do rascunho local.

import { useEffect, useState } from 'react';
import { Check, Copy, Printer } from 'lucide-react';
import type { GuidedField } from '../types';
import type { DocStudioState } from '../hooks/useDocStudioState';
import { getDraftStatusLabel } from '../lib/storage';

export function DocStudioFields({ state }: { state: DocStudioState }) {
  const {
    selectedTemplate,
    activeCategory,
    fields,
    updateField,
    density,
    copyState,
    draftStatus,
    handleCopy,
    handlePrint,
    handleClearDraft,
    loadingProfile,
    hasIncompleteHeader,
    headerMissingItems,
  } = state;

  const [showOptional, setShowOptional] = useState(false);
  // Recolhe os detalhes opcionais ao trocar de modelo.
  useEffect(() => {
    setShowOptional(false);
  }, [selectedTemplate?.id]);

  // Modo Instrumento: nada para digitar — faixa horizontal com aviso + ações
  // (renderizada em DocStudioInstrumentShell, acima da folha, não numa coluna).
  if (selectedTemplate?.mode === 'instrument') {
    return (
      <div className="flex flex-col gap-4 rounded-block border border-pp-hairline bg-pp-block-cream/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif italic text-pp-ink-soft text-sm">{selectedTemplate.title}</p>
          <p className="text-sm leading-relaxed text-pp-ink">
            Instrumento para imprimir e aplicar na sessão. Você também pode copiar e adaptar no Word.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-pill bg-pp-ink px-6 py-3 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className="inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-pp-ink-soft underline-offset-4 transition hover:text-pp-ink hover:underline"
          >
            {copyState === 'success' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copyState === 'success' ? 'Pronto para colar' : copyState === 'error' ? 'Falhou' : 'Copiar para Word'}
          </button>
        </div>
      </div>
    );
  }

  // Categoria sem catálogo: estado vazio premium, sem campos guiados nem ações.
  if (!selectedTemplate) {
    return (
      <div className="rounded-block border border-dashed border-pp-hairline bg-pp-hairline-soft/30 px-6 py-12 text-center">
        <p className="font-serif italic text-pp-ink-soft text-sm">{activeCategory.title}</p>
        <p className="mx-auto mt-2 max-w-md text-lg font-medium text-pp-ink">
          Tudo pronto para receber os modelos desta área.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-pp-ink-soft">
          Esta categoria já está separada no Doc Studio. Os modelos serão adicionados em uma etapa
          própria, sem misturar documentos de outras profissões.
        </p>
      </div>
    );
  }

  // Documento em branco: título vem do campo editável (fallback quando vazio).
  const isBlankDocument = selectedTemplate.id === 'universal_blank_document';
  const displayTitle = isBlankDocument
    ? fields.document_title.trim() || 'Documento em branco'
    : selectedTemplate.title;

  // Grupos de campos (D5): quando o template declara essentialFields, separa os campos
  // guiados em essenciais (sempre visíveis) e opcionais (atrás de "Adicionar mais detalhes").
  // Templates sem grupos mantêm o comportamento atual: todos os guidedFields visíveis.
  const hasFieldGroups = Boolean(selectedTemplate.essentialFields);
  const essentialKeys = new Set(selectedTemplate.essentialFields ?? []);
  const essentialGuided = hasFieldGroups
    ? selectedTemplate.guidedFields.filter((field) => essentialKeys.has(field.key))
    : selectedTemplate.guidedFields;
  const optionalGuided = hasFieldGroups
    ? selectedTemplate.guidedFields.filter((field) => !essentialKeys.has(field.key))
    : [];

  const renderGuidedField = (field: GuidedField) => (
    <div key={field.key} className="space-y-2">
      <label htmlFor={field.key} className="text-xs font-medium text-pp-ink-soft">
        {field.label}
      </label>
      <textarea
        id={field.key}
        value={fields[field.key]}
        onChange={(event) => updateField(field.key, event.target.value)}
        placeholder={field.placeholder}
        rows={density === 'compact' ? 3 : 4}
        className="w-full resize-y rounded-xl border border-pp-hairline bg-white px-4 py-3 text-sm leading-relaxed text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
      />
    </div>
  );

  return (
    <>
      <div className="space-y-3 border-b border-pp-hairline-soft pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-serif italic text-pp-ink-soft text-sm">Campos guiados</p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              aria-live="polite"
              className="inline-flex items-center justify-center gap-2 rounded-pill border border-pp-ink/15 px-4 py-2 text-sm font-medium text-pp-ink transition hover:bg-pp-ink/5"
            >
              {copyState === 'success' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copyState === 'success' ? 'Pronto para colar' : copyState === 'error' ? 'Falhou' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 rounded-pill bg-pp-ink px-4 py-2 text-sm font-medium text-pp-canvas transition hover:bg-pp-ink-soft"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="max-w-xl space-y-1">
          <h2 className="text-xl font-medium text-pp-ink">{displayTitle}</h2>
          <p className="text-sm leading-relaxed text-pp-ink-soft">{selectedTemplate.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-relaxed text-pp-ink-soft" aria-live="polite">
          <span>{getDraftStatusLabel(draftStatus)}</span>
          <button
            type="button"
            onClick={handleClearDraft}
            className="font-medium text-pp-ink-soft underline-offset-4 transition hover:text-pp-ink hover:underline"
          >
            Limpar rascunho
          </button>
        </div>
        <p className="max-w-md text-sm text-pp-ink-soft">
          {loadingProfile
            ? 'Carregando cabeçalho profissional...'
            : hasIncompleteHeader
              ? `Cabeçalho incompleto: faltam ${headerMissingItems.join(' e ')}.`
              : 'Preencha os blocos e acompanhe o documento ao lado.'}
        </p>
      </div>

      <div className="space-y-5">
        {isBlankDocument && (
          <div className="space-y-2">
            <label htmlFor="document_title" className="text-xs font-medium text-pp-ink-soft">
              Título do documento
            </label>
            <input
              id="document_title"
              value={fields.document_title}
              onChange={(event) => updateField('document_title', event.target.value)}
              placeholder="Ex.: Declaração simples, Registro de orientação, Documento para escola"
              className="w-full rounded-xl border border-pp-hairline bg-white px-4 py-2.5 text-sm font-medium text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="subjectName" className="text-xs font-medium text-pp-ink-soft">
              Nome ou identificação
            </label>
            <input
              id="subjectName"
              value={fields.subjectName}
              onChange={(event) => updateField('subjectName', event.target.value)}
              className="w-full rounded-xl border border-pp-hairline bg-white px-4 py-2.5 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="subjectAge" className="text-xs font-medium text-pp-ink-soft">
              Idade ou faixa etária
            </label>
            <input
              id="subjectAge"
              value={fields.subjectAge}
              onChange={(event) => updateField('subjectAge', event.target.value)}
              className="w-full rounded-xl border border-pp-hairline bg-white px-4 py-2.5 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="documentPurpose" className="text-xs font-medium text-pp-ink-soft">
            Finalidade
          </label>
          <textarea
            id="documentPurpose"
            value={fields.documentPurpose}
            onChange={(event) => updateField('documentPurpose', event.target.value)}
            rows={2}
            className="w-full resize-y rounded-xl border border-pp-hairline bg-white px-4 py-2.5 text-sm leading-relaxed text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
          />
        </div>

        {essentialGuided.map(renderGuidedField)}

        {optionalGuided.length > 0 && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setShowOptional((value) => !value)}
              aria-expanded={showOptional}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-pp-ink-soft underline-offset-4 transition hover:text-pp-ink hover:underline"
            >
              {showOptional ? 'Ocultar detalhes' : 'Adicionar mais detalhes'}
            </button>
            {showOptional && optionalGuided.map(renderGuidedField)}
          </div>
        )}
      </div>
    </>
  );
}
