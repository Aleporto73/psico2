'use client';

// Casca de layout do Modo Instrumento: catálogo à esquerda + área de conteúdo
// larga à direita (faixa de aviso/Imprimir em cima, folha embaixo). Componente
// separado de DocStudioShell (documentos) para não alterar o layout de 3
// colunas dos documentos — nada aqui é compartilhado com aquele modo.

import type { ReactNode } from 'react';

interface DocStudioInstrumentShellProps {
  header: ReactNode;
  aside: ReactNode;
  bar: ReactNode;
  sheet: ReactNode;
}

export function DocStudioInstrumentShell({ header, aside, bar, sheet }: DocStudioInstrumentShellProps) {
  return (
    <div className="doc-studio-shell mx-auto max-w-[1880px] space-y-8 pb-16">
      <div className="doc-studio-no-print">{header}</div>

      <div className="grid grid-cols-1 items-start gap-8 xl:gap-12 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="doc-studio-no-print space-y-8 xl:sticky xl:top-8">{aside}</aside>

        <div className="space-y-6">
          <div className="doc-studio-no-print">{bar}</div>
          <section className="doc-studio-print-area">{sheet}</section>
        </div>
      </div>
    </div>
  );
}
