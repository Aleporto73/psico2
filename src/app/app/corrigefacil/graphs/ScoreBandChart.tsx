// =====================================================================
// SCORE BAND · uma escala, a régua de faixas e a posição do resultado.
//
// A régua inteira aparece porque só ela dá sentido à posição: o rótulo
// sozinho ("Moderado") não permite ver onde o resultado caiu dentro do
// intervalo, e é essa leitura que o profissional faz.
//
// Nenhuma cor carrega significado clínico. O destaque marca a faixa que
// o SERVIDOR nomeou — não a que a altura sugeriria. CHECK-DIS é a prova
// de por que: lá o escore mais alto é o melhor resultado.
// =====================================================================

import {
  descreverPonto,
  descreverSegmento,
  faixaEmFracao,
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
  type PontoEscala,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, Indisponivel } from './parts';

function Regua({ p, metrica }: { p: PontoEscala; metrica: Metrica }) {
  const range = p.range;
  if (!range) return null;
  const pos = posicao(p.valor, range);

  const descricao =
    descreverPonto(p, metrica) +
    (p.segmentos.length > 0
      ? '. Faixas: ' + p.segmentos.map(descreverSegmento).join('; ')
      : '');

  return (
    <figure className="space-y-2">
      <div
        role="img"
        aria-label={descricao}
        className="relative h-9 rounded-pill overflow-hidden border border-pp-ink/15"
      >
        {p.segmentos.map((seg, i) => {
          const f = faixaEmFracao(seg, range);
          if (!f) return null;
          return (
            <div
              key={`${seg.rotulo}-${i}`}
              className={[
                'absolute inset-y-0 border-r border-pp-ink/15 last:border-r-0',
                // intensidade alternada só para separar faixas vizinhas;
                // não é escala de gravidade
                i % 2 === 0 ? 'bg-pp-ink/[0.04]' : 'bg-pp-ink/[0.09]',
                seg.atual ? 'bg-pp-block-lilac' : '',
              ].join(' ')}
              style={{ left: `${f.inicio * 100}%`, width: `${(f.fim - f.inicio) * 100}%` }}
            />
          );
        })}

        {pos !== null && (
          // marcador do resultado: traço cheio, alto contraste, sem cor
          // com significado
          <div
            className="absolute inset-y-0 w-[3px] bg-pp-ink rounded-full"
            style={{ left: `calc(${pos * 100}% - 1.5px)` }}
          />
        )}
      </div>

      <div className="flex justify-between text-[11px] text-pp-ink-soft">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>

      {p.segmentos.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-pp-ink-soft">
          {p.segmentos.map((seg, i) => (
            <li key={`leg-${seg.rotulo}-${i}`} className={seg.atual ? 'text-pp-ink font-medium' : ''}>
              {descreverSegmento(seg)}
              {seg.atual ? ' ·' : ''}
            </li>
          ))}
        </ul>
      )}

      <figcaption className="text-xs text-pp-ink-soft">
        {p.valor !== null
          ? `${rotuloDaMetrica(metrica)} ${p.valor}${p.ci95 ? ` (${p.ci95})` : ''}`
          : 'sem valor para posicionar'}
        {p.classificacao ? ` · ${p.classificacao}` : ''}
      </figcaption>
    </figure>
  );
}

export function ScoreBandChart({
  blocos,
  metrica,
}: {
  blocos: BlocoModelo[];
  metrica: Metrica;
}) {
  return (
    <div className="space-y-6">
      {blocos.map((b, bi) => (
        <div key={b.titulo ?? bi} className="space-y-5">
          {b.titulo && <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>}
          {b.pontos.map((p) => (
            <div key={p.escala} className="space-y-2">
              <p className="text-pp-ink text-sm font-medium">{p.nome}</p>
              {p.disponivel ? (
                <>
                  <Regua p={p} metrica={metrica} />
                  {p.ambiguo && <AvisoAmbiguo />}
                </>
              ) : (
                <Indisponivel mensagem={p.mensagem} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
