'use client';

// Doc Studio — Modo Instrumento: folha impressa em branco para aplicar na sessão.
// Renderizador paralelo ao DocStudioPreview (documentos); não reaproveita
// sections/fields — instrumentBlocks é a única fonte de conteúdo aqui.

import type { InstrumentBlock } from '../types';
import type { DocStudioState } from '../hooks/useDocStudioState';

function InstructionBlock({ block }: { block: Extract<InstrumentBlock, { type: 'instruction' }> }) {
  return (
    <section className="break-inside-avoid space-y-1.5 rounded-xl border-l-2 border-pp-hairline bg-pp-block-cream/50 p-3 sm:p-4">
      {block.label && (
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pp-ink-soft">{block.label}</h3>
      )}
      {block.text && <p className="whitespace-pre-wrap leading-relaxed text-pp-ink">{block.text}</p>}
      {block.items && (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 pl-4 text-sm text-pp-ink sm:grid-cols-2">
          {block.items.map((item) => (
            <li key={item} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Título de seção simples (sem caixa creme) — mesmo estilo do título do
// checklist, para textos curtos que não precisam de destaque de instrução.
function SectionTitleBlock({ block }: { block: Extract<InstrumentBlock, { type: 'section-title' }> }) {
  return (
    <div className="break-inside-avoid space-y-1">
      <h3 className="doc-instrument-section-title border-b border-pp-hairline pb-2 text-sm font-semibold uppercase tracking-wide text-pp-ink-soft">
        {block.title}
      </h3>
      {block.text && <p className="text-sm leading-relaxed text-pp-ink-soft">{block.text}</p>}
    </div>
  );
}

function LineFieldBlock({ block }: { block: Extract<InstrumentBlock, { type: 'line-field' }> }) {
  return (
    <div className="break-inside-avoid flex items-end gap-3 py-1.5 text-sm text-pp-ink">
      <span className="shrink-0 whitespace-nowrap font-medium">{block.label}</span>
      <span
        className={`doc-instrument-line flex-1 border-b border-pp-ink/40 ${block.length === 'short' && block.width !== 'half' ? 'max-w-[220px]' : ''}`}
      />
    </div>
  );
}

// Agrupa pares consecutivos de line-field width:'half' numa linha de 2 colunas
// (ex.: Idade + Escolaridade). Blocos 'full' (padrão) seguem um por linha.
function groupInstrumentBlocks(blocks: InstrumentBlock[]): (InstrumentBlock | [InstrumentBlock, InstrumentBlock])[] {
  const grouped: (InstrumentBlock | [InstrumentBlock, InstrumentBlock])[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];
    const isHalf = (b: InstrumentBlock) => b.type === 'line-field' && b.width === 'half';

    if (isHalf(block) && next && isHalf(next)) {
      grouped.push([block, next]);
      i += 1;
    } else {
      grouped.push(block);
    }
  }

  return grouped;
}

// Sim/não sempre em pilha (rótulo / caixinhas / linha opcional): evita que o
// rótulo longo espreme as caixinhas numa única linha na impressão.
function YesNoBlock({ block }: { block: Extract<InstrumentBlock, { type: 'yes-no' }> }) {
  return (
    <div className="break-inside-avoid space-y-1.5 py-1.5 text-sm text-pp-ink">
      <p className="font-medium">{block.label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="doc-instrument-checkbox h-3.5 w-3.5 shrink-0 border border-pp-ink/60" aria-hidden="true" /> Sim
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="doc-instrument-checkbox h-3.5 w-3.5 shrink-0 border border-pp-ink/60" aria-hidden="true" /> Não
        </span>
        {block.withLine && <span className="doc-instrument-line min-w-[120px] flex-1 border-b border-pp-ink/40" />}
      </div>
    </div>
  );
}

function ChecklistBlock({ block }: { block: Extract<InstrumentBlock, { type: 'checklist' }> }) {
  // Item em grid (não flex): flex dentro de columns quebra a contagem de
  // colunas em alguns motores de impressão do Chromium.
  const columnsClass = block.columns === 2 ? 'doc-instrument-checklist--2col columns-2 gap-x-8' : 'doc-instrument-checklist--1col';

  // break-inside-avoid na section inteira (título + itens + campo de
  // observação): o bloco inteiro vai junto para a próxima página se não
  // couber no resto da atual, em vez de cortar no meio.
  return (
    <section className="break-inside-avoid space-y-2">
      {block.title && (
        <h3 className="doc-instrument-section-title border-b border-pp-hairline pb-2 text-sm font-semibold uppercase tracking-wide text-pp-ink-soft">
          {block.title}
        </h3>
      )}
      <ul className={`doc-instrument-checklist ${columnsClass}`}>
        {block.items.map((item) => (
          <li
            key={item}
            className="doc-instrument-checklist-item mb-1.5 grid grid-cols-[14px_1fr] items-start gap-2 text-sm text-pp-ink"
          >
            <span className="doc-instrument-checkbox mt-0.5 h-3.5 w-3.5 border border-pp-ink/60" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {block.notesLabel && <LineFieldBlock block={{ type: 'line-field', label: block.notesLabel, length: 'long' }} />}
    </section>
  );
}

function FreeSpaceBlock({ block }: { block: Extract<InstrumentBlock, { type: 'free-space' }> }) {
  return (
    <section className="break-inside-avoid space-y-1.5">
      {block.label && <span className="text-xs font-medium text-pp-ink-soft">{block.label}</span>}
      <div
        className="doc-instrument-freespace rounded-xl border border-dashed border-pp-ink/40"
        style={{ height: `${block.heightMm ?? 100}mm` }}
        aria-hidden="true"
      />
    </section>
  );
}

function renderBlock(block: InstrumentBlock, index: number) {
  switch (block.type) {
    case 'instruction':
      return <InstructionBlock key={index} block={block} />;
    case 'line-field':
      return <LineFieldBlock key={index} block={block} />;
    case 'yes-no':
      return <YesNoBlock key={index} block={block} />;
    case 'checklist':
      return <ChecklistBlock key={index} block={block} />;
    case 'free-space':
      return <FreeSpaceBlock key={index} block={block} />;
    case 'section-title':
      return <SectionTitleBlock key={index} block={block} />;
    default:
      return null;
  }
}

export function DocStudioInstrumentPreview({ state }: { state: DocStudioState }) {
  const {
    header,
    showHeader,
    selectedTemplate,
    activeColor,
    showSignature,
    signature,
    loadingProfile,
    hasIncompleteSignature,
  } = state;

  if (!selectedTemplate) return null;

  const borderStyle = { borderColor: activeColor };

  return (
    <div className="relative mx-auto w-full max-w-[860px] print:mx-0 print:max-w-none">
      <div className="doc-studio-page min-h-[760px] rounded-block border border-pp-hairline/70 bg-white p-7 shadow-[0_28px_70px_rgba(14,42,56,0.12)] sm:p-9 md:p-11">
        {showHeader && (
          <header className="mb-8 flex items-end justify-between gap-4 border-b pb-5" style={borderStyle}>
            <div>
              <p className="font-serif italic text-[22px] leading-tight text-pp-ink">{header.name}</p>
              <p className="mt-1 text-sm text-pp-ink-soft">{header.subtitle}</p>
            </div>
          </header>
        )}

        <article className="doc-instrument-flow space-y-3 text-[14.5px] text-pp-ink">
          <div className="break-inside-avoid space-y-5 pb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: activeColor, border: `1px solid ${activeColor}` }}
            >
              Instrumento · Aplicar na sessão
            </div>
            <h2 className="font-serif italic text-[28px] leading-tight text-pp-ink md:text-[32px]">
              {selectedTemplate.title}
            </h2>
          </div>

          {groupInstrumentBlocks(selectedTemplate.instrumentBlocks ?? []).map((item, index) =>
            Array.isArray(item) ? (
              <div key={index} className="grid grid-cols-2 gap-4">
                <LineFieldBlock block={item[0] as Extract<InstrumentBlock, { type: 'line-field' }>} />
                <LineFieldBlock block={item[1] as Extract<InstrumentBlock, { type: 'line-field' }>} />
              </div>
            ) : (
              renderBlock(item, index)
            ),
          )}

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
