// =====================================================================
// REGISTRO VISUAL DOS 21 · a tradução de G0 para configuração
//
// Este arquivo é a única fonte que diz QUAL gráfico cada instrumento
// recebe, QUAL métrica ele plota e QUAIS escalas entram. Nada aqui é
// psicometria: são as decisões já fechadas em
// docs/corrigefacil/GRAPH_VISUAL_CONTRACT_G0_2026-08.md, escritas numa
// forma que o renderizador consegue ler.
//
// DUAS REGRAS QUE ATRAVESSAM O ARQUIVO INTEIRO
//
// 1. Escala excluída é decisão, não esquecimento. Cada `excluidas` diz
//    por que — composta que duplicaria os componentes, escala de
//    validade que não é traço, subteste em outra métrica. Tirar uma
//    exclusão daqui muda o significado do gráfico.
//
// 2. `range` é CONVENÇÃO VISUAL, e só existe onde G0/G1A o declararam ou
//    onde ele é matemático (percentil 0..100). Onde não existe, o campo
//    fica AUSENTE e o gráfico quantitativo não é desenhado — inventar um
//    eixo a partir de bruto_min/bruto_max ou dos extremos das faixas
//    produz eixo errado em métrica transformada (G1A §5.2: um resultado
//    122 num eixo 1..4 no TRILHAS). O resultado textual continua inteiro
//    nesses casos.
// =====================================================================

/** As quatro famílias aprovadas em G0. */
export type Familia =
  | 'score_band'
  | 'standardized_profile'
  | 'domain_profile'
  | 'categorical_profile';

/** O CAMPO de ResultadoEscala que o gráfico lê. Não é vocabulário do
 *  acervo: `percentile` é o nome do campo, `percentil` é o nome da basis
 *  em faixas_classificacao. A ponte entre os dois é `basisDaMetrica`. */
export type Metrica = 'score' | 'percentile' | 'z' | 'classification';

/** Metadado técnico interno. G0 §2.4: NENHUM destes valores vai à tela —
 *  eles orientam eixo e ordem de leitura, não viram rótulo. */
export type Direcao =
  | 'ascendente_favoravel'
  | 'ascendente_sinalizador'
  | 'especifica_por_escala'
  | 'nao_avaliativa';

/** G0 §2.1. `semantico_por_faixa` NÃO autoriza cor por magnitude: a
 *  semântica só pode vir da faixa que o servidor devolveu. */
export type TomVisual = 'neutro' | 'semantico_por_faixa';

/** Domínio do eixo. `overflow` marca métrica sem intervalo fechado (z):
 *  valor fora do domínio aparece como excedente, nunca truncado calado. */
export type DisplayRange = { min: number; max: number; overflow?: boolean };

/** Um bloco de escalas comparáveis entre si. O C-TRF tem DOIS porque as
 *  réguas são diferentes (65/70 nas síndromes, 60/64 nas bandas largas):
 *  uma linha de corte única classificaria errado metade das escalas. */
export type Bloco = {
  titulo?: string;
  /** Lista explícita, quando os códigos são curtos e estáveis. */
  escalas?: string[];
  /** Alternativa a `escalas`, para instrumentos cujos códigos de escala
   *  são nomes longos e acentuados (os fatores de ERA-A/ERA-F): entram
   *  as escalas do catálogo cujo `kind` está nesta lista.
   *
   *  É FAIL-CLOSED de propósito. A versão anterior dizia "todas menos o
   *  Escore Geral", e com ela uma escala nova no catálogo entraria
   *  sozinha no gráfico, sem passar por G0. Selecionando por `kind`, só
   *  entra o que pertence ao tipo aprovado: uma escala futura de
   *  qualquer outro tipo fica de fora até alguém decidir o contrário. */
  apenasKind?: string[];
  /** Só nas famílias em que cada escala tem régua própria (small
   *  multiples). Ausente = o bloco inteiro compartilha `range`. */
  rangePorEscala?: Record<string, DisplayRange>;
};

export type ConfigGrafico = {
  familia: Familia;
  metrica: Metrica;
  blocos: Bloco[];
  direcao: Direcao;
  tom: TomVisual;
  /** Ausente = G0/G1A não declararam domínio visual para esta métrica.
   *  Ver o cabeçalho: nesse caso não se desenha eixo quantitativo. */
  range?: DisplayRange;
  /** Escalas fora do gráfico, com o motivo. Documental e testável. */
  excluidas?: { escala: string; motivo: string }[];
  /** Observação que o renderizador mostra como nota de leitura. */
  nota?: string;
};

export type EntradaRegistro =
  | {
      status: 'aprovado';
      config: ConfigGrafico;
      /** Gráficos ADICIONAIS aprovados para o mesmo instrumento. Existe
       *  porque G0 aprovou, para o SCARED-C, "CategoricalProfileChart +
       *  band para o TOTAL": são duas representações distintas, não uma
       *  com escala a mais. Pôr o TOTAL em `excluidas` perderia uma
       *  visualização que o contrato aprovou. */
      complementos?: ConfigGrafico[];
    }
  | { status: 'pendente'; motivo: string };

/** Domínio matemático do percentil: não depende de norma nenhuma. */
const PERCENTIL: DisplayRange = { min: 0, max: 100 };

/** G0 §CONFIAS: z não tem intervalo fechado. O eixo precisa de domínio
 *  declarado E de comportamento de excedente — cortar em silêncio
 *  esconderia justamente o caso extremo. */
const Z: DisplayRange = { min: -3, max: 3, overflow: true };

export const REGISTRO_GRAFICOS: Record<string, EntradaRegistro> = {
  // -------------------------------------------------------------------
  // SCORE BAND · escala única, régua de faixas sobre o eixo do escore
  // -------------------------------------------------------------------

  'CES-D': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: { min: 0, max: 60 },
    },
  },

  'CHECK-DIS': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      // INVERTIDO em relação aos instrumentos de risco usuais: as faixas
      // falam de risco ("Risco Alto" 39-78) mas o escore MAIOR é o
      // MELHOR resultado. É o caso que prova por que cor não pode sair da
      // magnitude — uma regra por altura pintaria o melhor como o pior.
      direcao: 'ascendente_favoravel',
      tom: 'semantico_por_faixa',
      // o piso é 39 (39 itens valendo 1 no mínimo), não 0
      range: { min: 39, max: 195 },
      nota: 'Nesta escala, escore mais alto indica MENOR risco.',
    },
  },

  'PHQ-9': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: { min: 0, max: 27 },
    },
  },

  'QA-ADULTO': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: { min: 0, max: 50 },
    },
  },

  'SDQ-POR': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      // TOTAL é ascendente_sinalizador, mas PRO tem direção OPOSTA — daí
      // `especifica_por_escala` no instrumento. É por isso que PRO não
      // pode receber a cor nem a direção do TOTAL.
      direcao: 'especifica_por_escala',
      tom: 'semantico_por_faixa',
      range: { min: 0, max: 40 },
      excluidas: [
        { escala: 'EMO', motivo: 'subescala sem faixa publicada' },
        { escala: 'CON', motivo: 'subescala sem faixa publicada' },
        { escala: 'HIP', motivo: 'subescala sem faixa publicada' },
        { escala: 'PAR', motivo: 'subescala sem faixa publicada' },
        {
          escala: 'PRO',
          motivo:
            'direção OPOSTA (competência preservada, não dificuldade) e ' +
            'única das cinco que não entra no TOTAL',
        },
      ],
    },
  },

  TDF: {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_favoravel',
      tom: 'neutro',
      // range AUSENTE de propósito: a métrica é pontuação padrão e nem G0
      // nem G1A declararam domínio visual para ela. G1A §5.2 mediu bruto
      // 0..23 contra métrica plotada 0..229 e extremos de faixa até 349
      // (sentinela técnica) — as três fontes divergem, e nenhuma serve.
    },
  },

  'TRACO-ANSIEDADE': {
    status: 'aprovado',
    config: {
      familia: 'score_band',
      metrica: 'score',
      blocos: [{ escalas: ['TOTAL'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: { min: 0, max: 102 },
    },
  },

  // -------------------------------------------------------------------
  // STANDARDIZED PROFILE · escalas comparáveis na MESMA métrica
  // -------------------------------------------------------------------

  'BPA-2': {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'percentile',
      blocos: [{ escalas: ['AA', 'AC', 'AD'] }],
      direcao: 'ascendente_favoravel',
      tom: 'neutro',
      range: PERCENTIL,
      excluidas: [
        {
          escala: 'AG',
          motivo:
            'composta das outras três: barra ao lado dos componentes ' +
            'sugeriria uma quarta dimensão independente',
        },
      ],
      nota:
        'Percentil pode não existir abaixo do primeiro corte. Escala sem ' +
        'percentil não recebe barra — ausência não é zero.',
    },
  },

  'C-TRF_1.5-5': {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'score',
      // DOIS blocos, obrigatoriamente: as síndromes cortam em 65/70 e as
      // bandas largas em 60/64. Um eixo único com uma régua só
      // classificaria errado metade das nove escalas.
      blocos: [
        { titulo: 'Síndromes', escalas: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        { titulo: 'Bandas largas', escalas: ['INT', 'EXT', 'TOT'] },
      ],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      // range AUSENTE: a métrica é escore T e G0 não declarou domínio
      // visual para ela. G1A §5.2 mediu 50..100 na escala I, mas isso é
      // observação do acervo, não convenção declarada — e as faixas
      // cobrem só a região clínica (65+), então usá-las como eixo faria
      // um resultado 50 cair fora do gráfico.
    },
  },

  CONFIAS: {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'z',
      blocos: [{ escalas: ['Sílaba', 'Fonema'] }],
      direcao: 'ascendente_favoravel',
      tom: 'neutro',
      range: Z,
      excluidas: [
        {
          escala: 'Total',
          motivo: 'composta das duas: entraria como dupla contagem visual',
        },
      ],
      nota:
        'As faixas de percentual de acerto são de tarefa e não entram ' +
        'neste gráfico.',
    },
  },

  'EPQ-J': {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'percentile',
      blocos: [{ escalas: ['P', 'E', 'N'] }],
      // traço de personalidade não tem polo bom: percentil tem ordem, mas
      // não há gravidade a representar
      direcao: 'nao_avaliativa',
      tom: 'neutro',
      range: PERCENTIL,
      excluidas: [
        {
          escala: 'S',
          motivo:
            'escala de VALIDADE do protocolo, não traço: ao lado de P/E/N ' +
            'viraria uma quarta dimensão clínica falsa',
        },
      ],
    },
  },

  'ERA-A': {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'percentile',
      blocos: [{ apenasKind: ['primaria'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: PERCENTIL,
      excluidas: [
        { escala: 'Escore Geral', motivo: 'composta dos quatro fatores' },
      ],
      nota:
        'Os fatores de ERA-A e ERA-F são homônimos mas normativamente ' +
        'distintos: nunca comparar um com o outro.',
    },
  },

  'ERA-F': {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'percentile',
      blocos: [{ apenasKind: ['primaria'] }],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      range: PERCENTIL,
      excluidas: [
        { escala: 'Escore Geral', motivo: 'composta dos quatro fatores' },
      ],
      nota:
        'Os fatores de ERA-A e ERA-F são homônimos mas normativamente ' +
        'distintos: nunca comparar um com o outro.',
    },
  },

  TRILHAS_PRE: {
    status: 'aprovado',
    config: {
      familia: 'standardized_profile',
      metrica: 'score',
      blocos: [{ escalas: ['A-SEQ', 'A-CON', 'B-SEQ', 'B-CON'] }],
      direcao: 'ascendente_favoravel',
      tom: 'neutro',
      // range AUSENTE: pontuação padrão sem domínio declarado. É o caso
      // mais ilustrativo de G1A §5.2 — os brutos vão de 1..4 a 1..10 e a
      // métrica plotada vai a 122; plotar o bruto seria absurdo, e os
      // extremos de faixa trazem a sentinela 999.
    },
  },

  // -------------------------------------------------------------------
  // DOMAIN PROFILE · os cinco domínios do Bayley, na métrica composta
  // -------------------------------------------------------------------

  'BAYLEY-III': {
    status: 'aprovado',
    config: {
      familia: 'domain_profile',
      metrica: 'score',
      blocos: [
        {
          escalas: [
            'DOM_Cognitivo',
            'DOM_Linguagem',
            'DOM_Motora',
            'DOM_Socioemocional',
            'DOM_Adaptativo',
          ],
        },
      ],
      direcao: 'ascendente_favoravel',
      // as 7 faixas têm ordem, mas "Média" não é "bom" e "Abaixo da
      // média" não é "ruim": é posição na amostra normativa
      tom: 'neutro',
      range: { min: 40, max: 160 },
      excluidas: [
        {
          escala: '(16 subtestes)',
          motivo:
            'saem em escalonada 1..19, outra métrica: no mesmo eixo da ' +
            'composta 40..160 seria erro de categoria',
        },
      ],
      nota:
        'IC95 aparece só onde o servidor o enviou. O domínio Adaptativo ' +
        'não tem IC95 publicado, e a ausência não é estimada.',
    },
  },

  // -------------------------------------------------------------------
  // CATEGORICAL PROFILE · escalas que NÃO são comparáveis entre si
  // -------------------------------------------------------------------

  'DASS-21': {
    status: 'aprovado',
    config: {
      familia: 'categorical_profile',
      metrica: 'score',
      blocos: [
        {
          escalas: ['DEPRESSAO', 'ANSIEDADE', 'ESTRESSE'],
          // mesmo intervalo, CORTES diferentes: um escore 20 é "Moderado"
          // em Depressão e "Extremamente severo" em Ansiedade. Barras de
          // mesma altura lado a lado diriam "igual" onde a leitura
          // clínica é oposta — por isso cada uma tem régua própria.
          rangePorEscala: {
            DEPRESSAO: { min: 0, max: 42 },
            ANSIEDADE: { min: 0, max: 42 },
            ESTRESSE: { min: 0, max: 42 },
          },
        },
      ],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      nota: 'Cada domínio tem cortes próprios e é lido na régua dele.',
    },
  },

  ETPC: {
    status: 'aprovado',
    config: {
      familia: 'categorical_profile',
      // usa a CLASSIFICAÇÃO, não o número: 25/50/75 são marcadores de
      // quartil, e altura proporcional diria "três vezes mais" entre duas
      // categorias ordinais vizinhas
      metrica: 'classification',
      blocos: [
        {
          escalas: [
            'Psicoticismo',
            'Extroversão',
            'Neuroticismo',
            'Sociabilidade',
          ],
        },
      ],
      // personalidade não tem polo bom nem ruim
      direcao: 'nao_avaliativa',
      tom: 'neutro',
    },
  },

  'SCARED-C': {
    status: 'aprovado',
    config: {
      familia: 'categorical_profile',
      metrica: 'score',
      blocos: [
        {
          escalas: ['PANICO', 'GENERALIZADA', 'SEPARACAO', 'SOCIAL', 'ESCOLAR'],
          // tetos declarados em G0: 26, 18, 16, 14, 8. Um 8 é o teto de
          // ESCOLAR e menos de um terço de PANICO.
          rangePorEscala: {
            PANICO: { min: 0, max: 26 },
            GENERALIZADA: { min: 0, max: 18 },
            SEPARACAO: { min: 0, max: 16 },
            SOCIAL: { min: 0, max: 14 },
            ESCOLAR: { min: 0, max: 8 },
          },
        },
      ],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
    },
    // G0: "CategoricalProfileChart (small multiples) + ScoreBandChart
    // para o TOTAL". O TOTAL é uma representação APROVADA e por isso
    // está no registro — o que falta é só o domínio visual dele, que nem
    // G0 nem G1A declararam. Somar os tetos das subescalas (26+18+16+14+8)
    // seria inferência nossa, e G1A §5.2 é explícito em que extremos
    // observados não viram convenção de eixo. Sem `range`, o modelo
    // bloqueia o desenho e diz por quê; o resultado textual do TOTAL
    // continua inteiro na tabela.
    complementos: [
      {
        familia: 'score_band',
        metrica: 'score',
        blocos: [{ titulo: 'Total', escalas: ['TOTAL'] }],
        direcao: 'ascendente_sinalizador',
        tom: 'semantico_por_faixa',
      },
    ],
  },

  'SNAP-IV-18': {
    status: 'aprovado',
    config: {
      familia: 'categorical_profile',
      metrica: 'score',
      blocos: [
        {
          escalas: ['DESATENCAO', 'HIPERATIVIDADE'],
          rangePorEscala: {
            DESATENCAO: { min: 0, max: 9 },
            HIPERATIVIDADE: { min: 0, max: 9 },
          },
        },
      ],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      nota:
        'O escore é CONTAGEM de sintomas, não soma de intensidade, e cada ' +
        'escala tem critério próprio.',
    },
  },

  'SNAP-IV-26': {
    status: 'aprovado',
    config: {
      familia: 'categorical_profile',
      metrica: 'score',
      blocos: [
        {
          escalas: ['DESATENCAO', 'HIPERATIVIDADE', 'TOD'],
          rangePorEscala: {
            DESATENCAO: { min: 0, max: 9 },
            HIPERATIVIDADE: { min: 0, max: 9 },
            // teto 8 e corte próprio: contagem 4 aqui ATINGE o critério e
            // em DESATENCAO (teto 9, corte 6) não atinge. Mesma altura de
            // barra, decisões opostas — daí régua separada.
            TOD: { min: 0, max: 8 },
          },
        },
      ],
      direcao: 'ascendente_sinalizador',
      tom: 'semantico_por_faixa',
      nota:
        'O escore é CONTAGEM de sintomas, não soma de intensidade, e cada ' +
        'escala tem critério próprio.',
    },
  },

  // -------------------------------------------------------------------
  // PENDENTE
  // -------------------------------------------------------------------

  DCDQ: {
    status: 'pendente',
    // O corte muda com a faixa etária, mora em norm_entries e NÃO chega
    // ao cliente: o browser recebe o valor e o rótulo, sem a linha.
    // Desenhar a banda exigiria o frontend adivinhar o corte da idade
    // aplicada — que é exatamente o que o princípio central proíbe.
    motivo:
      'o corte aplicado depende da faixa etária e não é enviado ao ' +
      'cliente; desenhar a régua exigiria inferir o corte',
  },
};

/** Os 21 do catálogo comercial. Existe para o teste provar cobertura
 *  exata — nem a mais, nem a menos. */
export const CODIGOS_DOS_21 = Object.keys(REGISTRO_GRAFICOS);

export function configDoInstrumento(code: string): EntradaRegistro | null {
  return REGISTRO_GRAFICOS[code] ?? null;
}

/** Métrica (nome do campo de ResultadoEscala) -> basis do acervo, que é
 *  como `faixas_classificacao` nomeia a mesma coisa. A tradução é de
 *  vocabulário e mora aqui, num lugar só. */
export function basisDaMetrica(m: Metrica): string | null {
  if (m === 'score') return 'score';
  if (m === 'percentile') return 'percentil';
  if (m === 'z') return 'z';
  return null; // classification não se lê numa régua numérica
}
