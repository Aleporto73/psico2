// =====================================================================
// Peças compartilhadas pelas quatro famílias.
//
// Existem para que "indisponível" e "ambíguo" tenham UMA aparência e UM
// texto no produto inteiro: são justamente os dois estados em que a
// tentação de improvisar (desenhar zero, pintar de vermelho) é maior.
// =====================================================================

import { AVISO_AMBIGUO, type Segmento } from './graph-model';

/** O intervalo de uma faixa, só o número. Fica separado do rótulo porque
 *  a legenda os empilha — rótulo em cima, intervalo embaixo — e assim ela
 *  vira uma lista lida de relance, em vez de texto corrido.
 *
 *  Faixa aberta continua dita como aberta: nunca se inventa o limite que
 *  o acervo não publicou. */
function intervalo(seg: Segmento): string {
  if (seg.de === null && seg.ate === null) return '—';
  if (seg.de === null) return `até ${seg.ate}`;
  if (seg.ate === null) return `${seg.de} ou mais`;
  return `${seg.de}–${seg.ate}`;
}

/** Legenda das faixas, em chips. A faixa atual ganha o lilás do produto:
 *  é destaque de leitura, não semântica de gravidade — a mesma marca vale
 *  para "Risco Baixo" e para "Risco Alto". */
export function LegendaFaixas({ segmentos }: Readonly<{ segmentos: Segmento[] }>) {
  if (segmentos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {segmentos.map((seg, i) => (
        <li
          key={`${seg.rotulo}-${i}`}
          className={[
            'rounded-block px-3 py-1.5 border leading-tight',
            seg.atual
              ? 'bg-pp-block-lilac border-pp-block-lilac'
              : 'border-pp-hairline',
          ].join(' ')}
        >
          <span
            className={[
              'block text-[11px]',
              seg.atual ? 'text-pp-ink font-medium' : 'text-pp-ink-soft',
            ].join(' ')}
          >
            {seg.rotulo}
          </span>
          <span className="block text-[11px] text-pp-ink-soft tabular-nums">
            {intervalo(seg)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** available=false. Não desenha valor, não desenha zero, não ocupa
 *  posição no eixo: quem informa é a mensagem que o servidor mandou. */
export function Indisponivel({ mensagem }: Readonly<{ mensagem: string | null }>) {
  return (
    <p className="text-pp-ink-soft text-sm border border-dashed border-pp-hairline rounded-block px-4 py-3">
      {mensagem ?? 'Resultado indisponível.'}
    </p>
  );
}

/** flags inclui "ambiguous". O resultado continua visível e na mesma
 *  posição: a flag declara incerteza, não corrige o valor. Não se diz
 *  qual era o outro escore — o cliente não o recebe — nem se sugere
 *  revisão clínica. */
export function AvisoAmbiguo() {
  return (
    <p className="text-pp-ink-soft text-xs italic">{AVISO_AMBIGUO}</p>
  );
}

/** Métrica sem domínio visual declarado no contrato. Aparece no lugar do
 *  gráfico, e o resultado textual acima continua completo. */
export function SemEixo({ motivo, titulo }: Readonly<{ motivo: string; titulo?: string }>) {
  return (
    <div className="border border-dashed border-pp-hairline rounded-block px-4 py-3 space-y-1">
      {titulo && <p className="text-pp-ink text-sm font-medium">{titulo}</p>}
      <p className="text-pp-ink-soft text-sm">{motivo}</p>
    </div>
  );
}

/** Marca de excedente: valor fora do domínio declarado. Só aparece onde
 *  a métrica não tem intervalo fechado (z). Cortar em silêncio
 *  esconderia exatamente o caso extremo. */
export function Excedente({ lado }: Readonly<{ lado: 'abaixo' | 'acima' }>) {
  return (
    <span className="text-[11px] text-pp-ink-soft">
      {lado === 'acima' ? 'acima do eixo exibido' : 'abaixo do eixo exibido'}
    </span>
  );
}
