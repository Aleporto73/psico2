// Como as DUAS métricas de um resultado se chamam, por instrumento. Puro,
// para ser testado sem DOM.
//
// TRAVA CENTRAL, a mesma do resto desta pasta: nada aqui pontua. `raw` e
// `score` chegam prontos do servidor e só ganham nome e teto para caber na
// tela. Somar, contar, aplicar corte e classificar é da Edge.
//
// POR QUE ISTO EXISTE
//
// Em 20 dos 21 instrumentos `raw` e `score` são a mesma conta, e "bruto" e
// "escore" bastam. O SNAP-IV-26 não é assim: ele registra INTENSIDADE em
// quatro níveis (0 a 3) e classifica por CONTAGEM de sintomas presentes —
// "Bastante" e "Demais" contam o mesmo sintoma. São duas medidas, com dois
// tetos diferentes, e chamá-las de "bruto 12" e "escore 4" deixaria o
// profissional adivinhando qual é qual.
//
// O mapa é FECHADO de propósito, como INSTRUCAO_DOS_ITENS e
// GATE_POR_INSTRUMENTO: só o código listado recebe nome próprio, e todo
// instrumento fora dele continua exatamente como estava.

/** Os tetos das duas métricas de UMA escala. */
export type TetosDaEscala = { raw: number; score: number };

/** Uma métrica DERIVADA na apresentação, a partir do `raw` que o servidor
 *  devolveu. Hoje só a Média por item do SNAP-IV-18.
 *
 *  Ela não vem da Edge, não está em `assessment_results`, não é norma, não
 *  é escala e não participa da classificação — é a MESMA intensidade que
 *  já está em `raw`, lida noutra régua. Por isso mora aqui e não num campo
 *  do resultado: derivar é apresentação, e apresentação não se persiste. */
export type MediaDerivada = {
  /** o nome dela na tela */
  rotulo: string;
  /** por quanto o `raw` é dividido. No SNAP-IV-18, os 9 itens do domínio */
  divisor: number;
  /** o teto da régua da média: 3, porque cada item vale no máximo 3 */
  teto: number;
  /** casas decimais na apresentação */
  casas: number;
};

export type MetricasDoInstrumento = {
  /** o nome de `raw` na tela */
  rotuloRaw: string;
  /** o nome de `score` na tela */
  rotuloScore: string;
  /** a métrica derivada, quando o instrumento tem uma. Ausente nos demais,
   *  e é essa ausência que mantém a tela deles idêntica. */
  media?: MediaDerivada;
  /** teto de cada métrica, por código de escala. Espelha data/snap_iv.json
   *  no CorrigeFacil, e é conferido nos testes. */
  tetos: Readonly<Record<string, TetosDaEscala>>;
  /** a nota de método, mostrada UMA vez abaixo dos resultados */
  metodo: { titulo: string; texto: string };
  /** Uma frase para o gerador do Relatório Pró, dizendo QUAL das duas
   *  medidas interpreta o limiar.
   *
   *  É orientação SEMÂNTICA, não autorização: as travas de dado fechado
   *  continuam inteiras — o modelo não recalcula, não escolhe corte, não
   *  reclassifica e preserva a classificação persistida. O que a frase
   *  evita é a narrativa cruzar as duas réguas, do tipo "pontuação 12,
   *  acima do corte 6". */
  orientacaoParaIA: string;
};

export const METRICAS_POR_INSTRUMENTO: Readonly<
  Record<string, MetricasDoInstrumento>
> = {
  'SNAP-IV-18': {
    rotuloRaw: 'Pontuação bruta',
    rotuloScore: 'Sintomas presentes',
    // Média por item: a MESMA intensidade de `raw`, na régua de 0 a 3 por
    // item. As duas escalas têm 9 itens, então o divisor é um só.
    media: { rotulo: 'Média por item', divisor: 9, teto: 3, casas: 2 },
    // 9 e 9 itens. Bruto = itens × 3; sintomas = um por item.
    tetos: {
      DESATENCAO: { raw: 27, score: 9 },
      HIPERATIVIDADE: { raw: 27, score: 9 },
    },
    metodo: {
      titulo: 'Método de correção',
      texto:
        'Versão brasileira do MTA-SNAP-IV: Mattos et al. (2006).\n\n' +
        'Nesta aplicação são apresentados separadamente:\n\n' +
        '• Pontuação bruta: soma das respostas de 0 a 3.\n' +
        '• Média por item: Pontuação bruta dividida pelos 9 itens do ' +
        'domínio.\n' +
        '• Sintomas presentes: contagem dos itens marcados como ' +
        '“Bastante” ou “Demais”.\n\n' +
        'A interpretação do limiar utiliza a contagem de sintomas. A ' +
        'Média por item é uma forma de apresentar a intensidade e não ' +
        'participa da classificação.',
    },
    orientacaoParaIA:
      'A interpretação do limiar utiliza a contagem de Sintomas ' +
      'presentes, não a Pontuação bruta nem a Média por item. A Média ' +
      'por item é uma apresentação derivada da Pontuação bruta e não ' +
      'participa da classificação.',
  },

  'SNAP-IV-26': {
    rotuloRaw: 'Pontuação bruta',
    rotuloScore: 'Sintomas presentes',
    // 9, 9 e 8 itens. Bruto = itens × 3; sintomas = um por item.
    tetos: {
      DESATENCAO: { raw: 27, score: 9 },
      HIPERATIVIDADE: { raw: 27, score: 9 },
      TOD: { raw: 24, score: 8 },
    },
    metodo: {
      titulo: 'Método de correção',
      texto:
        'Versão brasileira do MTA-SNAP-IV: Mattos et al. (2006).\n\n' +
        'Nesta aplicação são apresentados separadamente:\n\n' +
        '• Pontuação bruta: soma das respostas de 0 a 3.\n' +
        '• Sintomas presentes: contagem dos itens marcados como ' +
        '“Bastante” ou “Demais”.\n\n' +
        'A interpretação do limiar utiliza a contagem de sintomas. ' +
        'Outros métodos de pontuação do SNAP-IV, como média por dimensão, ' +
        'também são descritos na literatura.',
    },
    orientacaoParaIA:
      'A interpretação do limiar utiliza a contagem de Sintomas ' +
      'presentes, não a Pontuação bruta.',
  },
};

// ---------------------------------------------------------------------
// PERCENTIL ABAIXO DO PRIMEIRO PONTO DA TABELA
// ---------------------------------------------------------------------

/** Instrumento em que percentil ausente na PRIMEIRA faixa não é ausência
 *  de norma: é um percentil abaixo do primeiro ponto tabelado.
 *
 *  O BPA-2 é o caso. A tabela normativa começa no percentil 1, e o bruto
 *  que fica abaixo dele sai da Edge com `percentile: null` e a
 *  classificação da primeira faixa — `available` continua true, porque o
 *  resultado EXISTE e é interpretável. Mostrar campo vazio ali esconde a
 *  informação que o profissional precisa ler: o desempenho está abaixo do
 *  primeiro percentil da amostra.
 *
 *  O que este mapa NÃO é: uma imputação de valor. Nada vira 0, 1 nem 0,5,
 *  nada é gravado, nada é recalculado. É só como o `null` que o servidor
 *  já gravou se ESCREVE na tela — e é por isso que mora neste módulo, com
 *  o resto da apresentação, e não num campo do resultado.
 *
 *  O mapa é FECHADO, como METRICAS_POR_INSTRUMENTO: instrumento fora dele
 *  continua exatamente como estava, com percentil ausente sem texto. */
export type PercentilAbaixoDoPrimeiro = {
  /** a classificação que CONFIRMA que é o piso da tabela, e não outra
   *  coisa. Sem ela, qualquer percentil nulo viraria "< 1" */
  classificacao: string;
  /** o texto que aparece no lugar do número */
  texto: string;
};

export const PERCENTIL_ABAIXO_DO_PRIMEIRO: Readonly<
  Record<string, PercentilAbaixoDoPrimeiro>
> = {
  // A tabela do BPA-2 começa no percentil 1; abaixo dele a fonte diz
  // apenas "< 1", e a classificação que acompanha é sempre a primeira.
  'BPA-2': { classificacao: 'Muito inferior', texto: '< 1' },
};

/** O que UM resultado precisa ter para o percentil ser escrito. É o
 *  subconjunto que tela, histórico, documento e Relatório Pró têm em
 *  comum — nenhum dos quatro passa o objeto inteiro. */
export type ResultadoParaPercentil = {
  available: boolean;
  percentile: number | string | null;
  classification: string | null;
};

/** O percentil COMO TEXTO, ou null quando não há percentil a escrever.
 *
 *  Esta é a ÚNICA regra de apresentação de percentil do produto. Tela do
 *  resultado, histórico, documento profissional/PDF e o dado fechado que
 *  vai ao Relatório Pró consomem daqui; um `if` repetido em quatro
 *  componentes garantiria que um deles envelhecesse sozinho.
 *
 *  O GRÁFICO NÃO consome: ele plota `percentile`, e "< 1" não tem posição
 *  no eixo. Ponto sem barra continua sendo a leitura correta ali, e é de
 *  propósito que este módulo não devolve número nenhum para ele. */
export function textoDePercentil(
  code: string | undefined,
  r: ResultadoParaPercentil,
): string | null {
  // resultado indisponível não tem quantitativo nenhum, nem o número que
  // por acaso tenha vindo junto. Mesma regra do gráfico e do documento.
  if (!r.available) return null;
  if (r.percentile !== null) {
    const texto = String(r.percentile).trim();
    if (texto) return texto;
  }
  const regra = code ? PERCENTIL_ABAIXO_DO_PRIMEIRO[code] : undefined;
  if (!regra) return null;
  return r.classification?.trim() === regra.classificacao ? regra.texto : null;
}

export function metricasDoInstrumento(
  code: string | undefined,
): MetricasDoInstrumento | null {
  if (!code) return null;
  return METRICAS_POR_INSTRUMENTO[code] ?? null;
}

/** A nota de método deste instrumento, ou null. Null é o caso dos 20. */
export function metodoDeCorrecao(
  code: string | undefined,
): { titulo: string; texto: string } | null {
  return metricasDoInstrumento(code)?.metodo ?? null;
}

/** Um número com o teto dele, quando o teto é conhecido: "12 / 27". */
function comTeto(valor: number, teto: number | undefined): string {
  return teto === undefined ? String(valor) : `${valor} / ${teto}`;
}

/** A Média por item, como TEXTO: "1,67 / 3".
 *
 *  Duas casas e vírgula decimal, que é como se escreve número em português.
 *  O arredondamento é só de APRESENTAÇÃO e não volta para conta nenhuma —
 *  quem quiser o valor exato tem `raw` ao lado, e é dele que tudo deriva.
 *
 *  Esta é a ÚNICA divisão por `divisor` do produto. Tela, histórico,
 *  documento, PDF e prompt do Relatório Pró consomem daqui; espalhar
 *  `raw / 9` pelos componentes garantiria que um deles envelhecesse
 *  sozinho. */
export function formatarMedia(raw: number, media: MediaDerivada): string {
  const valor = (raw / media.divisor).toFixed(media.casas).replace('.', ',');
  return `${valor} / ${media.teto}`;
}

export type MetricaNaTela = { rotulo: string; texto: string };

/** Como as métricas de UMA escala aparecem.
 *
 *  Sem instrumento no mapa, devolve exatamente o que a tela mostrava antes:
 *  "bruto 12" e "escore 4", sem teto e sem média. Com instrumento no mapa,
 *  os nomes próprios e o teto de cada régua — que são diferentes, e é
 *  justamente por isso que os números precisam aparecer separados.
 *
 *  `media` só existe onde o instrumento a declara, e deriva EXCLUSIVAMENTE
 *  de `raw`. Sem `raw` não há média: ela não se reconstrói a partir de
 *  `score`, que é outra medida — quatro sintomas presentes não dizem nada
 *  sobre a intensidade com que apareceram. */
export function metricasDaEscala(
  code: string | undefined,
  escala: string,
  raw: number | null,
  score: number | null,
): {
  bruto: MetricaNaTela | null;
  media: MetricaNaTela | null;
  escore: MetricaNaTela | null;
} {
  const m = metricasDoInstrumento(code);
  const teto = m?.tetos[escala];
  return {
    bruto:
      raw === null
        ? null
        : {
            rotulo: m ? m.rotuloRaw : 'bruto',
            texto: m ? comTeto(raw, teto?.raw) : String(raw),
          },
    media:
      m?.media && raw !== null
        ? { rotulo: m.media.rotulo, texto: formatarMedia(raw, m.media) }
        : null,
    escore:
      score === null
        ? null
        : {
            rotulo: m ? m.rotuloScore : 'escore',
            texto: m ? comTeto(score, teto?.score) : String(score),
          },
  };
}

/** Os CABEÇALHOS das duas colunas numéricas, para a tabela do documento
 *  profissional e para os rótulos do prompt do Relatório Pró.
 *
 *  Maiúscula inicial porque é cabeçalho de tabela; o resto vem do mesmo
 *  lugar que a tela usa, e é por isso que documento, PDF, histórico e
 *  prompt nunca vão divergir. */
export function rotulosDasColunas(code: string | undefined): {
  bruto: string;
  media: string | null;
  escore: string;
} {
  const m = metricasDoInstrumento(code);
  return {
    bruto: m ? m.rotuloRaw : 'Bruto',
    // null onde não há média declarada: a coluna não existe, e não é uma
    // coluna vazia. Cabeçalho sem dado embaixo sugere que algo se perdeu.
    media: m?.media?.rotulo ?? null,
    escore: m ? m.rotuloScore : 'Escore',
  };
}

/** A frase de orientação semântica para o Relatório Pró, ou null.
 *
 *  Null nos 20 — e é por isso que o system prompt geral não muda. */
export function orientacaoParaIA(code: string | undefined): string | null {
  return metricasDoInstrumento(code)?.orientacaoParaIA ?? null;
}

/** O nome de `score` na LEGENDA do gráfico.
 *
 *  O gráfico do SNAP-IV-26 já plota a contagem e continua plotando: o que
 *  muda é só a palavra. "escore 4" ao lado de um card que mostra "Pontuação
 *  bruta 12" convida a ler o 4 como se fosse a mesma régua do 12. */
export function rotuloDeEscoreNoGrafico(
  code: string | undefined,
  padrao: string,
): string {
  const m = metricasDoInstrumento(code);
  return m ? m.rotuloScore.toLowerCase() : padrao;
}
