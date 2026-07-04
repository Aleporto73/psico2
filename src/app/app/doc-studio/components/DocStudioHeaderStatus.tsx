'use client';

// Cabeçalho da tela do Doc Studio (título + selo de modo). Sem estado.

export function DocStudioHeaderStatus() {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        <p className="font-serif italic text-pp-ink-soft text-sm">Studio de documentos</p>
        <h1 className="font-serif italic text-3xl md:text-4xl text-pp-ink leading-[1.05]">Doc Studio</h1>
        <p className="max-w-xl text-sm leading-relaxed text-pp-ink-soft">
          Rascunho local, campos guiados e uma folha profissional pronta para copiar ou imprimir.
        </p>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-pp-hairline-soft px-3.5 py-1.5 text-xs text-pp-ink-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-pp-success" aria-hidden="true" />
        Rascunho local · sem salvamento na nuvem
      </div>
    </header>
  );
}
