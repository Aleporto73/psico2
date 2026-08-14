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

export type MetricasDoInstrumento = {
  /** o nome de `raw` na tela */
  rotuloRaw: string;
  /** o nome de `score` na tela */
  rotuloScore: string;
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

export type MetricaNaTela = { rotulo: string; texto: string };

/** Como as duas métricas de UMA escala aparecem.
 *
 *  Sem instrumento no mapa, devolve exatamente o que a tela mostrava antes:
 *  "bruto 12" e "escore 4", sem teto. Com instrumento no mapa, os nomes
 *  próprios e o teto de cada régua — que são diferentes, e é justamente por
 *  isso que os dois números precisam aparecer. */
export function metricasDaEscala(
  code: string | undefined,
  escala: string,
  raw: number | null,
  score: number | null,
): { bruto: MetricaNaTela | null; escore: MetricaNaTela | null } {
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
  escore: string;
} {
  const m = metricasDoInstrumento(code);
  return {
    bruto: m ? m.rotuloRaw : 'Bruto',
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
