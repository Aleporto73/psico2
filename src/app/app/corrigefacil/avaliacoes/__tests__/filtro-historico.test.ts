import { describe, expect, it } from 'vitest';
import { filtrarLinhas, montarLinhas } from '../historico-view';
import type { AvaliacaoResumo } from '@/lib/corrigefacil/api';

function avaliacao(over: Partial<AvaliacaoResumo> = {}): AvaliacaoResumo {
  return {
    id: 'a1',
    instrument_code: 'CES-D',
    subject_label: 'M.A.S.',
    subject_meta: null,
    status: 'concluida',
    completed_at: '2026-08-07T12:00:00Z',
    ...over,
  } as AvaliacaoResumo;
}

const LINHAS = montarLinhas([
  avaliacao({ id: '1', subject_label: 'M.A.S.', instrument_code: 'CES-D' }),
  avaliacao({ id: '2', subject_label: 'João Pereira', instrument_code: 'DCDQ' }),
  avaliacao({
    id: '3',
    subject_label: 'ANA',
    instrument_code: 'BAYLEY-III',
    subject_meta: { respondent_name: 'Mãe' },
  }),
]);

describe('busca no histórico', () => {
  it('termo vazio devolve tudo, na ordem da Edge', () => {
    expect(filtrarLinhas(LINHAS, '')).toHaveLength(3);
    expect(filtrarLinhas(LINHAS, '   ').map((l) => l.id)).toEqual(['1', '2', '3']);
  });

  it('acha pelo código do instrumento', () => {
    expect(filtrarLinhas(LINHAS, 'dcdq').map((l) => l.id)).toEqual(['2']);
    expect(filtrarLinhas(LINHAS, 'BAYLEY').map((l) => l.id)).toEqual(['3']);
  });

  it('acha pela identificação do avaliado, sem caixa e sem acento', () => {
    expect(filtrarLinhas(LINHAS, 'joao').map((l) => l.id)).toEqual(['2']);
    expect(filtrarLinhas(LINHAS, 'ana').map((l) => l.id)).toEqual(['3']);
  });

  it('acha pelo respondente quando ele existe', () => {
    expect(filtrarLinhas(LINHAS, 'mae').map((l) => l.id)).toEqual(['3']);
  });

  it('sem correspondência devolve lista vazia, não a lista inteira', () => {
    expect(filtrarLinhas(LINHAS, 'zzz')).toEqual([]);
  });

  it('não filtra por resultado: a listagem não traz resultado nenhum', () => {
    expect(filtrarLinhas(LINHAS, 'moderada')).toEqual([]);
    expect(filtrarLinhas(LINHAS, 'percentil')).toEqual([]);
  });
});
