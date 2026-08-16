// PHQ-9 · rastreamento e alerta do item 9, na apresentação. Puro, para ser
// testado sem DOM (o Vitest deste repositório roda em `node`).
//
// TRAVA CENTRAL, a mesma do vizinho `confias-derivado.ts`: NADA AQUI
// CALCULA. A Edge compara o total com o corte, lê a resposta do item 9 e
// devolve as duas frases prontas. Este módulo só as ENCONTRA e as entrega
// a quem desenha.
//
// Não existe `>= 10` aqui, não existe leitura de `respostas[9]` e não
// existe rótulo de faixa escrito no cliente — há teste varrendo o código
// deste arquivo para provar as três coisas. O corte não chega ao browser, e
// reconstruí-lo criaria uma segunda régua que um dia discordaria da do
// servidor sem ninguém notar.
//
// O rastreamento NÃO é a classificação. As cinco faixas do PHQ-9 continuam
// saindo em `resultados.TOTAL.classification` e são desenhadas pelos cards
// de sempre. Esta é uma segunda leitura do MESMO total.
//
// ONDE O DERIVADO É LIDO, e por que são dois caminhos — idêntico ao CONFIAS:
//
//   tela / histórico / documento   `derived.phq9`, da Edge
//   Relatório Pró (gerador)        `subject_meta._corrigefacil.phq9`, lido
//                                  direto do banco pelo servidor

import type { DerivadoPhq9 } from './api';
import { CHAVE_RESERVADA } from './confias-derivado';

export const CODIGO_PHQ9 = 'PHQ-9';

export const TITULO_RASTREAMENTO = 'Rastreamento';

/** A nota que impede a leitura errada mais provável deste bloco: tomar o
 *  rastreamento pela classificação. Os dois saem do mesmo total e dizem
 *  coisas diferentes — um corte de triagem e uma faixa de intensidade. */
export const NOTA_RASTREAMENTO =
  'Leitura de triagem sobre a mesma pontuação total. Não substitui a ' +
  'classificação apresentada acima nem constitui diagnóstico.';

/** O título do alerta do item 9. O TEXTO do alerta vem do servidor. */
export const TITULO_ALERTA = 'Item 9';

/** O derivado do PHQ-9, quando existe.
 *
 *  Devolve null para: instrumento sem `derived`, PHQ-9 cujo protocolo
 *  estava incompleto (a Edge omite a chave nesse caso) e avaliação salva
 *  antes de o campo existir. Os três são a mesma coisa para a tela. */
export function derivadoPhq9(
  origem: { derived?: { phq9?: DerivadoPhq9 } } | null | undefined,
): DerivadoPhq9 | null {
  const d = origem?.derived?.phq9;
  if (!d || typeof d !== 'object') return null;
  // um derivado sem nenhuma das duas leituras não é bloco: é ausência
  if (!d.rastreamento && !d.alerta_item_9) return null;
  return d;
}

/** O MESMO derivado, lido da chave reservada de `subject_meta`.
 *
 *  É o caminho do Relatório Pró, que consulta `assessments` direto no banco
 *  e por isso vê `_corrigefacil` em vez de `derived`. A chave reservada é a
 *  mesma do CONFIAS — o snapshot é um só, com uma entrada por instrumento. */
export function derivadoPhq9DoMeta(
  meta: Record<string, unknown> | null | undefined,
): DerivadoPhq9 | null {
  const reservada = meta?.[CHAVE_RESERVADA];
  if (!reservada || typeof reservada !== 'object' || Array.isArray(reservada)) {
    return null;
  }
  return derivadoPhq9({ derived: reservada as { phq9?: DerivadoPhq9 } });
}

/** O bloco do derivado no texto que vai ao modelo do Relatório Pró.
 *
 *  Transcrição, com os mesmos rótulos da tela e do documento, para o modelo
 *  não receber um vocabulário próprio. O alerta entra INTEIRO: recortá-lo
 *  deixaria o modelo escrever a parte que falta.
 *
 *  Null quando não há snapshot — é o que mantém o prompt dos outros
 *  instrumentos, e o de toda avaliação antiga, sem um caractere de
 *  diferença. */
export function phq9ParaTexto(d: DerivadoPhq9 | null): string | null {
  if (!d) return null;
  const linhas: string[] = [];
  if (d.rastreamento) linhas.push(`${TITULO_RASTREAMENTO}: ${d.rastreamento}`);
  if (d.alerta_item_9) linhas.push(d.alerta_item_9);
  return linhas.length > 0 ? linhas.join('\n') : null;
}
