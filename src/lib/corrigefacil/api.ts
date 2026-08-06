// Cliente único do CorrigeFácil no navegador.
//
// Toda chamada à Edge Function `corrigir` passa por aqui. O objetivo é ter um
// lugar só onde mora: a origem da URL, os headers, o JWT e a tradução de erro.
//
// O que este módulo NÃO faz, de propósito:
//   - não decide direito comercial. Quem decide é has_corrigefacil_access, no
//     banco, consultada pelo Server Component. Um 403 daqui é informação para
//     a tela, nunca a regra;
//   - não usa service_role. O token é o do usuário logado, e só;
//   - não guarda o token em lugar nenhum, nem o escreve em log.
//
// Contrato conferido em CorrigeFacil/supabase/functions/corrigir/index.ts
// (listarCatalogo). Nenhum campo aqui é inventado.
import { createClient } from '@/utils/supabase/client';

/** Um instrumento como GET /catalogo devolve. São ESTES seis campos — a rota
 *  faz `select code, name, entry_mode, score_type, requires_birthdate,
 *  supports_prematurity from instruments where is_active order by name`.
 *  Não há faixa etária, não há escala, não há norma. */
export type InstrumentoResumo = {
  code: string;
  name: string;
  entry_mode: string;
  score_type: string;
  requires_birthdate: boolean;
  supports_prematurity: boolean;
};

export type CatalogoResposta = {
  instrumentos: InstrumentoResumo[];
};

/** Alternativa de resposta. `value` é o valor bruto; pode ser null. */
export type OpcaoResposta = { label: string; value: number | null };

/** Item do protocolo. `opcoes` só aparece quando o item tem conjunto PRÓPRIO;
 *  quando ausente, vale a lista global `opcoes_resposta` do instrumento. */
export type ItemInstrumento = {
  numero: number;
  texto: string | null;
  opcoes?: OpcaoResposta[];
};

export type EscalaInstrumento = {
  code: string;
  name: string;
  kind: string;
  description: string | null;
  bruto_min: number | null;
  bruto_max: number | null;
};

/** Dimensão de norma. `opcoes` VAZIA significa dimensão calculada pelo
 *  servidor a partir de datas — não é erro, e não há o que o profissional
 *  escolher. */
export type DimensaoNorma = {
  code: string;
  label: string;
  manual: boolean;
  opcoes: string[];
};

export type FaixaClassificacao = {
  scale: string | null;
  basis: string;
  min: number | null;
  max: number | null;
  label: string;
};

export type GrupoItens = { code: string; name: string; itens: number[] };

/** GET /catalogo/:code. Campos conferidos em `catalogoDe`. `item_groups` é
 *  opcional: só sai quando o instrumento tem grupos. */
export type InstrumentoDetalhe = {
  code: string;
  name: string;
  entry_mode: string;
  score_type: string;
  requires_birthdate: boolean;
  supports_prematurity: boolean;
  escalas: EscalaInstrumento[];
  itens: ItemInstrumento[];
  opcoes_resposta: OpcaoResposta[];
  dimensoes: DimensaoNorma[];
  arvore: Record<string, unknown>;
  faixas_classificacao: FaixaClassificacao[];
  item_groups?: GrupoItens[];
};

/** Resultado de UMA escala, como a Edge devolve (type Resultado no index.ts).
 *  `available: false` traz `message` — nunca campo vazio. */
export type ResultadoEscala = {
  raw: number | null;
  score: number | null;
  percentile: number | null;
  z: number | null;
  classification: string | null;
  ci95?: string;
  available: boolean;
  message: string | null;
  flags: string[];
};

/** Corpo do POST /corrigir. São EXATAMENTE estes campos: `pedido()` na Edge
 *  lê instrument_code, norm_selector, respostas e brutos, e ignora o resto.
 *  Não existe identificação do avaliado aqui — quem grava rótulo e
 *  respondente é POST /avaliacao, que não é desta etapa. */
export type PedidoCorrecao = {
  instrument_code: string;
  norm_selector: Record<string, string>;
  respostas?: Record<string, number>;
  brutos?: Record<string, number | Record<string, number>>;
};

/** POST /corrigir 200. NÃO persiste nada: é cálculo puro. */
export type RespostaCorrecao = {
  instrument: string;
  norm_selector: Record<string, unknown>;
  resultados: Record<string, ResultadoEscala>;
};

/** Corpo do POST /avaliacao: o mesmo do /corrigir MAIS identificação.
 *
 *  `subject_label` e `subject_meta` são OPCIONAIS na Edge — ela coage para
 *  null e {} respectivamente. A Edge RECALCULA a partir de respostas/brutos;
 *  não existe caminho para mandar resultado pronto, e é isso que garante que
 *  o que fica gravado saiu do servidor. */
export type PedidoAvaliacao = PedidoCorrecao & {
  subject_label?: string | null;
  subject_meta?: Record<string, unknown>;
};

/** POST /avaliacao 201. */
export type AvaliacaoCriada = {
  assessment_id: string;
  instrument: string;
  norm_selector: Record<string, unknown>;
  status: string;
  resultados: Record<string, ResultadoEscala>;
};

/** Uma linha de GET /avaliacoes. A rota devolve um ARRAY puro, não envelope. */
export type AvaliacaoResumo = {
  id: string;
  instrument_code: string;
  subject_label: string | null;
  subject_meta: Record<string, unknown> | null;
  status: string;
  completed_at: string | null;
};

/** GET /avaliacao/:id. Traz o resultado GRAVADO, nunca recalculado — é o que
 *  faz uma norma corrigida depois não mexer em laudo já entregue.
 *
 *  As respostas brutas do protocolo NÃO saem aqui: `carregar` seleciona
 *  apenas assessment_results. Quem abre um registro antigo vê o resultado,
 *  não o que foi marcado item a item. */
export type AvaliacaoDetalhe = {
  assessment_id: string;
  instrument: string;
  status: string;
  norm_selector: Record<string, unknown>;
  subject_meta: Record<string, unknown>;
  subject_label: string | null;
  created_at: string;
  completed_at: string | null;
  resultados: Record<string, ResultadoEscala>;
};

/** Paginação real de GET /avaliacoes: a Edge prende `limit` em 1..100
 *  (padrão 100) e `offset` em >= 0 (padrão 0). Valor não numérico cai no
 *  padrão — não é erro. */
export const LIMITE_MAXIMO = 100;

/** Resposta de erro da Edge: sempre `{ error: string }`. */
export type ErroResposta = { error?: string };

export type CorrigeFacilErroTipo =
  | 'sem_sessao'
  | 'sessao_invalida'
  | 'sem_acesso'
  | 'nao_encontrado'
  | 'dados_invalidos'
  | 'resposta_recusada'
  | 'indisponivel'
  | 'resposta_invalida';

export class CorrigeFacilError extends Error {
  readonly tipo: CorrigeFacilErroTipo;
  readonly status?: number;

  constructor(tipo: CorrigeFacilErroTipo, message: string, status?: number) {
    super(message);
    this.name = 'CorrigeFacilError';
    this.tipo = tipo;
    this.status = status;
  }
}

export const CAMINHO_FUNCAO = '/functions/v1/corrigir';

/** Base da Edge a partir da mesma configuração que o resto do app usa. */
function origemSupabase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new CorrigeFacilError(
      'indisponivel',
      'Configuração do Supabase ausente.',
    );
  }
  return url.replace(/\/+$/, '');
}

/** HTTP -> tipo de erro do produto. A mensagem é para o profissional ler,
 *  então nada de código nem de detalhe de infraestrutura. */
export function traduzirStatus(status: number, doServidor?: string): CorrigeFacilError {
  if (status === 400) {
    // A Edge diz o que faltou ("instrument_code é obrigatório", "informe
    // respostas ou brutos"). A mensagem dela é mais útil que qualquer texto
    // genérico, e não carrega dado clínico nem norma.
    return new CorrigeFacilError(
      'dados_invalidos',
      doServidor?.trim() || 'Os dados enviados não foram aceitos.',
      status,
    );
  }
  if (status === 422) {
    // Ex.: "item 3: 9 não é alternativa deste item".
    return new CorrigeFacilError(
      'resposta_recusada',
      doServidor?.trim() || 'Alguma resposta não é válida para este instrumento.',
      status,
    );
  }
  if (status === 401) {
    return new CorrigeFacilError(
      'sessao_invalida',
      'Sua sessão expirou. Entre novamente para continuar.',
      status,
    );
  }
  if (status === 403) {
    return new CorrigeFacilError(
      'sem_acesso',
      'Acesso ao CorrigeFácil não liberado para esta conta.',
      status,
    );
  }
  if (status === 404) {
    return new CorrigeFacilError(
      'nao_encontrado',
      'Recurso não encontrado.',
      status,
    );
  }
  return new CorrigeFacilError(
    'indisponivel',
    'O serviço está indisponível no momento. Tente novamente em instantes.',
    status,
  );
}

/** JWT do usuário logado. Sem sessão, nem chega a sair requisição. */
async function tokenDaSessao(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new CorrigeFacilError(
      'sem_sessao',
      'Você precisa estar autenticado para usar o CorrigeFácil.',
    );
  }
  return token;
}

type OpcoesChamada = { signal?: AbortSignal };

/** Chamada à Edge, já autenticada e com o erro traduzido.
 *
 *  Os headers são exatamente os que a UI atual do CorrigeFácil envia
 *  (`ui/lista.html` e `ui/tela.html`, função `chamar`): content-type e
 *  authorization. Nada do corpo — que carrega respostas de protocolo — vai
 *  para log, e o token também não. */
async function chamar<T>(
  rota: string,
  metodo: 'GET' | 'POST',
  opcoes: OpcoesChamada & { corpo?: unknown } = {},
): Promise<T> {
  const token = await tokenDaSessao();

  const resposta = await fetch(`${origemSupabase()}${CAMINHO_FUNCAO}${rota}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    signal: opcoes.signal,
  });

  let corpo: unknown;
  let corpoLegivel = true;
  try {
    corpo = await resposta.json();
  } catch {
    corpoLegivel = false;
  }

  if (!resposta.ok) {
    const doServidor =
      corpoLegivel && corpo && typeof corpo === 'object'
        ? (corpo as ErroResposta).error
        : undefined;
    throw traduzirStatus(resposta.status, doServidor);
  }

  if (!corpoLegivel) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
      resposta.status,
    );
  }

  return corpo as T;
}

async function obter<T>(rota: string, opcoes: OpcoesChamada = {}): Promise<T> {
  return chamar<T>(rota, 'GET', opcoes);
}

/** Instrumentos publicados. A Edge só devolve o que está `is_active`. */
export async function buscarCatalogo(
  opcoes: OpcoesChamada = {},
): Promise<InstrumentoResumo[]> {
  const corpo = await obter<CatalogoResposta>('/catalogo', opcoes);

  if (!corpo || !Array.isArray(corpo.instrumentos)) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  return corpo.instrumentos;
}

/** Um instrumento publicado, com o formulário inteiro. 404 quando o código
 *  não existe OU o instrumento não está publicado — a Edge filtra por
 *  is_active e não distingue os dois casos, de propósito. */
export async function buscarInstrumento(
  code: string,
  opcoes: OpcoesChamada = {},
): Promise<InstrumentoDetalhe> {
  const limpo = code?.trim();
  if (!limpo) {
    throw new CorrigeFacilError('nao_encontrado', 'Instrumento não informado.');
  }

  const corpo = await obter<InstrumentoDetalhe>(
    `/catalogo/${encodeURIComponent(limpo)}`,
    opcoes,
  );

  if (!corpo || typeof corpo.code !== 'string' || !Array.isArray(corpo.itens)) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  return corpo;
}

/** POST /corrigir — calcula e devolve. NÃO grava avaliação: para persistir
 *  existe POST /avaliacao, que não é usada nesta etapa.
 *
 *  O escore, a classificação e a faixa vêm PRONTOS daqui. O cliente não
 *  soma, não inverte item e não consulta norma — essa é a trava central do
 *  produto. */
export async function corrigirInstrumento(
  pedido: PedidoCorrecao,
  opcoes: OpcoesChamada = {},
): Promise<RespostaCorrecao> {
  const corpo = await chamar<RespostaCorrecao>('', 'POST', {
    ...opcoes,
    corpo: pedido,
  });

  if (!corpo || !corpo.resultados || typeof corpo.resultados !== 'object') {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  return corpo;
}

/** POST /avaliacao — grava e conclui. A Edge recalcula a partir das respostas
 *  e só então persiste; o resultado devolvido é o que ficou gravado.
 *
 *  Só fecha com o protocolo INTEIRO: `criarEConcluir` recusa com 422
 *  ("protocolo incompleto") quando falta item. Não existe idempotência por
 *  chave nesta rota — cada POST cria uma avaliação nova —, então a proteção
 *  contra duplicidade é da tela: um envio por vez e nada automático. */
export async function salvarAvaliacao(
  pedido: PedidoAvaliacao,
  opcoes: OpcoesChamada = {},
): Promise<AvaliacaoCriada> {
  const corpo = await chamar<AvaliacaoCriada>('/avaliacao', 'POST', {
    ...opcoes,
    corpo: pedido,
  });

  if (!corpo || typeof corpo.assessment_id !== 'string') {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  return corpo;
}

/** GET /avaliacoes — as do usuário do JWT, mais recentes primeiro.
 *
 *  NÃO exige direito comercial: quem perdeu o acesso continua lendo o que já
 *  gravou. A posse é garantida na Edge pela cláusula user_id. */
export async function listarAvaliacoes(
  parametros: { limit?: number; offset?: number } = {},
  opcoes: OpcoesChamada = {},
): Promise<AvaliacaoResumo[]> {
  const query = new URLSearchParams();
  if (parametros.limit !== undefined) query.set('limit', String(parametros.limit));
  if (parametros.offset !== undefined) query.set('offset', String(parametros.offset));

  const sufixo = query.toString();
  const corpo = await obter<AvaliacaoResumo[]>(
    `/avaliacoes${sufixo ? `?${sufixo}` : ''}`,
    opcoes,
  );

  if (!Array.isArray(corpo)) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  // a ordem é a que a Edge devolveu (completed_at desc) e não é mexida aqui
  return corpo;
}

/** GET /avaliacao/:id — o resultado GRAVADO.
 *
 *  Avaliação de outro usuário responde 404 igual a inexistente: a Edge não
 *  distingue os dois casos, e é assim que a existência de um registro alheio
 *  não vaza. */
export async function buscarAvaliacao(
  id: string,
  opcoes: OpcoesChamada = {},
): Promise<AvaliacaoDetalhe> {
  const limpo = id?.trim();
  if (!limpo) {
    throw new CorrigeFacilError('nao_encontrado', 'Avaliação não informada.');
  }

  const corpo = await obter<AvaliacaoDetalhe>(
    `/avaliacao/${encodeURIComponent(limpo)}`,
    opcoes,
  );

  if (!corpo || typeof corpo.assessment_id !== 'string' || !corpo.resultados) {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
    );
  }

  return corpo;
}
