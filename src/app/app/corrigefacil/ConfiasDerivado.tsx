// =====================================================================
// CONFIAS · DERIVADO — nível equivalente e perfil por habilidade.
//
// Recebe SOMENTE o `derived` que o servidor devolveu. Não recebe resposta
// item a item, não conta acerto, não divide percentual, não escolhe faixa
// e não consulta tabela: a Edge fez as quatro coisas e mandou o resultado
// pronto. O que este componente faz é formatar a fração e imprimir o
// rótulo que veio — a lógica disso mora em
// `@/lib/corrigefacil/confias-derivado`, pura e testada sem DOM.
//
// Por que ele mora FORA dos cards de resultado:
//
//   os cards são das escalas NORMATIVAS — Sílaba, Fonema e Total —, com
//   escore, z e classificação contra norma. As 16 tarefas não são escalas:
//   não têm norma, não têm z e não têm faixa normativa. Uma delas entre os
//   cards seria lida como um quarto resultado normativo do instrumento, e
//   o nível equivalente seria lido como a hipótese de escrita.
//
// É o MESMO componente da tela de correção, do histórico e do documento —
// dois desenhos do mesmo dado divergiriam, e o que ficasse para trás sairia
// impresso.
// =====================================================================

import type { DerivadoConfias } from '@/lib/corrigefacil/api';
import {
  blocosDoPerfil,
  NOTA_NIVEL,
  NOTA_PERFIL,
  TITULO_NIVEL,
  TITULO_PERFIL,
} from '@/lib/corrigefacil/confias-derivado';

export function ConfiasDerivado({
  derivado,
}: Readonly<{ derivado: DerivadoConfias | null | undefined }>) {
  if (!derivado) return null;

  const blocos = blocosDoPerfil(derivado);
  const nivel = derivado.nivel_equivalente_silaba;
  if (!nivel && blocos.length === 0) return null;

  return (
    <section className="border border-pp-hairline bg-white/40 rounded-block p-6 sm:p-7 space-y-7">
      {nivel && (
        <div className="space-y-1">
          <h3 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
            {TITULO_NIVEL}
          </h3>
          <p className="text-pp-ink text-2xl font-medium leading-tight">
            {nivel}
          </p>
          {/* A nota anda colada ao valor, não no rodapé da seção: quem lê
              "Alfabética" aqui precisa saber, na mesma linha de olhar, que
              isto não é a hipótese que ele informou. */}
          <p className="text-pp-ink-soft text-xs leading-relaxed">
            {NOTA_NIVEL}
          </p>
        </div>
      )}

      {blocos.length > 0 && (
        <div className="space-y-4">
          <header className="space-y-1">
            <h3 className="text-pp-ink text-sm font-medium">{TITULO_PERFIL}</h3>
            <p className="text-pp-ink-soft text-xs">{NOTA_PERFIL}</p>
          </header>

          {blocos.map((bloco) => (
            <div key={bloco.titulo} className="space-y-2">
              <h4 className="text-[11px] uppercase tracking-wide text-pp-ink-soft">
                {bloco.titulo}
              </h4>
              <ul className="space-y-1.5">
                {bloco.linhas.map((l) => (
                  <li
                    key={l.code}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-pp-hairline-soft pb-1.5 last:border-0"
                  >
                    <span className="text-pp-ink text-sm">{l.titulo}</span>
                    <span className="flex items-baseline gap-3 text-sm">
                      <span className="text-pp-ink-soft tabular-nums">
                        {l.acertos}
                      </span>
                      {l.percentual && (
                        <span className="text-pp-ink tabular-nums font-medium">
                          {l.percentual}
                        </span>
                      )}
                      {l.classificacao && (
                        <span className="inline-block px-3 py-1 text-xs font-medium text-pp-ink bg-white/60 rounded-pill">
                          {l.classificacao}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
