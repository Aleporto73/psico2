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
  posicao,
  rotuloDaMetrica,
  type BlocoModelo,
  type PontoEscala,
} from './graph-model';
import type { Metrica } from './graph-config';
import { AvisoAmbiguo, Excedente, FaixasDaRegua, Indisponivel, LegendaFaixas, MarcadorResultado } from './parts';

function Regua({
  p,
  metrica,
  instrumento,
}: Readonly<{ p: PontoEscala; metrica: Metrica; instrumento?: string }>) {
  const range = p.range;
  if (!range) return null;
  const pos = posicao(p.valor, range);

  const valor =
    p.valor !== null
      ? `${rotuloDaMetrica(metrica)} ${p.valor}`
      : 'sem valor para posicionar';
  const legenda = p.classificacao
    ? `Resultado: ${valor} · ${p.classificacao}`
    : `Resultado: ${valor}`;

  const descricao =
    descreverPonto(p, metrica) +
    (p.segmentos.length > 0
      ? '. Faixas: ' + p.segmentos.map(descreverSegmento).join('; ')
      : '');

  return (
    <figure className="space-y-3 print:break-inside-avoid">
      <div
        role="img"
        aria-label={descricao}
        className="relative h-9 rounded-pill overflow-hidden border border-pp-ink/15 print:border-pp-ink"
      >
        <FaixasDaRegua segmentos={p.segmentos} range={range} />

        {pos !== null && (
          <MarcadorResultado pos={pos} />
        )}
      </div>

      <div className="flex justify-between text-[11px] text-pp-ink-soft">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>

      <LegendaFaixas segmentos={p.segmentos} instrumento={instrumento} />

      {/* curto de propósito: escore e classificação por extenso já estão
          no card de resultado, acima. Aqui basta ancorar a leitura da
          régua. */}
      <figcaption className="text-[11px] text-pp-ink-soft">{legenda}</figcaption>
    </figure>
  );
}

export function ScoreBandChart({
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
        <div key={b.titulo ?? bi} className="space-y-5">
          {b.titulo && <p className="text-pp-ink text-sm font-medium">{b.titulo}</p>}
          {b.pontos.map((p) => (
            <div key={p.escala} className="space-y-2 print:break-inside-avoid">
              <p className="text-pp-ink text-sm font-medium">{p.nome}</p>
              {p.disponivel ? (
                <>
                  <Regua p={p} metrica={metrica} instrumento={instrumento} />
                  {/* `posicao` prende o marcador na borda; sem esta marca o
                      leitor não saberia que o valor a ultrapassou. Só dispara
                      em métrica de extremos abertos — nas escalas cujo eixo
                      cobre o domínio inteiro, `excedente` é sempre null. */}
                  {p.excedente && <Excedente lado={p.excedente} />}
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
