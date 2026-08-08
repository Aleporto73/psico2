// =====================================================================
// MODELO DE EXIBIÇÃO · transforma o que o servidor já mandou em algo
// desenhável, e nada além disso.
//
// O QUE ESTE ARQUIVO NÃO FAZ, e é o ponto dele: não pontua, não
// classifica, não escolhe corte, não escolhe norma, não calcula idade,
// não converte bruto em escore. Toda decisão psicométrica já foi tomada
// no servidor e chega pronta em `ResultadoEscala`. Aqui só se decide
// ONDE desenhar o que já veio decidido.
//
// A regra que mais importa: null NUNCA vira zero. Um percentil ausente
// não é "percentil 0" — é ausência, e ausência não recebe barra. Zero
// desenhado é uma afirmação que ninguém fez.
// =====================================================================

import type {
  EscalaInstrumento,
  FaixaClassificacao,
  ResultadoEscala,
} from '@/lib/corrigefacil/api';
import {
  basisDaMetrica,
  type Bloco,
  type ConfigGrafico,
  type DisplayRange,
  type Metrica,
} from './graph-config';

/** Um segmento da régua, como veio de `faixas_classificacao`. `de`/`ate`
 *  nulos são faixa ABERTA — fato do acervo, não erro. */
export type Segmento = {
  de: number | null;
  ate: number | null;
  rotulo: string;
  /** true quando a classificação que o servidor devolveu é ESTA faixa.
   *  Sai da comparação de rótulo, nunca de recalcular em que faixa o
   *  valor cairia. */
  atual: boolean;
};

export type PontoEscala = {
  escala: string;
  nome: string;
  /** O valor da métrica, ou null. Null = sem ponto quantitativo. */
  valor: number | null;
  classificacao: string | null;
  ci95: string | null;
  disponivel: boolean;
  /** Mensagem do servidor quando indisponível. É ela que aparece. */
  mensagem: string | null;
  ambiguo: boolean;
  segmentos: Segmento[];
  /** Régua própria desta escala (small multiples). */
  range?: DisplayRange;
  /** Valor fora do domínio declarado — só onde `overflow` é permitido. */
  excedente: 'abaixo' | 'acima' | null;
};

export type BlocoModelo = {
  titulo?: string;
  pontos: PontoEscala[];
  range?: DisplayRange;
};

export type ModeloGrafico = {
  familia: ConfigGrafico['familia'];
  metrica: Metrica;
  blocos: BlocoModelo[];
  nota?: string;
  /** Motivo pelo qual não há gráfico quantitativo. Renderizado como
   *  texto; nunca vira gráfico "aproximado". */
  bloqueio?: string;
};

export const AVISO_AMBIGUO =
  'O escore bruto correspondeu a mais de uma linha normativa; foi ' +
  'adotado o menor escore.';

/** O campo de ResultadoEscala que esta métrica lê. Não há aritmética
 *  aqui de propósito: é leitura de campo. */
export function valorDaMetrica(
  r: ResultadoEscala,
  m: Metrica,
): number | null {
  if (m === 'score') return r.score;
  if (m === 'percentile') return r.percentile;
  if (m === 'z') return r.z;
  return null; // classification não é número
}

/** As faixas DAQUELA escala, na basis DAQUELA métrica.
 *
 *  Precedência: faixa presa à escala manda; só quando a escala não tem
 *  nenhuma é que valem as globais. As duas nunca se misturam — é o que
 *  impede o C-TRF de mostrar as 27 do instrumento numa escala que tem 3.
 *
 *  O filtro por basis é também o que mantém as faixas de
 *  `percentual_acerto` do CONFIAS fora de um gráfico de z. */
export function faixasDaEscala(
  faixas: FaixaClassificacao[],
  escala: string,
  metrica: Metrica,
): FaixaClassificacao[] {
  const basis = basisDaMetrica(metrica);
  if (basis === null) return [];
  const naBasis = faixas.filter((f) => f.basis === basis);
  const proprias = naBasis.filter((f) => f.scale === escala);
  return proprias.length > 0 ? proprias : naBasis.filter((f) => f.scale === null);
}

/** Ordena as faixas pelo início, deixando a aberta-para-baixo primeiro.
 *  `faixas_classificacao` não traz ordinal, então a ordem sai do próprio
 *  limite — que é dado, não interpretação. */
function ordenar(fs: FaixaClassificacao[]): FaixaClassificacao[] {
  return [...fs].sort((a, b) => {
    if (a.min === null) return -1;
    if (b.min === null) return 1;
    return a.min - b.min;
  });
}

function montarSegmentos(
  fs: FaixaClassificacao[],
  classificacao: string | null,
): Segmento[] {
  return ordenar(fs).map((f) => ({
    de: f.min,
    ate: f.max,
    rotulo: f.label,
    // casamento por RÓTULO: a faixa atual é a que o servidor nomeou. Se
    // comparássemos o valor contra os limites, estaríamos reclassificando
    // no cliente — e divergiríamos do texto no dia em que a regra de
    // borda (aberto/fechado) não fosse a que supusemos.
    atual: classificacao !== null && f.label === classificacao,
  }));
}

function excedenteDe(
  valor: number | null,
  range: DisplayRange | undefined,
): 'abaixo' | 'acima' | null {
  if (valor === null || !range) return null;
  if (valor < range.min) return 'abaixo';
  if (valor > range.max) return 'acima';
  return null;
}

/** Quais escalas entram neste bloco, respeitando a decisão do registro.
 *
 *  As duas formas são FAIL-CLOSED: ou a lista é explícita, ou o `kind`
 *  aprovado é explícito. Não existe caminho em que uma escala nova do
 *  catálogo entre num gráfico sozinha — se o bloco não declarar nada,
 *  não entra ninguém. */
function escalasDoBloco(
  bloco: Bloco,
  escalasCatalogo: EscalaInstrumento[],
): string[] {
  if (bloco.escalas) return bloco.escalas;
  if (bloco.apenasKind) {
    const aceitos = new Set(bloco.apenasKind);
    return escalasCatalogo.filter((e) => aceitos.has(e.kind)).map((e) => e.code);
  }
  return [];
}

/** Monta o modelo inteiro. Escala configurada que não veio no resultado
 *  é simplesmente omitida: o gráfico mostra o que existe, e não inventa
 *  linha para o que o servidor não calculou. */
export function montarModelo(
  config: ConfigGrafico,
  resultados: Record<string, ResultadoEscala>,
  faixas: FaixaClassificacao[],
  escalasCatalogo: EscalaInstrumento[],
): ModeloGrafico {
  const nomePorCode = new Map(escalasCatalogo.map((e) => [e.code, e.name]));

  const blocos: BlocoModelo[] = config.blocos.map((b) => {
    const codes = escalasDoBloco(b, escalasCatalogo);
    const pontos: PontoEscala[] = [];

    for (const code of codes) {
      const r = resultados[code];
      if (!r) continue;

      const rangeDaEscala = b.rangePorEscala?.[code] ?? config.range;
      // indisponível não tem valor quantitativo NENHUM: nem o número que
      // por acaso tenha vindo. O que aparece é a mensagem do servidor.
      const valor = r.available ? valorDaMetrica(r, config.metrica) : null;

      pontos.push({
        escala: code,
        nome: nomePorCode.get(code) ?? code,
        valor,
        classificacao: r.classification,
        ci95: r.ci95 ?? null,
        disponivel: r.available,
        mensagem: r.message,
        ambiguo: r.flags.includes('ambiguous'),
        segmentos: montarSegmentos(
          faixasDaEscala(faixas, code, config.metrica),
          r.classification,
        ),
        range: rangeDaEscala,
        excedente: excedenteDe(valor, rangeDaEscala),
      });
    }

    return { titulo: b.titulo, pontos, range: b.rangePorEscala ? undefined : config.range };
  });

  const modelo: ModeloGrafico = {
    familia: config.familia,
    metrica: config.metrica,
    blocos,
    nota: config.nota,
  };

  // Sem domínio visual declarado não se desenha eixo. A alternativa
  // seria derivá-lo de bruto_min/bruto_max ou dos extremos das faixas, e
  // as duas dão eixo errado em métrica transformada.
  const precisaDeEixo = config.metrica !== 'classification';
  const temEixo =
    config.range !== undefined ||
    config.blocos.every((b) => b.rangePorEscala !== undefined);
  if (precisaDeEixo && !temEixo) {
    modelo.bloqueio =
      'O domínio visual desta métrica não está definido no contrato ' +
      'aprovado, e derivá-lo dos dados produziria um eixo incorreto. O ' +
      'resultado permanece na tabela acima.';
  }

  return modelo;
}

/** Posição de um valor dentro do domínio, em 0..1. Só de desenho: é
 *  regra de três, não psicometria. Devolve null onde não há o que
 *  posicionar — e null nunca é 0. */
export function posicao(
  valor: number | null,
  range: DisplayRange | undefined,
): number | null {
  if (valor === null || !range) return null;
  const extensao = range.max - range.min;
  if (extensao <= 0) return null;
  const bruta = (valor - range.min) / extensao;
  return Math.min(1, Math.max(0, bruta));
}

/** Limites de um segmento em 0..1, com faixa aberta ancorada na borda do
 *  eixo. A abertura continua sendo dita em texto: ancorar é desenho, e
 *  não transforma `null` em número no modelo. */
export function faixaEmFracao(
  seg: Segmento,
  range: DisplayRange,
): { inicio: number; fim: number } | null {
  const extensao = range.max - range.min;
  if (extensao <= 0) return null;
  const de = seg.de ?? range.min;
  const ate = seg.ate ?? range.max;
  const inicio = Math.min(1, Math.max(0, (de - range.min) / extensao));
  const fim = Math.min(1, Math.max(0, (ate - range.min) / extensao));
  if (fim <= inicio) return null;
  return { inicio, fim };
}

/** Frase que descreve a faixa para quem lê por texto ou leitor de tela.
 *  Faixa aberta é dita como aberta, nunca com um número inventado. */
export function descreverSegmento(seg: Segmento): string {
  if (seg.de === null && seg.ate === null) return seg.rotulo;
  if (seg.de === null) return `${seg.rotulo}: até ${seg.ate}`;
  if (seg.ate === null) return `${seg.rotulo}: ${seg.de} ou mais`;
  return `${seg.rotulo}: ${seg.de} a ${seg.ate}`;
}

/** Equivalente textual de um ponto — o gráfico nunca é a única via para
 *  o valor, a escala ou a classificação. */
export function descreverPonto(p: PontoEscala, metrica: Metrica): string {
  if (!p.disponivel) return `${p.nome}: ${p.mensagem ?? 'resultado indisponível'}`;
  const partes: string[] = [p.nome];
  if (p.valor !== null) partes.push(`${rotuloDaMetrica(metrica)} ${p.valor}`);
  if (p.ci95) partes.push(`IC95 ${p.ci95}`);
  if (p.classificacao) partes.push(p.classificacao);
  return partes.join(', ');
}

export function rotuloDaMetrica(m: Metrica): string {
  if (m === 'score') return 'escore';
  if (m === 'percentile') return 'percentil';
  if (m === 'z') return 'z';
  return 'classificação';
}
