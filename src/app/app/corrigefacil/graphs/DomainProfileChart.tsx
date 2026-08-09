// =====================================================================
// DOMAIN PROFILE · os cinco domínios do Bayley na métrica composta.
//
// Duas coisas o distinguem do perfil padronizado:
//
//   1. os 16 subtestes ficam FORA — eles saem em escalonada 1..19 e no
//      mesmo eixo da composta 40..160 seriam erro de categoria;
//   2. IC95 é OPCIONAL e varia DENTRO do instrumento. O domínio
//      Adaptativo não tem IC95 publicado em nenhuma linha, enquanto os
//      outros quatro têm em todas.
//
// COMO O IC95 APARECE HOJE: como TEXTO, ao lado do escore — e só onde o
// servidor o enviou. NÃO existe barra de erro desenhada, e não é
// esquecimento. O `ci95` chega como string de intervalo e nenhum
// documento do contrato garante essa serialização; G1A §10 diz
// explicitamente que, se extremos numéricos forem necessários, quem os
// fornece é o servidor, em campo próprio. Fazer o parser aqui a partir
// do formato observado seria transformar amostra em contrato.
// =====================================================================

import {
  descreverPonto,
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, Indisponivel, MarcadorResultado } from './parts';

export function DomainProfileChart({
  blocos,
  metrica,
}: Readonly<{
  blocos: BlocoModelo[];
  metrica: Metrica;
}>) {
  return (
    <div className="space-y-6">
      {blocos.map((b, bi) => {
        const range = b.range;
        return (
          <section key={b.titulo ?? bi} className="space-y-3">
            {b.titulo && <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>}

            {b.pontos.map((p) => {
              const pos = posicao(p.valor, range);
              let corpo;
              if (!p.disponivel) {
                corpo = <Indisponivel mensagem={p.mensagem} />;
              } else if (pos !== null && range) {
                corpo = (
                  <div
                    role="img"
                    aria-label={descreverPonto(p, metrica)}
                    className="relative h-5 rounded-pill bg-pp-ink/[0.05] border border-pp-hairline print:border-pp-ink"
                  >
                    <div
                      className="absolute inset-y-[3px] left-0 bg-pp-ink/70 rounded-pill print:border print:border-pp-ink"
                      style={{ width: `${pos * 100}%` }}
                    />
                    <MarcadorResultado pos={pos} />
                  </div>
                );
              } else {
                corpo = (
                  <p className="text-pp-ink-soft text-xs">
                    sem {rotuloDaMetrica(metrica)} para este domínio — não
                    recebe barra
                  </p>
                );
              }
              return (
                <div key={p.escala} className="space-y-1 print:break-inside-avoid">
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

                  {corpo}

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
