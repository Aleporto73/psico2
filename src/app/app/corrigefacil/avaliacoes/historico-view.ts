// Modelo de exibição do histórico. Puro, testável sem DOM.
import type { AvaliacaoResumo, CorrigeFacilErroTipo } from '@/lib/corrigefacil/api';

export type EstadoHistorico =
  | { fase: 'carregando' }
  | { fase: 'ok'; avaliacoes: AvaliacaoResumo[] }
  | { fase: 'erro'; tipo: CorrigeFacilErroTipo; mensagem: string };

export const BASE_DETALHE = '/app/corrigefacil/avaliacoes';

/** Link do detalhe. Null quando não há id — sem id não existe rota, e um
 *  link quebrado é pior que nenhum. */
export function linkDetalhe(id: string | null | undefined): string | null {
  const limpo = (id ?? '').trim();
  if (!limpo) return null;
  return `${BASE_DETALHE}/${encodeURIComponent(limpo)}`;
}

export type LinhaHistorico = {
  id: string;
  rotulo: string;
  instrumento: string;
  respondente: string | null;
  data: string | null;
  status: string;
  href: string | null;
};

/** Uma linha da listagem, só com o que GET /avaliacoes devolve.
 *
 *  Nada de "resultado resumido": a listagem NÃO traz resultado. Inventar uma
 *  classificação aqui seria produzir informação clínica que o servidor não
 *  mandou. Quem quiser o resultado abre o detalhe. */
export function montarLinha(avaliacao: AvaliacaoResumo): LinhaHistorico {
  const meta = avaliacao.subject_meta ?? {};
  const respondente =
    typeof meta.respondent_name === 'string' && meta.respondent_name.trim()
      ? meta.respondent_name
      : null;

  return {
    id: avaliacao.id,
    rotulo: avaliacao.subject_label?.trim() || 'Sem identificação',
    instrumento: avaliacao.instrument_code,
    respondente,
    data: avaliacao.completed_at,
    status: avaliacao.status,
    href: linkDetalhe(avaliacao.id),
  };
}

/** A ordem vem da Edge (completed_at desc) e é preservada. */
export function montarLinhas(avaliacoes: AvaliacaoResumo[]): LinhaHistorico[] {
  return avaliacoes.map(montarLinha);
}

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function resumoQuantidadeHistorico(total: number): string {
  if (total === 0) return 'Nenhuma avaliação salva';
  if (total === 1) return '1 avaliação salva';
  return `${total} avaliações salvas`;
}
