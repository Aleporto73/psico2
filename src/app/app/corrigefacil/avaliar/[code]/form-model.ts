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
  opcoes: OpcaoResposta[];
  grupo: string | null;
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
export type MotivoBloqueio =
  | 'norma_por_data'
  | 'modo_desconhecido'
  | 'sem_campos';

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
};

const MODOS_CONHECIDOS = new Set(['itens', 'bruto', 'componentes']);

/** Dimensões que o profissional escolhe. Lista de opções vazia = dimensão
 *  CALCULADA pelo servidor a partir de datas (a faixa etária do Bayley), não
 *  erro — e é o que esta tela ainda não sabe alimentar. */
function escolhiveis(dimensoes: DimensaoNorma[]): DimensaoNorma[] {
  return dimensoes.filter((d) => (d.opcoes ?? []).length > 0);
}

function calculadas(dimensoes: DimensaoNorma[]): DimensaoNorma[] {
  return dimensoes.filter((d) => (d.opcoes ?? []).length === 0);
}

export function montarModelo(detalhe: InstrumentoDetalhe): ModeloFormulario {
  const dimensoes = detalhe.dimensoes ?? [];

  // grupo de cada item, quando o instrumento tem grupos
  const grupoDoItem = new Map<number, string>();
  for (const g of detalhe.item_groups ?? []) {
    for (const numero of g.itens) {
      grupoDoItem.set(numero, g.name);
    }
  }

  // A ORDEM vem da API e é preservada: `itens` já sai `order by number` e
  // `escalas` já sai `order by ordinal`. Não reordenamos nada.
  const itens: CampoItem[] =
    detalhe.entry_mode === 'itens'
      ? (detalhe.itens ?? []).map((it) => ({
          tipo: 'item' as const,
          numero: it.numero,
          texto: it.texto ?? `Item ${it.numero}`,
          // item com conjunto próprio usa a lista DELE; sem conjunto, a global
          opcoes: it.opcoes ?? detalhe.opcoes_resposta ?? [],
          grupo: grupoDoItem.get(it.numero) ?? null,
        }))
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
  } else if (calculadas(dimensoes).length > 0) {
    // A norma depende de idade derivada de datas. Essa conta mora na tela
    // original do CorrigeFácil e é regra do instrumento — portá-la para cá
    // seria trazer decisão psicométrica para o frontend. Enquanto ela não
    // vier do servidor, a tela recusa em vez de mandar selector incompleto.
    bloqueio = 'norma_por_data';
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
  };
}

export const TEXTO_BLOQUEIO: Record<MotivoBloqueio, string> = {
  norma_por_data:
    'Este instrumento escolhe a norma a partir da idade calculada, e essa ' +
    'etapa ainda não está disponível aqui.',
  modo_desconhecido:
    'Este instrumento usa um formato de preenchimento que esta tela ainda ' +
    'não desenha.',
  sem_campos: 'Este instrumento não trouxe campos para preencher.',
};
