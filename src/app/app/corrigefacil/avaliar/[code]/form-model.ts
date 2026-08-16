// Catálogo do instrumento -> modelo do formulário. Puro, para ser testado sem
// DOM (o Vitest deste repositório roda em `node`).
//
// TRAVA CENTRAL: nada aqui pontua. Este módulo decide o que DESENHAR e o que
// ENVIAR. Quem soma, inverte item, consulta norma e classifica é a Edge.
import type {
  DimensaoNorma,
  InstrumentoDetalhe,
  OpcaoResposta,
} from '@/lib/corrigefacil/api';

/** Campo de entrada, já resolvido para o que a tela desenha. */
export type CampoItem = {
  tipo: 'item';
  /** número do item — é a chave que a Edge espera em `respostas` */
  numero: number;
  texto: string;
  /** true quando o banco NÃO tem enunciado para este item.
   *
   *  Há instrumentos assim de propósito (C-TRF, ERA-F, ERA-A, EPQ-J, ETPC,
   *  CONFIAS): o enunciado não foi licenciado para o produto. Nada é
   *  inventado aqui — o campo só diz à tela que ela deve se apoiar no número
   *  do item, que é como o profissional acompanha pelo caderno impresso. */
  semEnunciado: boolean;
  opcoes: OpcaoResposta[];
  /** O grupo de itens a que ele pertence, quando o instrumento tem grupos.
   *
   *  Vem do catálogo (`item_groups`), com CÓDIGO e nome. O código é o que o
   *  profissional lê no caderno de aplicação ("S1"), e sem ele o título do
   *  bloco perderia a única referência que casa tela e caderno — antes só o
   *  nome era preservado, e ele morria antes de chegar à renderização.
   *
   *  Não existe mapa manual de S1..F7 em lugar nenhum: quem sabe qual item
   *  é de qual tarefa é o servidor, e ele já diz. */
  grupo: { code: string; name: string } | null;
  /** Item que NÃO pontua: zero vínculo com escala nenhuma no servidor. */
  auxiliar: boolean;
  /** Título da seção a que o item pertence, quando pertence a alguma.
   *
   *  INDEPENDENTE de `auxiliar`, e tem de ser: a Seção de Impacto do SDQ
   *  mistura os dois lados — o gate (26), a duração (27) e o peso (31) não
   *  pontuam, e os itens 28, 29 e 30 pontuam na escala IMPACTO. Os seis são
   *  a mesma seção na tela. Amarrar o título ao `auxiliar`, como era antes,
   *  esconderia metade dela.
   *
   *  Quem agrupa é `secoesDeItens`; item sem seção fica na lista principal. */
  secao: string | null;
};

export type CampoEscala = {
  tipo: 'bruto' | 'componentes';
  /** código da escala — chave que a Edge espera em `brutos` */
  code: string;
  nome: string;
  min: number | null;
  max: number | null;
};

export type CampoDimensao = {
  code: string;
  label: string;
  manual: boolean;
  opcoes: string[];
};

/** Por que o instrumento não pode ser aplicado nesta tela. */
export type MotivoBloqueio = 'modo_desconhecido' | 'sem_campos';

export type ModeloFormulario = {
  code: string;
  nome: string;
  entryMode: string;
  /** true quando o catálogo diz `requires_birthdate` */
  exigeDataNascimento: boolean;
  /** true quando o catálogo diz `supports_prematurity` */
  suportaPrematuridade: boolean;
  itens: CampoItem[];
  escalas: CampoEscala[];
  dimensoes: CampoDimensao[];
  bloqueio: MotivoBloqueio | null;
  /** Enunciado que vale para os itens PONTUADOS, mostrado uma vez antes
   *  deles. Null em quase todos os instrumentos — ver INSTRUCAO_DOS_ITENS. */
  instrucaoItens: string | null;
  /** A seção com porta, quando o instrumento tem uma. Null nos outros 20. */
  gate: GateDaSecao | null;
  /** Como a idade é pedida quando NÃO há data de nascimento. Igual para
   *  todos, menos os do mapa fechado IDADE_MANUAL — ver ali. */
  idadeManual: IdadeManual;
  /** true quando os itens são desenhados POR GRUPO, com o título da tarefa
   *  acima de cada bloco. Só o CONFIAS — ver APRESENTACAO_AGRUPADA. */
  itensAgrupados: boolean;
};

/** Seção cuja visibilidade depende de um item de triagem — o GATE.
 *
 *  ESPELHO de `GATES` em `engine/calc.py` e na Edge `corrigir`, e só para a
 *  APRESENTAÇÃO. Esta tela NÃO calcula IMPACTO: quem pontua, aplica a porta
 *  e classifica é o servidor, e ele o faz de novo por conta própria mesmo
 *  que o cliente mande outra coisa.
 *
 *  O que mora aqui é o que DESENHAR e o que EXIGIR antes de deixar enviar.
 *  Divergir do servidor faria a tela bloquear um envio que ele aceitaria —
 *  ou, pior, liberar um que ele recusaria com 422 depois do clique. */
export type GateDaSecao = {
  /** o item de triagem: sempre visível e sempre obrigatório */
  item: number;
  /** a resposta que FECHA a seção */
  fechado: number;
  /** itens que só aparecem com a porta aberta */
  dependentes: number[];
  /** dos dependentes, os que passam a ser OBRIGATÓRIOS com a porta aberta */
  exigidos: number[];
};

/** O mapa é fechado de propósito, como INSTRUCAO_DOS_ITENS: só o código
 *  listado ganha porta, e todo instrumento fora dele continua exatamente
 *  como estava. */
export const GATE_POR_INSTRUMENTO: Readonly<Record<string, GateDaSecao>> = {
  // SDQ-POR · "A criança tem alguma dificuldade?" (item 26). Respondido
  // "Não" (0), a Seção de Impacto inteira não se aplica: só o gate fica na
  // tela, e 28-30 deixam de ser exigidos. Respondido 1, 2 ou 3, aparecem a
  // duração (27), as três parcelas do impacto (28-30) e o peso sobre o
  // professor (31) — e as três parcelas passam a ser obrigatórias.
  'SDQ-POR': {
    item: 26,
    fechado: 0,
    dependentes: [27, 28, 29, 30, 31],
    exigidos: [28, 29, 30],
  },
};

// ---------------------------------------------------------------------
// IDADE MANUAL
// ---------------------------------------------------------------------

/** Como a idade é pedida no instrumento que NÃO resolve norma por data.
 *
 *  `decimal` não é um detalhe de máscara: ele diz que a idade daquele
 *  instrumento admite fração de ano, e é o que separa "anos completos" de
 *  "idade em anos". */
export type IdadeManual = {
  min: number;
  max: number;
  decimal: boolean;
};

/** O que valia para todo mundo antes deste mapa existir, e continua
 *  valendo para todo mundo que não está nele. */
export const IDADE_MANUAL_PADRAO: IdadeManual = {
  min: 0,
  max: 130,
  decimal: false,
};

/** As EXCEÇÕES de idade manual, num lugar só.
 *
 *  Fechado como INSTRUCAO_DOS_ITENS, GATE_POR_INSTRUMENTO e
 *  FAIXA_PELA_IDADE, e pelo mesmo motivo: quem não está listado não muda.
 *  Estar aqui, e não espalhado em `if (code === ...)` pela tela, é o que
 *  garante que campo, validação, mensagem de erro e persistência falem da
 *  MESMA faixa — divergir entre eles é aceitar no campo o que a validação
 *  recusa depois.
 *
 *  ISTO É IDENTIFICAÇÃO, NÃO NORMA. A idade aqui diz para quem o
 *  instrumento se aplica; ela não escolhe tabela normativa e não entra no
 *  `norm_selector`. Quem resolve dimensão de norma pela idade é
 *  FAIXA_PELA_IDADE, que é outro mapa e continua só com o BPA-2. */
export const IDADE_MANUAL: Readonly<Record<string, IdadeManual>> = {
  // C-TRF 1.5-5 · o próprio nome do instrumento é a faixa: 1 ano e meio a
  // 5 anos. A norma dele é por SEXO, então a idade não escolhe tabela —
  // ela diz se a criança está na faixa em que o instrumento vale. Com a
  // regra genérica (inteiro, 0 a 130), 1,5 era recusado e 8 era aceito:
  // errado nos dois sentidos.
  'C-TRF_1.5-5': { min: 1.5, max: 5, decimal: true },
  // CONFIAS · a fonte indica o instrumento a partir dos 4 anos. Só o PISO
  // muda: não há teto declarado, então o teto genérico (130) fica, e o
  // decimal continua recusado — a idade do CONFIAS é em anos completos,
  // como na regra padrão. Com o piso genérico (0), a tela aceitava aplicar
  // o instrumento a uma criança de 3 anos sem dizer nada.
  //
  // Continua sendo IDENTIFICAÇÃO, não norma: a norma do CONFIAS é a
  // hipótese de escrita, escolhida pelo profissional, e a idade não entra
  // no `norm_selector` nem aparece em FAIXA_PELA_IDADE.
  CONFIAS: { min: 4, max: 130, decimal: false },
};

/** A regra deste instrumento. Quem não está no mapa recebe a padrão. */
export function idadeManualDe(code: string): IdadeManual {
  return IDADE_MANUAL[code] ?? IDADE_MANUAL_PADRAO;
}

/** Em que estado está a porta deste protocolo. */
export type EstadoGate = 'sem_gate' | 'nao_respondido' | 'fechado' | 'aberto';

export function estadoDoGate(
  modelo: ModeloFormulario,
  respostas: Readonly<Record<number, number | undefined>>,
): EstadoGate {
  const gate = modelo.gate;
  if (!gate) return 'sem_gate';
  const v = respostas[gate.item];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'nao_respondido';
  return v === gate.fechado ? 'fechado' : 'aberto';
}

/** Os itens que a tela desenha AGORA.
 *
 *  Antes de o gate ser respondido, e com ele fechado, os dependentes não
 *  aparecem: perguntar "o quanto essa dificuldade atrapalha" a quem acabou
 *  de dizer que não há dificuldade é pedir uma resposta que não existe. */
export function itensVisiveis(
  modelo: ModeloFormulario,
  respostas: Readonly<Record<number, number | undefined>>,
): CampoItem[] {
  const gate = modelo.gate;
  if (!gate) return modelo.itens;
  if (estadoDoGate(modelo, respostas) === 'aberto') return modelo.itens;
  const dependentes = new Set(gate.dependentes);
  return modelo.itens.filter((i) => !dependentes.has(i.numero));
}

// ---------------------------------------------------------------------
// APRESENTAÇÃO AGRUPADA
// ---------------------------------------------------------------------

/** Os instrumentos cujos itens são desenhados POR GRUPO, com o título da
 *  tarefa acima de cada bloco.
 *
 *  Fechado de propósito, como INSTRUCAO_DOS_ITENS, GATE_POR_INSTRUMENTO e
 *  IDADE_MANUAL — e aqui isso é mais que estilo. `item_groups` existe no
 *  catálogo de qualquer instrumento que declare grupos, e ligar a
 *  apresentação agrupada para todos de uma vez redesenharia telas que
 *  ninguém pediu para redesenhar.
 *
 *  CONFIAS · os 70 itens são 16 tarefas com nome próprio (S1..S9, F1..F7),
 *  e o profissional aplica tarefa a tarefa, pelo caderno. Uma lista corrida
 *  de 70 linhas idênticas não diz onde uma tarefa acaba e a outra começa. */
export const APRESENTACAO_AGRUPADA: ReadonlySet<string> = new Set(['CONFIAS']);

export type GrupoDeItens = { code: string; nome: string; itens: CampoItem[] };

/** Os itens agrupados por `grupo`, NA ORDEM EM QUE VÊM — que é a do
 *  catálogo (`order by ig.ordinal, it.number` na Edge). Nada é reordenado
 *  aqui, e nenhum número de item é reescrito.
 *
 *  Item sem grupo não some: quem chama continua desenhando a lista corrida
 *  para ele. No CONFIAS não há esse caso — os 70 estão nos 16 grupos. */
export function gruposDeItens(itens: readonly CampoItem[]): GrupoDeItens[] {
  const out: GrupoDeItens[] = [];
  for (const item of itens) {
    if (!item.grupo) continue;
    const existente = out.find((g) => g.code === item.grupo!.code);
    if (existente) existente.itens.push(item);
    else out.push({ code: item.grupo.code, nome: item.grupo.name, itens: [item] });
  }
  return out;
}

export type SecaoDeItens = { titulo: string; itens: CampoItem[] };

/** Os itens agrupados por `secao`, na ordem em que vêm, com o título UMA
 *  vez para o bloco inteiro — e não repetido a cada pergunta.
 *
 *  Item sem `secao` não entra aqui: ele fica na lista principal. No PHQ-9 o
 *  resultado é uma seção com um item só, que é exatamente o que a tela já
 *  desenhava; no SDQ é uma seção com até seis. */
export function secoesDeItens(itens: readonly CampoItem[]): SecaoDeItens[] {
  const out: SecaoDeItens[] = [];
  for (const item of itens) {
    if (!item.secao) continue;
    const existente = out.find((s) => s.titulo === item.secao);
    if (existente) existente.itens.push(item);
    else out.push({ titulo: item.secao, itens: [item] });
  }
  return out;
}

const MODOS_CONHECIDOS = new Set(['itens', 'bruto', 'componentes']);

/** Enunciado dos itens, por instrumento.
 *
 *  Isto é APRESENTAÇÃO, e mora aqui por uma razão concreta: o contrato do
 *  catálogo não transporta `instrument.instruction`. Levá-lo até a tela
 *  exigiria coluna nova em `instruments`, migration e mudança de contrato
 *  da Edge — custo grande para um texto fixo que não entra em cálculo,
 *  não é norma e não muda por avaliação.
 *
 *  O mapa é fechado de propósito: só o código listado recebe enunciado, e
 *  todo instrumento fora dele continua exatamente como estava. Quando (e
 *  se) o catálogo passar a transportar o campo, esta constante sai e o
 *  valor passa a vir de `detalhe`, sem que a tela mude.
 *
 *  O texto vale para os itens PONTUADOS. No PHQ-9 ele NÃO cobre o item
 *  auxiliar: o impacto funcional pergunta outra coisa, tem enunciado
 *  próprio e fica numa seção separada. */
export const INSTRUCAO_DOS_ITENS: Readonly<Record<string, string>> = {
  // PHQ-9 · vale para os itens 1–9
  'PHQ-9':
    'Durante os últimos 14 dias, com que frequência você foi afetado(a) ' +
    'por algum dos seguintes problemas?',
  // CES-D · o período de referência do instrumento é a última semana, e é
  // ele que dá sentido às quatro alternativas (de "menos de 1 dia" a "5 a
  // 7 dias"). A fonte o escreve uma vez, antes dos 20 itens, e é assim que
  // ele aparece aqui: repetir por item seria outra coisa.
  'CES-D':
    'Para responder, considere como a pessoa se sentiu ou se comportou ' +
    'durante a última semana.',
};

// ---------------------------------------------------------------------
// DIMENSÃO QUE A IDADE RESOLVE
// ---------------------------------------------------------------------

/** Uma dimensão de norma que a IDADE resolve no servidor, em vez de o
 *  profissional escolher numa lista.
 *
 *  O BPA-2 é o caso: na conversão por idade, a faixa etária é função da
 *  idade informada e pedi-la de novo é pedir que o profissional repita o
 *  que já disse — com a chance de dizer diferente. A tela deixa de mostrar
 *  o campo, deixa de exigi-lo e manda a idade como chave numérica.
 *
 *  A AUTORIDADE CONTINUA NO SERVIDOR. Esta tela não tem, e não pode ter, a
 *  tabela de faixas: quem sabe que 25 anos cai em 21-30 é o `range_min`/
 *  `range_max` dos `norm_sets`, e ele não chega ao browser. O que se manda
 *  é a idade crua; a faixa é escolhida lá.
 *
 *  O mapa é FECHADO, como INSTRUCAO_DOS_ITENS e GATE_POR_INSTRUMENTO — e
 *  aqui isso é mais que estilo. `manual_choice=false` no catálogo tem
 *  história diferente em outros instrumentos, e transformar todos eles em
 *  campo oculto de uma vez esconderia escolha que hoje é do profissional.
 *  Só o código listado muda. */
export type FaixaPelaIdade = {
  /** a dimensão que sai da tela, das pendências e do corpo do envio */
  dimensao: string;
  /** a dimensão que LIGA a regra, e o valor dela que a liga */
  quando: { dimensao: string; valor: string };
  /** o nome da chave numérica que vai no `norm_selector` no lugar dela */
  chave: string;
};

export const FAIXA_PELA_IDADE: Readonly<Record<string, FaixaPelaIdade>> = {
  // BPA-2 · a dimensão 'Conversão' tem duas opções. Em 'idade' a faixa
  // etária é a idade; em 'escolaridade' a faixa é a escolaridade e
  // continua sendo escolha manual, exatamente como está hoje.
  'BPA-2': {
    dimensao: 'faixa',
    quando: { dimensao: 'conversao', valor: 'idade' },
    chave: 'chave',
  },
};

/** A regra deste instrumento, quando o selector atual a LIGA. Null é o
 *  caso dos outros 20, e também o do BPA-2 por escolaridade. */
export function faixaPelaIdade(
  modelo: ModeloFormulario,
  selector: Record<string, string>,
): FaixaPelaIdade | null {
  const regra = FAIXA_PELA_IDADE[modelo.code];
  if (!regra) return null;
  return selector[regra.quando.dimensao] === regra.quando.valor ? regra : null;
}

/** Esta dimensão está sendo resolvida pela idade agora? Quem desenha e
 *  quem cobra pendência perguntam daqui, para não haver dois critérios. */
export function resolvidaPelaIdade(
  modelo: ModeloFormulario,
  selector: Record<string, string>,
  code: string,
): boolean {
  return faixaPelaIdade(modelo, selector)?.dimensao === code;
}

/** Só dimensões com opções são escolhidas pelo profissional. Dimensão sem
 * opções é calculada a partir das datas pelo resolver server-side. */
function escolhiveis(dimensoes: DimensaoNorma[]): DimensaoNorma[] {
  return dimensoes.filter((d) => (d.opcoes ?? []).length > 0);
}

export function montarModelo(detalhe: InstrumentoDetalhe): ModeloFormulario {
  const dimensoes = detalhe.dimensoes ?? [];

  // grupo de cada item, quando o instrumento tem grupos. Guarda CÓDIGO e
  // nome: o código é o que casa a tela com o caderno de aplicação, e antes
  // ele era descartado aqui.
  const grupoDoItem = new Map<number, { code: string; name: string }>();
  for (const g of detalhe.item_groups ?? []) {
    for (const numero of g.itens) {
      grupoDoItem.set(numero, { code: g.code, name: g.name });
    }
  }

  // A ORDEM vem da API e é preservada: `itens` já sai `order by number` e
  // `escalas` já sai `order by ordinal`. Não reordenamos nada.
  const itens: CampoItem[] =
    detalhe.entry_mode === 'itens'
      ? (detalhe.itens ?? []).map((it) => {
          const enunciado = (it.texto ?? '').trim();
          return {
            tipo: 'item' as const,
            numero: it.numero,
            texto: enunciado || `Item ${it.numero}`,
            semEnunciado: enunciado === '',
            // item com conjunto próprio usa a lista DELE; sem conjunto, a global
            opcoes: it.opcoes ?? detalhe.opcoes_resposta ?? [],
            grupo: grupoDoItem.get(it.numero) ?? null,
            // as duas vêm da API e são INDEPENDENTES: `auxiliar` diz que o
            // item não pontua, `secao` diz a que bloco ele pertence. Item
            // sem conjunto de alternativas rotulado sai `secao: null`, que é
            // o estado de todos os itens de quase todos os instrumentos —
            // inclusive os nove do PHQ-9.
            auxiliar: it.auxiliar === true,
            secao: it.secao ?? null,
          };
        })
      : [];

  // Escala composta é DERIVADA das primárias: não se digita bruto dela.
  const escalas: CampoEscala[] =
    detalhe.entry_mode === 'bruto' || detalhe.entry_mode === 'componentes'
      ? (detalhe.escalas ?? [])
          .filter((e) => e.kind !== 'composta')
          .map((e) => ({
            tipo: detalhe.entry_mode as 'bruto' | 'componentes',
            code: e.code,
            nome: e.name,
            min: e.bruto_min,
            max: e.bruto_max,
          }))
      : [];

  let bloqueio: MotivoBloqueio | null = null;
  if (!MODOS_CONHECIDOS.has(detalhe.entry_mode)) {
    bloqueio = 'modo_desconhecido';
  } else if (itens.length === 0 && escalas.length === 0) {
    bloqueio = 'sem_campos';
  }

  return {
    code: detalhe.code,
    nome: detalhe.name,
    entryMode: detalhe.entry_mode,
    exigeDataNascimento: detalhe.requires_birthdate === true,
    suportaPrematuridade: detalhe.supports_prematurity === true,
    itens,
    escalas,
    dimensoes: escolhiveis(dimensoes).map((d) => ({
      code: d.code,
      label: d.label,
      manual: d.manual === true,
      opcoes: d.opcoes,
    })),
    bloqueio,
    // só em entry_mode 'itens': onde não há item, não há enunciado de item
    instrucaoItens:
      detalhe.entry_mode === 'itens'
        ? (INSTRUCAO_DOS_ITENS[detalhe.code] ?? null)
        : null,
    // idem: sem item não há porta. Os outros 20 saem com null e nada muda.
    gate:
      detalhe.entry_mode === 'itens'
        ? (GATE_POR_INSTRUMENTO[detalhe.code] ?? null)
        : null,
    // vale mesmo quando `requires_birthdate` é true: ali o campo de idade
    // manual nem aparece, e a regra fica inerte em vez de ausente.
    idadeManual: idadeManualDe(detalhe.code),
    // idem `instrucaoItens` e `gate`: sem item não há o que agrupar. E só
    // liga com grupo de verdade no catálogo — instrumento listado que
    // chegue sem `item_groups` cai na lista corrida de sempre, em vez de
    // desenhar zero bloco e sumir com os itens.
    itensAgrupados:
      detalhe.entry_mode === 'itens' &&
      APRESENTACAO_AGRUPADA.has(detalhe.code) &&
      (detalhe.item_groups ?? []).length > 0,
  };
}

export const TEXTO_BLOQUEIO: Record<MotivoBloqueio, string> = {
  modo_desconhecido:
    'Este instrumento usa um formato de preenchimento que esta tela ainda ' +
    'não desenha.',
  sem_campos: 'Este instrumento não trouxe campos para preencher.',
};
