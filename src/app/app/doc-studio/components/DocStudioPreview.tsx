'use client';

// Preview da folha — Bloco 5: refino premium. Folha discreta e editorial,
// metadados em faixa fina (sem blocos coloridos), um único acento de cor na
// finalidade, leitura confortável nas seções, rodapé ético e assinatura opcional.
// Modo preto e branco: activeColor colapsa para #111111 (ver hook), o que já
// neutraliza acento e tinta de fundo em toda a folha.

import { Palette } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DocStudioState } from '../hooks/useDocStudioState';

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-[7rem] flex-1">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-pp-ink-soft">{label}</span>
      <strong className="mt-0.5 block text-sm font-medium text-pp-ink">{value}</strong>
    </div>
  );
}

export function DocStudioPreview({ state }: { state: DocStudioState }) {
  const {
    header,
    showHeader,
    selectedTemplate,
    fields,
    activeCategory,
    activeColor,
    blackAndWhite,
    fontStyle,
    density,
    showSignature,
    signature,
    loadingProfile,
    hasIncompleteSignature,
  } = state;

  // Categoria sem catálogo: prévia indisponível — não renderiza documento antigo.
  if (!selectedTemplate) {
    return (
      <div className="relative mx-auto w-full max-w-[860px] print:mx-0 print:max-w-none">
        <div className="doc-studio-page flex min-h-[760px] flex-col items-center justify-center rounded-block border border-dashed border-pp-hairline bg-white p-10 text-center shadow-[0_28px_70px_rgba(14,42,56,0.08)]">
          <p className="font-serif italic text-lg text-pp-ink">Prévia indisponível nesta categoria</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-pp-ink-soft">
            Assim que os modelos forem adicionados, a folha profissional aparecerá aqui.
          </p>
        </div>
      </div>
    );
  }

  const accentStyle = { color: activeColor };
  const borderStyle = { borderColor: activeColor };
  const softBackground = blackAndWhite ? '#F4F4F4' : `${activeColor}0f`;
  const previewFontClass = fontStyle === 'classic' ? 'font-serif' : 'font-sans';
  const titleFontClass = fontStyle === 'clean' ? 'font-sans' : 'font-serif italic';
  const densityClass = density === 'compact' ? 'space-y-5 text-[13.5px]' : 'space-y-7 text-[14.5px]';

  return (
    <div className="relative mx-auto w-full max-w-[860px] print:mx-0 print:max-w-none">
      <div
        className="doc-studio-glow pointer-events-none absolute -inset-10 -z-10 opacity-50 blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${activeColor}14, transparent)` }}
        aria-hidden="true"
      />

      <div className="doc-studio-page min-h-[760px] rounded-block border border-pp-hairline/70 bg-white p-7 shadow-[0_28px_70px_rgba(14,42,56,0.12)] sm:p-9 md:p-11">
        {showHeader && (
          <header className="mb-8 flex items-end justify-between gap-4 border-b pb-5" style={borderStyle}>
            <div>
              <p className={`${titleFontClass} text-[22px] leading-tight text-pp-ink`}>{header.name}</p>
              <p className="mt-1 text-sm text-pp-ink-soft">{header.subtitle}</p>
            </div>
          </header>
        )}

        <article className={`${previewFontClass} ${densityClass} text-pp-ink`}>
          <div className="break-inside-avoid space-y-2">
            <div
              className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em]"
              style={accentStyle}
            >
              <Palette className="h-3 w-3" aria-hidden="true" />
              {selectedTemplate.category}
            </div>
            <h2 className={`${titleFontClass} text-[28px] leading-tight text-pp-ink md:text-[32px]`}>
              {selectedTemplate.title}
            </h2>
          </div>

          <div className="break-inside-avoid flex flex-wrap gap-x-8 gap-y-3 border-y border-pp-hairline py-3.5">
            <MetaItem label="Avaliado(a)" value={fields.subjectName || 'Não informado'} />
            <MetaItem label="Idade/Faixa" value={fields.subjectAge || 'Não informado'} />
            <MetaItem label="Linha" value={activeCategory.title} />
          </div>

          <section
            className="break-inside-avoid rounded-xl border-l-2 p-4 sm:p-5"
            style={{ borderColor: activeColor, backgroundColor: softBackground }}
          >
            <h3 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-pp-ink-soft">Finalidade</h3>
            <p className="leading-relaxed text-pp-ink">{fields.documentPurpose}</p>
          </section>

          {selectedTemplate.sections.map((section) => (
            <section key={section.key} className="break-inside-avoid">
              <h3 className={`${titleFontClass} mb-2.5 border-b border-pp-hairline pb-2 text-lg text-pp-ink md:text-xl`}>
                {section.title}
              </h3>
              <p className="whitespace-pre-wrap leading-[1.8] text-pp-ink-soft">{fields[section.key]}</p>
            </section>
          ))}

          <footer className="break-inside-avoid border-t border-pp-hairline pt-4 text-xs italic leading-relaxed text-pp-ink-soft">
            {selectedTemplate.ethicalFooter}
          </footer>

          {showSignature && (
            <section className="break-inside-avoid pt-2">
              <div className="w-64 max-w-full border-t border-pp-ink/50 pt-3">
                <p className="text-sm font-medium text-pp-ink">
                  {loadingProfile ? 'Carregando dados profissionais...' : signature.name || 'Nome profissional não informado'}
                </p>
                {signature.profession && (
                  <p className="mt-0.5 text-xs leading-relaxed text-pp-ink-soft">{signature.profession}</p>
                )}
                {signature.credential && (
                  <p className="text-xs leading-relaxed text-pp-ink-soft">Registro: {signature.credential}</p>
                )}
                {hasIncompleteSignature && (
                  <p className="mt-2 text-[11px] leading-relaxed text-pp-ink-soft">
                    Assinatura incompleta: revise os dados profissionais em Minha conta.
                  </p>
                )}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
