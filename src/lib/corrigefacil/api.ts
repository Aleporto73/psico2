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

/** Resposta de erro da Edge: sempre `{ error: string }`. */
export type ErroResposta = { error?: string };

export type CorrigeFacilErroTipo =
  | 'sem_sessao'
  | 'sessao_invalida'
  | 'sem_acesso'
  | 'nao_encontrado'
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
export function traduzirStatus(status: number): CorrigeFacilError {
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

/** GET numa rota da Edge, já autenticado e com o erro traduzido.
 *
 *  Os headers são exatamente os que a UI atual do CorrigeFácil envia
 *  (`ui/lista.html`, função `chamar`): content-type e authorization. */
async function obter<T>(rota: string, opcoes: OpcoesChamada = {}): Promise<T> {
  const token = await tokenDaSessao();

  const resposta = await fetch(`${origemSupabase()}${CAMINHO_FUNCAO}${rota}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    signal: opcoes.signal,
  });

  if (!resposta.ok) {
    throw traduzirStatus(resposta.status);
  }

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new CorrigeFacilError(
      'resposta_invalida',
      'A resposta do servidor veio em formato inesperado.',
      resposta.status,
    );
  }

  return corpo as T;
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
