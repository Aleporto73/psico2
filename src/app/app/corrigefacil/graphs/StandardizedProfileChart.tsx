// =====================================================================
// STANDARDIZED PROFILE · escalas na MESMA métrica, num eixo só.
//
// A comparação lado a lado só é honesta porque a métrica é padronizada:
// é ela — e não o bruto — que torna A-CON e B-SEQ comparáveis, já que os
// brutos vão de 1..4 e 1..10.
//
// Escala sem valor NÃO entra com barra zero: ela some da série, e o
// motivo aparece em texto. Barra de altura zero seria uma afirmação.
// =====================================================================

import {
  descreverPonto,
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, Excedente, Indisponivel } from './parts';

export function StandardizedProfileChart({
  blocos,
  metrica,
}: {
  blocos: BlocoModelo[];
  metrica: Metrica;
}) {
  return (
    <div className="space-y-8">
      {blocos.map((b, bi) => {
        const range = b.range;
        // o zero do eixo z cai no meio; nas demais métricas a barra
        // cresce da esquerda
        const zero = range ? posicao(0, range) : null;
        const ancora = range && range.min < 0 && zero !== null ? zero : 0;

        return (
          <section key={b.titulo ?? bi} className="space-y-4">
            {b.titulo && (
              <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>
            )}

            <div className="space-y-3">
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
                        {p.classificacao ? ` · ${p.classificacao}` : ''}
                      </p>
                    </div>

                    {p.disponivel && pos !== null && range ? (
                      <div
                        role="img"
                        aria-label={descreverPonto(p, metrica)}
                        className="relative h-5 rounded-pill bg-pp-ink/[0.06] border border-pp-ink/10"
                      >
                        {ancora > 0 && (
                          <div
                            className="absolute inset-y-0 w-px bg-pp-ink/25"
                            style={{ left: `${ancora * 100}%` }}
                          />
                        )}
                        <div
                          className="absolute inset-y-[3px] bg-pp-ink/70 rounded-pill"
                          style={{
                            left: `${Math.min(ancora, pos) * 100}%`,
                            width: `${Math.abs(pos - ancora) * 100}%`,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 w-[3px] bg-pp-ink rounded-full"
                          style={{ left: `calc(${pos * 100}% - 1.5px)` }}
                        />
                      </div>
                    ) : p.disponivel ? (
                      <p className="text-pp-ink-soft text-xs">
                        sem {rotuloDaMetrica(metrica)} para esta escala — não
                        recebe barra
                      </p>
                    ) : (
                      <Indisponivel mensagem={p.mensagem} />
                    )}

                    <div className="flex flex-wrap gap-3">
                      {p.excedente && <Excedente lado={p.excedente} />}
                      {p.ambiguo && <AvisoAmbiguo />}
                    </div>
                  </div>
                );
              })}
            </div>

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
