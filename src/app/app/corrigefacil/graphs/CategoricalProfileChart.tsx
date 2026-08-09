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
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
  type PontoEscala,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, FaixasDaRegua, Indisponivel, LegendaFaixas, MarcadorResultado } from './parts';

/** ETPC: a categoria que o servidor nomeou, em degraus ordinais neutros.
 *  A posição na sequência sai da ORDEM das faixas daquela escala, não de
 *  transformar 25/50/75 em tamanho. */
function Categoria({ p }: Readonly<{ p: PontoEscala }>) {
  const rotulos = p.segmentos.map((s) => s.rotulo);
  let lista: string[];
  if (rotulos.length > 0) {
    lista = rotulos;
  } else if (p.classificacao) {
    // sem faixas publicadas, mostra só a categoria que o servidor nomeou
    lista = [p.classificacao];
  } else {
    lista = [];
  }

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
                ? 'bg-pp-block-lilac border-pp-ink/30 text-pp-ink font-medium print:border-2 print:border-pp-ink'
                : 'border-pp-hairline text-pp-ink-soft print:border-pp-ink/40',
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
function MiniRegua({
  p,
  metrica,
  instrumento,
}: Readonly<{ p: PontoEscala; metrica: Metrica; instrumento?: string }>) {
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
        className="relative h-7 rounded-pill overflow-hidden border border-pp-ink/15 print:border-pp-ink"
      >
        <FaixasDaRegua segmentos={p.segmentos} range={range} />
        {pos !== null && (
          <MarcadorResultado pos={pos} />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-pp-ink-soft">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
      <LegendaFaixas segmentos={p.segmentos} instrumento={instrumento} />
    </div>
  );
}

export function CategoricalProfileChart({
  blocos,
  metrica,
  instrumento,
}: Readonly<{
  blocos: BlocoModelo[];
  metrica: Metrica;
  instrumento?: string;
}>) {
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
                className="border border-pp-hairline rounded-block p-4 space-y-2"
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
                      <MiniRegua p={p} metrica={metrica} instrumento={instrumento} />
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
