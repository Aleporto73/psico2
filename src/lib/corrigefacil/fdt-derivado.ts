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

/** O que se escreve onde o servidor não mandou valor.
 *
 *  É APRESENTAÇÃO, e só. Não vira 0, não vira "0,00", não vira "n/c": o
 *  dado continua null em `LinhaFdt`, e é o null que qualquer comparação
 *  enxerga. O travessão diz "não veio", que é diferente de "veio zero" —
 *  e no bloco de erros zero é resultado legítimo. */
export const SEM_VALOR = '—';

/** Os rótulos das quatro colunas do FDT, na ordem em que a tela as mostra.
 *
 *  A ORDEM É O CONTRATO desta função. O desalinhamento que ela corrige
 *  vinha de as colunas serem omitidas quando faltava valor: sem z, a faixa
 *  subia para o lugar do z e a classificação para o lugar da faixa, e a
 *  mesma coluna mudava de posição de uma linha para a outra. */
export const COLUNAS_FDT: readonly string[] = [
  'bruto',
  'z',
  'faixa percentílica',
  'classificação',
];

/** Uma coluna já resolvida para a tela: o texto que se imprime e se aquilo
 *  é valor do servidor ou ausência. `ausente` existe para o desenho poder
 *  tratar o travessão como travessão — tipo menor, tom apagado — sem que
 *  ninguém precise comparar o texto com '—' de novo lá na frente. */
export type ColunaFdt = { rotulo: string; texto: string; ausente: boolean };

/** As QUATRO colunas de uma linha do FDT, SEMPRE as quatro.
 *
 *  As do FDT são as DELE — bruto, z, faixa percentílica e classificação —,
 *  e é por isso que esta função existe em vez de o FDT usar
 *  `celulasDoResultado`: os instrumentos comuns mostram escore e percentil,
 *  que aqui não há.
 *
 *  COLUNA SEM VALOR CONTINUA EXISTINDO, ao contrário dos 20 comuns, e a
 *  diferença é deliberada: lá as medidas variam de instrumento para
 *  instrumento e uma coluna vazia seria ruído; aqui as dez medidas são
 *  sempre as mesmas quatro colunas, lidas uma embaixo da outra, e é o
 *  buraco que precisa ser visível para a coluna não se mexer.
 *
 *  O `z` é o caso que exige cuidado: o filtro é o TEXTO formatado, não o
 *  número. Um z não finito devolve null em `zFormatado` e vira travessão —
 *  nunca 0,00.
 *
 *  Não formata nada por conta própria: `zFormatado` é a mesma função que o
 *  PDF usa, e faixa e classificação vêm escritas do servidor. */
export function colunasDaLinhaFdt(linha: LinhaFdt): ColunaFdt[] {
  const z = zFormatado(linha.z);
  const faixa = linha.faixa?.trim() ? linha.faixa : null;
  const classe = linha.classificacao?.trim() ? linha.classificacao : null;
  const texto = (v: string | null) => ({
    texto: v ?? SEM_VALOR,
    ausente: v === null,
  });
  return [
    { rotulo: 'bruto', ...texto(linha.bruto === null ? null : String(linha.bruto)) },
    { rotulo: 'z', ...texto(z) },
    { rotulo: 'faixa percentílica', ...texto(faixa) },
    { rotulo: 'classificação', ...texto(classe) },
  ];
}

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

// =====================================================================
// AS DUAS REPRESENTAÇÕES VISUAIS DO RESULTADO
//
// TRAVA, e ela é a razão de este bloco existir do jeito que existe: o FDT
// NÃO TEM PERCENTIL PONTUAL. `assessment_results.percentile` sai nulo para
// as dez medidas, e é decisão da controladora, não omissão — a fórmula de
// interpolação da fonte discorda da régua de classificação exatamente nas
// fronteiras, e entregar as duas seria entregar a contradição.
//
// Por isso, aqui:
//
//   nada calcula percentil;
//   nada lê a interpolação da fonte;
//   nada reconstrói ponto de corte;
//   nada inventa meio de faixa;
//   nada deriva posição a partir do z.
//
// O z existe e continua sendo mostrado como NÚMERO na coluna dele, mas não
// posiciona barra nenhuma: ele vem de média e desvio, e a classificação
// vem dos pontos empíricos da faixa etária. São duas réguas diferentes
// sobre o mesmo bruto, e elas se cruzam — na faixa de 13 a 15 anos uma
// Inibição "Média superior" tem z MAIOR que uma Leitura "Muito superior".
// Barra por z desenharia a segunda menor que a primeira, contradizendo o
// rótulo impresso ao lado dela.
//
// O que sobra, e que é legítimo:
//
//   Perfil executivo    posição ORDINAL entre as cinco classificações que
//                       o servidor já nomeou. Cinco degraus, não cem.
//   Erros por tarefa    a CONTAGEM, que é o próprio resultado do servidor.
// =====================================================================

/** As cinco classificações de tempo, da menor para a maior.
 *
 *  É ORDEM DE LEITURA de rótulos que o servidor já escolheu, e só. Não
 *  classifica, não compara bruto com nada e não conhece ponto de corte: a
 *  entrada desta régua é a `classificacao` que veio pronta no derivado.
 *
 *  Rótulo fora desta lista não recebe posição — vide `degrauDaClassificacao`.
 *  Adivinhar onde ele cairia é justamente a segunda psicometria que não
 *  pode existir aqui. */
export const ORDEM_CLASSIFICACAO_TEMPO: readonly string[] = [
  'Deficitário',
  'Média inferior',
  'Média',
  'Média superior',
  'Muito superior',
];

/** O degrau de uma classificação, 0 a 4, ou null.
 *
 *  Null em três casos, todos o mesmo para quem desenha: sem classificação,
 *  classificação vazia e rótulo que não está na régua. Nenhum deles vira
 *  degrau zero — degrau zero é "Deficitário", que é um resultado. */
export function degrauDaClassificacao(
  classificacao: string | null | undefined,
): number | null {
  if (typeof classificacao !== 'string') return null;
  const i = ORDEM_CLASSIFICACAO_TEMPO.indexOf(classificacao.trim());
  return i < 0 ? null : i;
}

/** As classes de UMA classificação: o pastel do preenchimento e o tom
 *  fechado que o delimita, em duas formas.
 *
 *  `borda` e `contorno` pintam a MESMA cor e existem os dois porque os
 *  dois desenhos têm geometrias diferentes:
 *
 *    borda     a barra de erros, que tem largura própria em `%`. Com
 *              `box-sizing: border-box` a borda cabe DENTRO dela e não
 *              altera o comprimento — que é o que a barra significa.
 *
 *    contorno  o degrau do perfil, que é `flex-1`. Ali borda ENGORDA a
 *              caixa: com `flex-basis: 0`, a espessura entra na base e o
 *              degrau aceso ficava ~3px mais largo que os outros quatro.
 *              Num gráfico ordinal isso é uma mentira pequena e gratuita
 *              — o degrau ativo não é MAIOR, é o ativo. `outline` não
 *              participa do layout e resolve sem tocar na largura. */
export type TomFdt = { fundo: string; borda: string; contorno: string };

/** O TOM PASTEL DE CADA CLASSIFICAÇÃO — um mapa só, para os dois desenhos.
 *
 *  São TOKENS DO PRODUTO, não hex solto: os pastel narrativos
 *  (`pp-block-*`) e os semânticos (`pp-danger`, `pp-warning`,
 *  `pp-success`) já existem em `globals.css` e já são usados pelo resto
 *  do sistema. Nada global foi alterado para isto.
 *
 *  O PAR existe porque pastel sozinho não sobrevive a duas coisas: ao
 *  papel, onde `background-color` não é pintado sem background graphics, e
 *  ao olho, num fundo já claro. A borda no tom fechado é o que faz a faixa
 *  ativa saltar na tela e continuar legível impressa.
 *
 *  A COR NÃO É A ÚNICA PORTADORA: os dois gráficos escrevem a
 *  classificação ao lado da medida. Quem não distingue os tons continua
 *  lendo o resultado inteiro.
 *
 *  A cor tampouco MEDE. No Perfil executivo ela acompanha a posição
 *  ordinal que já existia; nos Erros ela é a classificação do servidor
 *  pintada, e o comprimento continua sendo só a contagem. */
const TONS: Readonly<Record<string, TomFdt>> = {
  Deficitário: {
    fundo: 'bg-pp-block-coral',
    borda: 'border-pp-danger',
    contorno: 'outline-pp-danger',
  },
  'Média inferior': {
    fundo: 'bg-pp-block-cream',
    borda: 'border-pp-warning',
    contorno: 'outline-pp-warning',
  },
  Média: {
    fundo: 'bg-pp-block-lilac',
    borda: 'border-pp-ink-soft',
    contorno: 'outline-pp-ink-soft',
  },
  'Média superior': {
    fundo: 'bg-pp-block-mint',
    borda: 'border-pp-success',
    contorno: 'outline-pp-success',
  },
  'Muito superior': {
    fundo: 'bg-pp-block-lime',
    borda: 'border-pp-success',
    contorno: 'outline-pp-success',
  },
};

/** O tom neutro: classificação que não está no mapa, ou que não veio.
 *
 *  Não se escolhe cor por conta própria para um rótulo desconhecido —
 *  inventar tom seria afirmar uma gravidade que ninguém devolveu. */
export const TOM_NEUTRO: TomFdt = {
  fundo: 'bg-pp-ink/[0.12]',
  borda: 'border-pp-ink-soft',
  contorno: 'outline-pp-ink-soft',
};

/** O tom de uma classificação, ou null quando não há tom para ela.
 *
 *  Mesma entrada de `degrauDaClassificacao`: o rótulo que o servidor
 *  escreveu, e nada mais. Não olha bruto, não olha z, não olha faixa. */
export function tomDaClassificacao(
  classificacao: string | null | undefined,
): TomFdt | null {
  if (typeof classificacao !== 'string') return null;
  return TONS[classificacao.trim()] ?? null;
}

/** Uma medida no Perfil executivo. `degrau` null = sem posição, e quem
 *  desenha NÃO põe barra: põe a ausência por escrito. */
export type DegrauPerfil = {
  code: string;
  nome: string;
  classificacao: string | null;
  degrau: number | null;
};

/** O Perfil executivo: as seis medidas de tempo, na ordem do controlador.
 *
 *  A ordem é a de `MEDIDAS_TEMPO`, e vem de `blocosFdt` — não é reordenada
 *  aqui, e não é ordenada por resultado: o profissional lê as seis sempre
 *  na mesma sequência, e uma lista que se reorganiza a cada avaliação
 *  esconderia justamente a comparação que ele está fazendo.
 *
 *  Null quando não há bloco de tempo ou quando NENHUMA das seis tem
 *  classificação: aí não há o que posicionar, e um cartão com seis
 *  ausências é pior que cartão nenhum. */
export function perfilExecutivoFdt(
  blocos: BlocoFdt[] | null | undefined,
): DegrauPerfil[] | null {
  const bloco = blocos?.find((b) => b.titulo === TITULO_TEMPO);
  if (!bloco) return null;
  const medidas = bloco.linhas.map((linha) => ({
    code: linha.code,
    nome: linha.nome,
    classificacao: linha.classificacao,
    // medida que o servidor declarou indisponível não recebe posição,
    // mesmo que uma classificação tenha sobrado no derivado
    degrau: linha.indisponivel
      ? null
      : degrauDaClassificacao(linha.classificacao),
  }));
  return medidas.some((m) => m.degrau !== null) ? medidas : null;
}

/** Uma barra de Erros por tarefa.
 *
 *  `fracao` é COMPRIMENTO, 0 a 1, e nasce da contagem dividida pelo topo
 *  do eixo. Zero é comprimento zero E valor zero — no bloco de erros não
 *  errar é resultado, não ausência. Ausência é `fracao` null, e aí não há
 *  barra. */
export type BarraErro = {
  code: string;
  nome: string;
  bruto: number | null;
  classificacao: string | null;
  fracao: number | null;
};

export type ErrosPorTarefa = {
  barras: BarraErro[];
  /** O topo do eixo: a maior contagem presente, com piso 1. O piso existe
   *  para o protocolo sem nenhum erro — quatro zeros — não dividir por
   *  zero; ele muda o EIXO, nunca um valor. */
  topo: number;
  /** Marcas do eixo, todas inteiras: erro é contagem, e uma marca em 1,5
   *  sugeriria meio erro. */
  ticks: number[];
};

/** As marcas do eixo para um topo inteiro. Poucas medidas e contagens
 *  baixas: até seis, todas as marcas; acima disso, três, para o eixo não
 *  virar uma régua de milímetros. */
function ticksDoEixo(topo: number): number[] {
  if (topo <= 6) return Array.from({ length: topo + 1 }, (_, i) => i);
  return [0, Math.ceil(topo / 2), topo];
}

/** Erros por tarefa: as quatro condições, na ordem do controlador.
 *
 *  A barra é a CONTAGEM — o número que o servidor devolveu e que aparece
 *  escrito ao lado dela. Não é z, não é percentil e não é classificação
 *  convertida em tamanho.
 *
 *  Null quando não há bloco de erros ou quando nenhuma das quatro tem
 *  contagem. */
export function errosPorTarefaFdt(
  blocos: BlocoFdt[] | null | undefined,
): ErrosPorTarefa | null {
  const bloco = blocos?.find((b) => b.titulo === TITULO_ERRO);
  if (!bloco) return null;
  const presentes = bloco.linhas
    .filter((l) => !l.indisponivel && typeof l.bruto === 'number')
    .map((l) => l.bruto as number);
  if (presentes.length === 0) return null;
  const topo = Math.max(1, ...presentes);
  const barras = bloco.linhas.map((linha) => {
    const conta =
      linha.indisponivel || typeof linha.bruto !== 'number' ? null : linha.bruto;
    return {
      code: linha.code,
      nome: linha.nome,
      bruto: conta,
      classificacao: linha.classificacao,
      fracao: conta === null ? null : Math.min(1, Math.max(0, conta / topo)),
    };
  });
  return { barras, topo, ticks: ticksDoEixo(topo) };
}

/** Os títulos e as legendas dos dois cartões visuais.
 *
 *  "Perfil executivo" NÃO é seguido da palavra percentil em lugar nenhum,
 *  e o subtítulo diz o que a régua é: cinco classificações, não uma escala
 *  de 0 a 100. */
export const TITULO_PERFIL = 'Perfil executivo';
export const SUBTITULO_PERFIL =
  'Representação visual do desempenho nas condições do FDT.';
export const NOTA_PERFIL =
  'As cores indicam a faixa de classificação de cada medida.';

export const TITULO_ERROS_TAREFA = 'Erros por tarefa';
export const SUBTITULO_ERROS_TAREFA = 'Contagem de erros por condição.';
