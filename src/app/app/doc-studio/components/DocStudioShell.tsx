'use client';

// Casca de layout do Doc Studio: header no topo + grid de 3 áreas
// (aside de controles / campos guiados / preview). Layout local — NÃO recria a
// sidebar compacta do layout global. Refino visual premium é do Bloco 5.

import type { ReactNode } from 'react';

interface DocStudioShellProps {
  header: ReactNode;
  aside: ReactNode;
  main: ReactNode;
  preview: ReactNode;
}

export function DocStudioShell({ header, aside, main, preview }: DocStudioShellProps) {
  return (
    <div className="doc-studio-shell mx-auto max-w-[1880px] space-y-8 pb-16">
      <div className="doc-studio-no-print">{header}</div>

      <div className="grid grid-cols-1 items-start gap-8 xl:gap-12 xl:grid-cols-[280px_minmax(360px,440px)_minmax(520px,1fr)]">
        <aside className="doc-studio-no-print space-y-8 xl:sticky xl:top-8">{aside}</aside>
        <main className="doc-studio-no-print space-y-6">{main}</main>
        <section className="doc-studio-print-area xl:sticky xl:top-8">{preview}</section>
      </div>
    </div>
  );
}
