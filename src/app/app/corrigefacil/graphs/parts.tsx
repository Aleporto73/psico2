// =====================================================================
// Peças compartilhadas pelas quatro famílias.
//
// Existem para que "indisponível" e "ambíguo" tenham UMA aparência e UM
// texto no produto inteiro: são justamente os dois estados em que a
// tentação de improvisar (desenhar zero, pintar de vermelho) é maior.
// =====================================================================

import { faixaEmFracao, AVISO_AMBIGUO, type Segmento } from './graph-model';
import type { DisplayRange } from './graph-config';

// ---------------------------------------------------------------------
// IMPRESSÃO · por que quase tudo aqui tem um par `print:`
//
// Ao imprimir com "background graphics" desligado — padrão de muitos
// navegadores — o browser não pinta background-color. Um gráfico que
// dependa só de fundo sai do PDF como uma moldura vazia: some o
// marcador, somem as faixas, some o destaque da faixa atual.
//
// A regra deste arquivo é: tudo que precisa ser LIDO no papel existe
// também como BORDA, que é pintada de qualquer jeito. O fundo continua
// sendo o que faz o desenho bonito na tela; a borda é o que faz ele
// sobreviver à impressora. Nenhuma classe `print:` altera a tela.
// ---------------------------------------------------------------------

/** O marcador vertical do resultado — onde ele caiu na régua.
 *
 *  Mora aqui, e não repetido nas quatro famílias, porque é a peça em que
 *  um detalhe silencioso estraga tudo: se a geometria divergir entre os
 *  gráficos, o mesmo escore aparece em pontos diferentes.
 *
 *  BORDA, não fundo: `background-color` não é pintado na impressão sem
 *  background graphics, e era assim que o marcador sumia do PDF. A
 *  geometria é a de sempre — `box-sizing: border-box` com largura 0 faz a
 *  borda de 3px ocupar de `left` a `left + 3px`, exatamente o intervalo
 *  que um fundo de 3px ocuparia. */
export function MarcadorResultado({ pos }: Readonly<{ pos: number }>) {
  return (
    <div
      className="absolute inset-y-0 w-0 border-l-[3px] border-pp-ink"
      style={{ left: `calc(${pos * 100}% - 1.5px)` }}
    />
  );
}

/** As faixas da régua, lado a lado. Compartilhada pelo ScoreBand e pelo
 *  small multiple do Categorical — as duas desenham a mesma coisa em
 *  tamanhos diferentes.
 *
 *  A faixa ATUAL é a que o servidor nomeou. Na tela ela ganha o lilás; no
 *  papel, uma moldura — porque o lilás é fundo e não seria pintado. Em
 *  nenhum dos dois a marca carrega gravidade: é a mesma para "Risco
 *  Baixo" e para "Risco Alto". */
export function FaixasDaRegua({
  segmentos,
  range,
}: Readonly<{ segmentos: Segmento[]; range: DisplayRange }>) {
  return (
    <>
      {segmentos.map((seg, i) => {
        const f = faixaEmFracao(seg, range);
        if (!f) return null;
        return (
          <div
            key={`${seg.rotulo}-${i}`}
            className={[
              // A divisória entre faixas já é borda, então sobrevive ao
              // papel. No print ela fica DISCRETA de propósito: em tinta
              // cheia competia com o marcador, e a régua virava um monte
              // de linhas do mesmo peso.
              'absolute inset-y-0 border-r border-pp-ink/15 last:border-r-0',
              'print:border-pp-ink/30',
              i % 2 === 0 ? 'bg-pp-ink/[0.04]' : 'bg-pp-ink/[0.09]',
              // A faixa atual recebe o lilás, que na tela basta e no papel
              // some — e é para sumir mesmo. No print ela NÃO ganha
              // moldura: uma caixa dentro da barra criava uma quarta
              // linha disputando atenção com o marcador. Quem comunica a
              // faixa atingida é o CHIP da legenda, esse sim com borda
              // forte. RÉGUA mostra POSIÇÃO; CHIP mostra FAIXA.
              seg.atual ? 'bg-pp-block-lilac' : '',
            ].join(' ')}
            style={{
              left: `${f.inicio * 100}%`,
              width: `${(f.fim - f.inicio) * 100}%`,
            }}
          />
        );
      })}
    </>
  );
}

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

/** Rótulo curto para a LEGENDA, por instrumento e por CORRESPONDÊNCIA
 *  EXATA do rótulo completo.
 *
 *  Existe porque as três faixas do CES-D repetem "probabilidade de
 *  depressão" e, lado a lado nos chips, a repetição esconde a única coisa
 *  que as distingue. Aqui só se encurta o que APARECE: `classification`
 *  não muda, o modelo não muda, e o rótulo completo continua indo para o
 *  leitor de tela e para a descrição da régua.
 *
 *  É tabela exata, de propósito. Uma heurística — "pegue a palavra em
 *  maiúsculas", "corte no primeiro espaço" — acertaria aqui e erraria em
 *  instrumentos cujo rótulo não tem essa forma, e erraria calada. Rótulo
 *  que não casar exatamente aparece inteiro. */
const ROTULO_CURTO: Record<string, Record<string, string>> = {
  'CES-D': {
    'BAIXA probabilidade de depressão': 'BAIXA',
    'Probabilidade MODERADA de depressão': 'MODERADA',
    'ALTA probabilidade de depressão': 'ALTA',
  },
};

function curto(rotulo: string, instrumento?: string): string {
  if (!instrumento) return rotulo;
  return ROTULO_CURTO[instrumento]?.[rotulo] ?? rotulo;
}

/** Legenda das faixas, em chips. A faixa atual ganha o lilás do produto:
 *  é destaque de leitura, não semântica de gravidade — a mesma marca vale
 *  para "Risco Baixo" e para "Risco Alto". */
export function LegendaFaixas({
  segmentos,
  instrumento,
}: Readonly<{ segmentos: Segmento[]; instrumento?: string }>) {
  if (segmentos.length === 0) return null;
  return (
    // GRID, não flex-wrap. Com `auto-fit` + `minmax(…, 1fr)` todas as
    // colunas saem com a MESMA largura, e o grid estica os itens até a
    // MESMA altura. No flex-wrap cada chip media pelo próprio texto, e
    // "Normal" ficava do tamanho de um selo ao lado de "Extremamente
    // severo": a régua parecia irregular sem que os dados fossem.
    //
    // 7rem é o piso. Enquanto couberem lado a lado — e no card de largura
    // inteira cabem —, as faixas ficam na MESMA linha; onde não couberem
    // (celular), quebram continuando iguais entre si. Vale igual no papel.
    <ul
      className={[
        'grid gap-1.5',
        // o piso da coluna é o que decide quantas cabem por linha. 6rem
        // deixa as CINCO faixas do DASS-21 na mesma linha dentro do
        // cartão de largura inteira, e ainda dá folga para
        // "Extremamente severo" caber sem quebrar.
        'grid-cols-[repeat(auto-fit,minmax(6rem,1fr))]',
        // no papel a caixa útil é mais estreita que a da tela; o piso
        // menor garante que cinco faixas continuem numa linha só
        'print:grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))]',
      ].join(' ')}
    >
      {segmentos.map((seg, i) => {
        const compacto = curto(seg.rotulo, instrumento);
        return (
          <li
            key={`${seg.rotulo}-${i}`}
            className={[
              'rounded-block border px-2 py-1 leading-tight',
              // centralizado nos DOIS eixos: o grid já dá a todos os
              // chips a mesma altura, então centrar verticalmente faz o
              // par rótulo/intervalo ficar no meio da caixa mesmo quando
              // um rótulo ocupa duas linhas e os vizinhos, uma.
              'flex flex-col items-center justify-center text-center',
              // palavra longa não estoura a caixa; ela quebra dentro dela
              'break-words',
              seg.atual
                ? 'bg-pp-block-lilac border-pp-block-lilac print:border-2 print:border-pp-ink'
                : 'border-pp-hairline print:border-pp-ink/40',
            ].join(' ')}
          >
            {/* Só onde a tela mostra a forma curta é que o rótulo
                completo entra em sr-only — senão o leitor de tela ouviria
                o mesmo texto duas vezes. */}
            {compacto !== seg.rotulo && (
              <span className="sr-only">{seg.rotulo}</span>
            )}
            <span
              aria-hidden={compacto !== seg.rotulo}
              className={[
                'block text-[10px]',
                seg.atual ? 'text-pp-ink font-medium' : 'text-pp-ink-soft',
              ].join(' ')}
            >
              {compacto}
            </span>
            <span className="block text-[10px] text-pp-ink-soft tabular-nums">
              {intervalo(seg)}
            </span>
          </li>
        );
      })}
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
