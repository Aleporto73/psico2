// =====================================================================
// DOMAIN PROFILE · os cinco domínios do Bayley na métrica composta.
//
// Duas coisas o distinguem do perfil padronizado:
//
//   1. os 16 subtestes ficam FORA — eles saem em escalonada 1..19 e no
//      mesmo eixo da composta 40..160 seriam erro de categoria;
//   2. IC95 é OPCIONAL e varia DENTRO do instrumento. O domínio
//      Adaptativo não tem IC95 publicado em nenhuma linha, enquanto os
//      outros quatro têm em todas. O gráfico convive com quatro barras
//      de erro e uma sem — e não desenha a quinta.
//
// O IC95 chega como TEXTO do acervo. Ele é exibido como texto: converter
// para extremos numéricos no cliente seria interpretar formato de dado
// normativo, e isso é trabalho do servidor.
// =====================================================================

import {
  descreverPonto,
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, Indisponivel } from './parts';

export function DomainProfileChart({
  blocos,
  metrica,
}: {
  blocos: BlocoModelo[];
  metrica: Metrica;
}) {
  return (
    <div className="space-y-6">
      {blocos.map((b, bi) => {
        const range = b.range;
        return (
          <section key={b.titulo ?? bi} className="space-y-3">
            {b.titulo && <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>}

            {b.pontos.map((p) => {
              const pos = posicao(p.valor, range);
              return (
                <div key={p.escala} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-pp-ink text-sm">{p.nome}</p>
                    <p className="text-pp-ink-soft text-xs">
                      {p.disponivel && p.valor !== null
                        ? `${rotuloDaMetrica(metrica)} ${p.valor}`
                        : ''}
                      {/* só onde veio: ausência não é estimada */}
                      {p.ci95 ? ` · IC95 ${p.ci95}` : ''}
                      {p.classificacao ? ` · ${p.classificacao}` : ''}
                    </p>
                  </div>

                  {p.disponivel && pos !== null && range ? (
                    <div
                      role="img"
                      aria-label={descreverPonto(p, metrica)}
                      className="relative h-5 rounded-pill bg-pp-ink/[0.06] border border-pp-ink/10"
                    >
                      <div
                        className="absolute inset-y-[3px] left-0 bg-pp-ink/70 rounded-pill"
                        style={{ width: `${pos * 100}%` }}
                      />
                      <div
                        className="absolute inset-y-0 w-[3px] bg-pp-ink rounded-full"
                        style={{ left: `calc(${pos * 100}% - 1.5px)` }}
                      />
                    </div>
                  ) : p.disponivel ? (
                    <p className="text-pp-ink-soft text-xs">
                      sem {rotuloDaMetrica(metrica)} para este domínio — não
                      recebe barra
                    </p>
                  ) : (
                    <Indisponivel mensagem={p.mensagem} />
                  )}

                  {p.ambiguo && <AvisoAmbiguo />}
                </div>
              );
            })}

            {range && (
              <div className="flex justify-between text-[11px] text-pp-ink-soft">
                <span>{range.min}</span>
                <span>{range.max}</span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
