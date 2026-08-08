'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { montarAbas } from './nav-model';

// Barra de navegação interna do módulo, presente em todas as telas do
// CorrigeFácil: catálogo, aplicação, resultado, histórico e detalhe.
//
// Visual: as mesmas pills do PsicoPlanilhas — ativa em `pp-ink` sólido, como
// o item ativo da sidebar; inativa com hairline. Nenhum componente novo de
// design, nenhum mini-sistema visual paralelo.
//
// `aria-current="page"` é o que um leitor de tela anuncia; a cor sozinha não
// serve de indicador de estado.
export function CorrigeFacilNav() {
  const pathname = usePathname() ?? '';
  const abas = montarAbas(pathname);

  return (
    <nav aria-label="Seções do CorrigeFácil" className="print:hidden">
      <ul className="flex flex-wrap items-center gap-2">
        {abas.map((aba) => (
          <li key={aba.id}>
            <Link
              href={aba.href}
              aria-current={aba.ativa ? 'page' : undefined}
              className={`inline-flex items-center px-4 py-2 rounded-pill text-sm font-medium transition ${
                aba.ativa
                  ? 'bg-pp-ink text-pp-canvas'
                  : 'border border-pp-ink/15 text-pp-ink-soft hover:border-pp-ink/40 hover:text-pp-ink'
              }`}
            >
              {aba.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
