// FDT · Teste dos Cinco Dígitos, na apresentação. Puro, para ser testado
// sem DOM (o Vitest deste repositório roda em `node`).
//
// TRAVA CENTRAL, a mesma dos vizinhos `confias-derivado.ts` e
// `phq9-derivado.ts`: NADA AQUI CALCULA. A Edge subtrai, compara com os
// pontos empíricos da faixa etária e devolve faixa e classificação
// prontas. Este módulo só as ENCONTRA, junta com o `z` que já veio no
// resultado normativo e entrega a quem desenha.
//
// Não existe subtração de Escolha menos Leitura aqui, não existe divisão
// por DP, não existe P95/P75/P25/P5 e não existe rótulo de faixa escrito no
// cliente — há teste varrendo o código deste arquivo para provar as quatro
// coisas. Os cortes não chegam ao browser, e reconstruí-los criaria uma
// segunda régua que um dia discordaria da do servidor sem ninguém notar.
//
// POR QUE A CLASSIFICAÇÃO DO FDT VEM DO DERIVADO, E NÃO DO CARD
//
// Nos outros 20 instrumentos a classificação sai em
// `resultados.<escala>.classification`. No FDT ela sai NULA ali, e não é
// esquecimento: os cortes do FDT mudam a cada faixa etária, e a tabela
// `classification_bands` do servidor não tem `norm_set_id`. A classificação
// coube em `derived.fdt`, e é de lá que ela vem. Não são duas — é uma só,
// no lugar em que coube.
//
// O `z` continua vindo do resultado normativo, com a direção invertida que
// o FDT usa: menos tempo e menos erro são MELHOR desempenho, então bruto
// abaixo da média dá z positivo. Quem inverte é o servidor.
//
// ONDE O DERIVADO É LIDO, e por que são dois caminhos — idêntico ao PHQ-9:
//
//   tela / histórico / documento   `derived.fdt`, da Edge
//   Relatório Pró (gerador)        `subject_meta._corrigefacil.fdt`, lido
//                                  direto do banco pelo servidor

import type { DerivadoFdt, MedidaFdt, ResultadoEscala } from './api';
import { CHAVE_RESERVADA } from './confias-derivado';

export const CODIGO_FDT = 'FDT';

/** Este é o instrumento cujo resultado é desenhado pelo bloco próprio?
 *
 *  Quem pergunta são a tela de correção e o histórico, para não desenhar a
 *  grade genérica de cards ao lado do bloco — seriam as mesmas dez medidas
 *  duas vezes, e a metade sem classificação pareceria resultado incompleto.
 *  Os outros 20 continuam na grade de sempre. */
export function ehFdt(code: string | null | undefined): boolean {
  return code === CODIGO_FDT;
}

/** Os rótulos das dez medidas, na ordem em que o profissional as aplica.
 *
 *  Moram aqui porque `GET /avaliacao/:id` devolve `resultados` indexado por
 *  CÓDIGO e não transporta o nome da escala — o histórico só tem
 *  `T_LEITURA`. Sem este mapa, a mesma avaliação sairia com um nome na tela
 *  de correção (que tem o catálogo) e com o código no histórico.
 *
 *  É rótulo, e só: nenhum número, nenhum corte, nenhuma fórmula. */
export const MEDIDAS_TEMPO: readonly (readonly [string, string])[] = [
  ['T_LEITURA', 'Leitura'],
  ['T_CONTAGEM', 'Contagem'],
  ['T_ESCOLHA', 'Escolha'],
  ['T_ALTERNANCIA', 'Alternância'],
  ['INIBICAO', 'Inibição'],
  ['FLEXIBILIDADE', 'Flexibilidade'],
];

export const MEDIDAS_ERRO: readonly (readonly [string, string])[] = [
  ['E_LEITURA', 'Leitura'],
  ['E_CONTAGEM', 'Contagem'],
  ['E_ESCOLHA', 'Escolha'],
  ['E_ALTERNANCIA', 'Alternância'],
];

export const TITULO_TEMPO = 'Desempenho · tempo';
export const TITULO_ERRO = 'Erros';

/** As duas medidas que o SERVIDOR monta, e que nunca são pedidas. */
export const MEDIDAS_CALCULADAS: readonly string[] = [
  'INIBICAO',
  'FLEXIBILIDADE',
];

/** A nota que impede a leitura errada mais provável deste bloco: tomar
 *  Inibição e Flexibilidade por tempos aplicados. Elas são a diferença
 *  entre duas condições, descontando a velocidade de base. */
export const NOTA_DERIVADAS =
  'Inibição e Flexibilidade não são cronometradas: o servidor as calcula ' +
  'descontando o tempo de Leitura das condições de Escolha e Alternância.';

/** A nota do bloco de erros: a régua deles é própria e tem três faixas,
 *  não as cinco dos tempos. */
export const NOTA_ERROS =
  'Os erros são classificados por pontos próprios da faixa etária, em três ' +
  'faixas.';

/** UMA linha da apresentação: o que o servidor mandou sobre uma medida.
 *
 *  `bruto` e `z` vêm do resultado normativo; `faixa` e `classificacao`, do
 *  derivado. `indisponivel` é a mensagem do próprio servidor quando não há
 *  norma para aquela idade — nunca um texto inventado aqui. */
export type LinhaFdt = {
  code: string;
  nome: string;
  bruto: number | null;
  z: number | null;
  faixa: string | null;
  classificacao: string | null;
  indisponivel: string | null;
};

export type BlocoFdt = { titulo: string; nota: string; linhas: LinhaFdt[] };

/** O z como o profissional lê: duas casas, vírgula decimal.
 *
 *  FORMATAÇÃO, e só. O número guardado continua sendo o que o servidor
 *  mandou — `LinhaFdt.z` segue com o valor integral, e é ele que qualquer
 *  comparação usa. O que esta função devolve é texto para a tela.
 *
 *  Existe porque o z do servidor chega com a precisão da divisão:
 *  0.13846153846153825 impresso cru ocupa a linha inteira e sugere uma
 *  exatidão que a medida não tem. Duas casas é a régua em que a
 *  controladora escreve o z, e é a mesma dos outros números da tela.
 *
 *  Uma função só, usada pela tela, pelo histórico e pelo documento: duas
 *  formatações independentes divergiriam na primeira casa de arredondamento,
 *  e a mesma avaliação sairia com um z na tela e outro no PDF.
 *
 *  `-0,00` não é impresso. Ele aparece quando o z é negativo e minúsculo, e
 *  parece defeito sem dizer nada que `0,00` não diga.
 *
 *  Null continua null: sem z — DP zero na faixa, por exemplo — não há o que
 *  formatar, e inventar "0,00" afirmaria uma medida que não existe. */
export function zFormatado(z: number | null | undefined): string | null {
  if (typeof z !== 'number' || !Number.isFinite(z)) return null;
  const texto = z.toFixed(CASAS_DO_Z);
  return (texto === '-0.00' ? '0.00' : texto).replace('.', ',');
}

/** Duas casas: é como a controladora escreve o z, e como o produto já
 *  escreve os outros decimais (ver `metricas-instrumento`). */
const CASAS_DO_Z = 2;

/** O derivado do FDT, quando existe.
 *
 *  Devolve null para: instrumento sem `derived`, FDT cuja idade caiu fora
 *  de 6 a 92 (a Edge omite a chave, porque sem norma não há classificação)
 *  e avaliação salva antes de o campo existir. Os três são a mesma coisa
 *  para a tela. */
export function derivadoFdt(
  origem: { derived?: { fdt?: DerivadoFdt } } | null | undefined,
): DerivadoFdt | null {
  const d = origem?.derived?.fdt;
  if (!d || typeof d !== 'object') return null;
  if (!d.medidas || typeof d.medidas !== 'object') return null;
  return d;
}

/** O MESMO derivado, lido da chave reservada de `subject_meta`.
 *
 *  É o caminho do Relatório Pró, que consulta `assessments` direto no banco
 *  e por isso vê `_corrigefacil` em vez de `derived`. A chave reservada é a
 *  mesma do CONFIAS e do PHQ-9 — o snapshot é um só, com uma entrada por
 *  instrumento. */
export function derivadoFdtDoMeta(
  meta: Record<string, unknown> | null | undefined,
): DerivadoFdt | null {
  const reservada = meta?.[CHAVE_RESERVADA];
  if (!reservada || typeof reservada !== 'object' || Array.isArray(reservada)) {
    return null;
  }
  return derivadoFdt({ derived: reservada as { fdt?: DerivadoFdt } });
}

function linhaDe(
  code: string,
  nome: string,
  medida: MedidaFdt | undefined,
  resultado: ResultadoEscala | undefined,
): LinhaFdt {
  return {
    code,
    nome,
    // o bruto do resultado normativo é o mesmo do derivado; preferir o do
    // resultado mantém UMA origem para o número que o profissional lê
    bruto: resultado?.raw ?? medida?.bruto ?? null,
    z: resultado?.z ?? null,
    faixa: medida?.faixa_percentilica ?? null,
    classificacao: medida?.classificacao ?? null,
    indisponivel:
      resultado && resultado.available === false
        ? (resultado.message ?? 'Resultado indisponível.')
        : null,
  };
}

/** Os dois blocos da apresentação, na ordem do controlador.
 *
 *  Medida que não veio em `resultados` nem no derivado fica de fora: o
 *  servidor não a devolveu, e desenhar uma linha vazia diria que ela existe
 *  e não foi lida. É o que acontece com Inibição e Flexibilidade quando
 *  falta um componente da subtração — o servidor não as monta, e elas não
 *  aparecem.
 *
 *  Null fora do FDT e no FDT sem derivado nenhum. */
export function blocosFdt(
  code: string | null | undefined,
  derivado: DerivadoFdt | null,
  resultados: Readonly<Record<string, ResultadoEscala>> | null | undefined,
): BlocoFdt[] | null {
  if (!ehFdt(code)) return null;
  const res = resultados ?? {};
  const medidas = derivado?.medidas ?? {};
  const monta = (
    titulo: string,
    nota: string,
    lista: readonly (readonly [string, string])[],
  ): BlocoFdt => ({
    titulo,
    nota,
    linhas: lista
      .filter(([c]) => c in medidas || c in res)
      .map(([c, nome]) => linhaDe(c, nome, medidas[c], res[c])),
  });
  const blocos = [
    monta(TITULO_TEMPO, NOTA_DERIVADAS, MEDIDAS_TEMPO),
    monta(TITULO_ERRO, NOTA_ERROS, MEDIDAS_ERRO),
  ].filter((b) => b.linhas.length > 0);
  return blocos.length > 0 ? blocos : null;
}

/** As medidas que o servidor NÃO conseguiu montar, com o nome que o
 *  profissional lê. Vazio quando montou as duas.
 *
 *  Serve para a ausência ser legível: sem o tempo de Leitura não há
 *  Inibição nem Flexibilidade, e o bloco precisa dizer isso em vez de
 *  simplesmente não ter as linhas. */
export function derivadasAusentes(derivado: DerivadoFdt | null): string[] {
  const estado = derivado?.derivadas;
  if (!estado || typeof estado !== 'object') return [];
  const nome = new Map(MEDIDAS_TEMPO.map(([c, n]) => [c, n]));
  return MEDIDAS_CALCULADAS.filter((c) => estado[c] === false).map(
    (c) => nome.get(c) ?? c,
  );
}

/** O bloco do derivado no texto que vai ao modelo do Relatório Pró.
 *
 *  Transcrição, com os mesmos rótulos da tela e do documento, para o modelo
 *  não receber um vocabulário próprio. Sai só o que o servidor mandou:
 *  bruto, faixa e classificação por medida.
 *
 *  Null quando não há snapshot — é o que mantém o prompt dos outros
 *  instrumentos, e o de toda avaliação antiga, sem um caractere de
 *  diferença. */
export function fdtParaTexto(d: DerivadoFdt | null): string | null {
  if (!d) return null;
  const linhas: string[] = [];
  for (const [titulo, lista] of [
    [TITULO_TEMPO, MEDIDAS_TEMPO],
    [TITULO_ERRO, MEDIDAS_ERRO],
  ] as const) {
    const doBloco = lista
      .filter(([c]) => d.medidas[c])
      .map(([c, nome]) => {
        const m = d.medidas[c];
        const partes = [`${nome}: ${m.bruto}`];
        if (m.faixa_percentilica) partes.push(m.faixa_percentilica);
        if (m.classificacao) partes.push(m.classificacao);
        return `  ${partes.join(' · ')}`;
      });
    if (doBloco.length > 0) linhas.push(titulo, ...doBloco);
  }
  const ausentes = derivadasAusentes(d);
  if (ausentes.length > 0) {
    linhas.push(`Não calculadas por falta de componente: ${ausentes.join(', ')}`);
  }
  return linhas.length > 0 ? linhas.join('\n') : null;
}
