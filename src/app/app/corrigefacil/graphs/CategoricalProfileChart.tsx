// =====================================================================
// CATEGORICAL PROFILE · escalas que NÃO são comparáveis entre si.
//
// É a família das que compartilham a métrica e não compartilham a régua.
// Por isso: small multiples, cada escala no próprio eixo, nunca barras
// lado a lado num eixo comum.
//
//   DASS-21    mesmo intervalo 0..42, CORTES diferentes: um escore 20 é
//              "Moderado" em Depressão e "Extremamente severo" em
//              Ansiedade. Barras de mesma altura diriam "igual".
//   SCARED-C   tetos de 8 a 26: um 8 é o teto de ESCOLAR e menos de um
//              terço de PANICO.
//   SNAP-IV    o escore é CONTAGEM de sintomas; TOD corta em 4 (teto 8) e
//              DESATENCAO em 6 (teto 9). Mesma contagem, decisões opostas.
//   ETPC       25/50/75 são MARCADORES ORDINAIS de quartil. Desenhá-los
//              como altura diria "três vezes mais" entre categorias
//              vizinhas — por isso aqui se lê a classificação, não o
//              número, e a representação é neutra: traço de personalidade
//              não tem polo bom nem ruim.
//
// Pizza é proibida em toda a família: as escalas não são partes de um
// todo.
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

/** ETPC: a categoria que o servidor nomeou, em degraus ordinais neutros.
 *  A posição na sequência sai da ORDEM das faixas daquela escala, não de
 *  transformar 25/50/75 em tamanho. */
function Categoria({ p }: { p: PontoEscala }) {
  const rotulos = p.segmentos.map((s) => s.rotulo);
  const lista = rotulos.length > 0 ? rotulos : p.classificacao ? [p.classificacao] : [];

  return (
    <div
      role="img"
      aria-label={`${p.nome}: ${p.classificacao ?? 'sem classificação'}`}
      className="flex flex-wrap gap-1"
    >
      {lista.map((r) => {
        const atual = r === p.classificacao;
        return (
          <span
            key={r}
            className={[
              'px-3 py-1 rounded-pill text-xs border',
              atual
                ? 'bg-pp-block-lilac border-pp-ink/30 text-pp-ink font-medium'
                : 'border-pp-ink/10 text-pp-ink-soft',
            ].join(' ')}
          >
            {r}
          </span>
        );
      })}
    </div>
  );
}

/** Mini régua: mesma ideia do ScoreBand, no tamanho de um small
 *  multiple, com o eixo DAQUELA escala. */
function MiniRegua({ p, metrica }: { p: PontoEscala; metrica: Metrica }) {
  const range = p.range;
  if (!range) return null;
  const pos = posicao(p.valor, range);
  const descricao =
    descreverPonto(p, metrica) +
    (p.segmentos.length > 0
      ? '. Faixas: ' + p.segmentos.map(descreverSegmento).join('; ')
      : '');

  return (
    <div className="space-y-1">
      <div
        role="img"
        aria-label={descricao}
        className="relative h-7 rounded-pill overflow-hidden border border-pp-ink/15"
      >
        {p.segmentos.map((seg, i) => {
          const f = faixaEmFracao(seg, range);
          if (!f) return null;
          return (
            <div
              key={`${seg.rotulo}-${i}`}
              className={[
                'absolute inset-y-0 border-r border-pp-ink/15 last:border-r-0',
                i % 2 === 0 ? 'bg-pp-ink/[0.04]' : 'bg-pp-ink/[0.09]',
                seg.atual ? 'bg-pp-block-lilac' : '',
              ].join(' ')}
              style={{ left: `${f.inicio * 100}%`, width: `${(f.fim - f.inicio) * 100}%` }}
            />
          );
        })}
        {pos !== null && (
          <div
            className="absolute inset-y-0 w-[3px] bg-pp-ink rounded-full"
            style={{ left: `calc(${pos * 100}% - 1.5px)` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-pp-ink-soft">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
    </div>
  );
}

export function CategoricalProfileChart({
  blocos,
  metrica,
}: {
  blocos: BlocoModelo[];
  metrica: Metrica;
}) {
  return (
    <div className="space-y-6">
      {blocos.map((b, bi) => (
        <section key={b.titulo ?? bi} className="space-y-4">
          {b.titulo && <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>}

          {/* small multiples: cada escala é um cartão próprio, e é o
              cartão que impede a leitura "uma barra maior que a outra" */}
          <div className="grid gap-4 sm:grid-cols-2">
            {b.pontos.map((p) => (
              <figure
                key={p.escala}
                className="border border-pp-ink/10 rounded-block p-4 space-y-2"
              >
                <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-pp-ink text-sm font-medium">{p.nome}</span>
                  <span className="text-pp-ink-soft text-xs">
                    {p.disponivel && p.valor !== null && metrica !== 'classification'
                      ? `${rotuloDaMetrica(metrica)} ${p.valor}`
                      : ''}
                  </span>
                </figcaption>

                {p.disponivel ? (
                  <>
                    {metrica === 'classification' ? (
                      <Categoria p={p} />
                    ) : (
                      <MiniRegua p={p} metrica={metrica} />
                    )}
                    {p.classificacao && metrica !== 'classification' && (
                      <p className="text-pp-ink text-xs">{p.classificacao}</p>
                    )}
                    {p.ambiguo && <AvisoAmbiguo />}
                  </>
                ) : (
                  <Indisponivel mensagem={p.mensagem} />
                )}
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
