import { describe, expect, it, vi } from 'vitest';
import type { AvaliacaoResumo } from '@/lib/corrigefacil/api';
import {
  BASE_DETALHE,
  formatarData,
  linkDetalhe,
  montarLinha,
  montarLinhas,
  resumoQuantidadeHistorico,
} from '../historico-view';

const av = (over: Partial<AvaliacaoResumo> = {}): AvaliacaoResumo => ({
  id: '15acc4e1-9089-44ad-afbe-e238aed45ca0',
  instrument_code: 'PHQ-9',
  subject_label: 'SMK.A',
  subject_meta: { respondent_name: 'Auto-relato' },
  status: 'concluida',
  completed_at: '2026-08-06T00:52:40.098Z',
  ...over,
});

describe('histórico', () => {
  it('26) o módulo do histórico não conhece o gate comercial', async () => {
    const fonte = await import('../historico-view');
    expect(Object.keys(fonte)).not.toContain('temAcessoCorrigeFacil');
    expect(JSON.stringify(Object.keys(fonte))).not.toContain('has_corrigefacil_access');
  });

  it('27) a page do histórico não consulta acesso comercial', async () => {
    // se consultasse, precisaria do client de servidor — e o import quebraria
    // sem o mock. Montar sem mock nenhum prova que ela não depende disso.
    const mod = await import('../page');
    const el = mod.default();
    expect(el).toBeTruthy();
    expect(String(el.type)).not.toContain('Locked');
  });

  it('28) a ordem devolvida pela Edge é preservada', () => {
    const lista = [
      av({ id: 'a', subject_label: 'A' }),
      av({ id: 'b', subject_label: 'B' }),
      av({ id: 'c', subject_label: 'C' }),
    ];
    expect(montarLinhas(lista).map((l) => l.rotulo)).toEqual(['A', 'B', 'C']);
  });

  it('29) lista vazia tem texto próprio', () => {
    expect(montarLinhas([])).toEqual([]);
    expect(resumoQuantidadeHistorico(0)).toBe('Nenhuma avaliação salva');
    expect(resumoQuantidadeHistorico(1)).toBe('1 avaliação salva');
    expect(resumoQuantidadeHistorico(3)).toBe('3 avaliações salvas');
  });

  it('31) o link do detalhe é codificado', () => {
    const linha = montarLinha(av());
    expect(linha.href).toBe(`${BASE_DETALHE}/${av().id}`);
    expect(linkDetalhe('a/b')).toBe(`${BASE_DETALHE}/a%2Fb`);
  });

  it('32) registro sem id não gera link', () => {
    expect(linkDetalhe('')).toBeNull();
    expect(linkDetalhe('   ')).toBeNull();
    expect(linkDetalhe(null)).toBeNull();
    expect(montarLinha(av({ id: '' })).href).toBeNull();
  });

  it('usa só campos reais da listagem: nada de resultado resumido', () => {
    const linha = montarLinha(av());
    expect(Object.keys(linha).sort()).toEqual(
      ['data', 'href', 'id', 'instrumento', 'respondente', 'rotulo', 'status'].sort(),
    );
    // GET /avaliacoes NÃO devolve resultado — nada de escore ou classificação
    const serial = JSON.stringify(linha).toLowerCase();
    for (const proibido of ['score', 'classification', 'percentil', 'resultado']) {
      expect(serial).not.toContain(proibido);
    }
  });

  it('rótulo ausente vira texto neutro, não string vazia', () => {
    expect(montarLinha(av({ subject_label: null })).rotulo).toBe('Sem identificação');
    expect(montarLinha(av({ subject_label: '   ' })).rotulo).toBe('Sem identificação');
  });

  it('respondente só aparece quando existe de verdade', () => {
    expect(montarLinha(av({ subject_meta: null })).respondente).toBeNull();
    expect(montarLinha(av({ subject_meta: {} })).respondente).toBeNull();
    expect(montarLinha(av({ subject_meta: { respondent_name: '  ' } })).respondente).toBeNull();
  });

  it('data inválida ou ausente não quebra a linha', () => {
    expect(formatarData(null)).toBe('—');
    expect(formatarData('não é data')).toBe('—');
    expect(formatarData('2026-08-06T00:52:40.098Z')).toContain('2026');
  });

  it('38) o detalhe não oferece editar, excluir, recalcular nem comparar', async () => {
    vi.resetModules();
    const mod = await import('../[id]/DetalheClient');
    const fonte = String(mod.DetalheClient);
    for (const proibido of ['excluir', 'editar', 'recalcular', 'comparar', 'Salvar']) {
      expect(fonte.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
  });
});
