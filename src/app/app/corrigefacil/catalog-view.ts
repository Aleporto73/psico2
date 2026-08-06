// Modelo de exibição do catálogo, separado do componente para ser testável
// sem DOM (o Vitest deste repositório roda em `node`).
import type { CorrigeFacilErroTipo, InstrumentoResumo } from '@/lib/corrigefacil/api';

export type EstadoCatalogo =
  | { fase: 'carregando' }
  | { fase: 'ok'; instrumentos: InstrumentoResumo[] }
  | { fase: 'erro'; tipo: CorrigeFacilErroTipo; mensagem: string };

/** Cartão de um instrumento na lista.
 *
 *  `meta` só carrega o que a Edge realmente devolve. Em particular NÃO há
 *  faixa etária: GET /catalogo devolve seis campos e nenhum deles é idade.
 *  Inventar "6 a 12 anos" num cartão de instrumento psicométrico seria
 *  informação clínica falsa.
 *
 *  `acaoDisponivel` é false em toda esta etapa: a tela de aplicação ainda não
 *  existe, e um botão que não leva a lugar nenhum é pior do que nenhum botão. */
export type CartaoInstrumento = {
  code: string;
  name: string;
  meta: string[];
  acaoDisponivel: false;
};

const ROTULO_ENTRADA: Record<string, string> = {
  itens: 'resposta por item',
  bruto: 'escore bruto digitado',
  componentes: 'acertos, erros e omissões',
};

export function montarCartao(instrumento: InstrumentoResumo): CartaoInstrumento {
  const meta: string[] = [];

  const entrada = ROTULO_ENTRADA[instrumento.entry_mode];
  if (entrada) {
    meta.push(entrada);
  }
  if (instrumento.requires_birthdate) {
    meta.push('exige data de nascimento');
  }
  if (instrumento.supports_prematurity) {
    meta.push('corrige prematuridade');
  }

  return {
    code: instrumento.code,
    name: instrumento.name,
    meta,
    acaoDisponivel: false,
  };
}

/** Busca local por código ou nome, sem acento e sem caixa. */
export function filtrarInstrumentos(
  instrumentos: InstrumentoResumo[],
  termo: string,
): InstrumentoResumo[] {
  const alvo = normalizar(termo);
  if (!alvo) {
    return instrumentos;
  }
  return instrumentos.filter(
    (i) => normalizar(i.code).includes(alvo) || normalizar(i.name).includes(alvo),
  );
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function resumoQuantidade(total: number): string {
  if (total === 0) return 'Nenhum instrumento disponível';
  if (total === 1) return '1 instrumento disponível';
  return `${total} instrumentos disponíveis`;
}

/** O erro já vem traduzido do `api.ts`; aqui fica só o que a tela acrescenta
 *  sobre o que o profissional pode FAZER a respeito. */
export function acaoSugerida(tipo: CorrigeFacilErroTipo): 'entrar' | 'tentar' | 'nenhuma' {
  if (tipo === 'sem_sessao' || tipo === 'sessao_invalida') return 'entrar';
  if (tipo === 'sem_acesso') return 'nenhuma';
  return 'tentar';
}
