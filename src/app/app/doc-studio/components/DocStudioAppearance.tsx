'use client';

// Painel de aparência: cor, fonte, densidade, preto e branco, cabeçalho e assinatura.
// Refino visual final é do Bloco 5.

import { SlidersHorizontal } from 'lucide-react';
import type { Density, FontStyle } from '../types';
import type { DocStudioState } from '../hooks/useDocStudioState';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center justify-between gap-3 text-sm text-pp-ink">
      <span>{label}</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-pp-hairline transition-colors peer-checked:bg-pp-ink peer-focus-visible:ring-2 peer-focus-visible:ring-pp-ink/30 peer-focus-visible:ring-offset-2" />
        <span className="relative h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px]" />
      </span>
    </label>
  );
}

export function DocStudioAppearance({ state }: { state: DocStudioState }) {
  const {
    colorOptions,
    primaryColor,
    setPrimaryColor,
    fontStyle,
    setFontStyle,
    density,
    setDensity,
    blackAndWhite,
    setBlackAndWhite,
    showHeader,
    setShowHeader,
    showSignature,
    setShowSignature,
    hasIncompleteHeader,
    headerMissingItems,
    hasIncompleteSignature,
    signature,
  } = state;

  return (
    <div className="space-y-4 border-t border-pp-hairline-soft pt-8">
      <div className="flex items-center justify-between">
        <p className="font-serif italic text-pp-ink-soft text-sm">Aparência</p>
        <SlidersHorizontal className="h-4 w-4 text-pp-ink-soft" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-pp-ink-soft">Cor principal</label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setPrimaryColor(color.value)}
              className={`h-9 w-9 rounded-full border-2 transition ${
                primaryColor === color.value ? 'border-pp-ink' : 'border-transparent'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.label}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="fontStyle" className="text-xs font-medium text-pp-ink-soft">
            Estilo de fonte
          </label>
          <select
            id="fontStyle"
            value={fontStyle}
            onChange={(event) => setFontStyle(event.target.value as FontStyle)}
            className="w-full rounded-lg border border-pp-hairline bg-white px-3 py-2 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
          >
            <option value="editorial">Editorial</option>
            <option value="classic">Clássica</option>
            <option value="clean">Limpa</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="density" className="text-xs font-medium text-pp-ink-soft">
            Densidade
          </label>
          <select
            id="density"
            value={density}
            onChange={(event) => setDensity(event.target.value as Density)}
            className="w-full rounded-lg border border-pp-hairline bg-white px-3 py-2 text-sm text-pp-ink transition focus:border-pp-ink focus:outline-none focus:ring-1 focus:ring-pp-ink/20"
          >
            <option value="comfortable">Confortável</option>
            <option value="compact">Compacta</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <Toggle label="Modo preto e branco" checked={blackAndWhite} onChange={setBlackAndWhite} />
        <Toggle label="Mostrar cabeçalho" checked={showHeader} onChange={setShowHeader} />
        <Toggle label="Mostrar assinatura" checked={showSignature} onChange={setShowSignature} />
        {hasIncompleteHeader && (
          <p className="rounded-xl bg-pp-block-cream/70 px-3 py-2 text-xs leading-relaxed text-pp-ink-soft">
            Cabeçalho incompleto: revise {headerMissingItems.join(' e ')} em Minha conta.
          </p>
        )}
        {hasIncompleteSignature && (
          <p className="rounded-xl bg-pp-block-cream/70 px-3 py-2 text-xs leading-relaxed text-pp-ink-soft">
            Assinatura incompleta: revise {signature.missingItems.join(' e ')} em Minha conta.
          </p>
        )}
      </div>
    </div>
  );
}
