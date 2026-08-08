import { describe, expect, it } from 'vitest';
import { ABAS, abaAtiva, montarAbas, ROTA_CATALOGO } from '../nav-model';
import { ROTA_HISTORICO } from '../catalog-view';

describe('barra de seções do CorrigeFácil', () => {
  it('oferece exatamente os dois espaços funcionais do módulo', () => {
    expect(ABAS.map((a) => a.id)).toEqual(['instrumentos', 'avaliacoes']);
    expect(ABAS.map((a) => a.rotulo)).toEqual(['Instrumentos', 'Avaliações salvas']);
  });

  it('as abas apontam para as rotas reais, sem string solta', () => {
    expect(ABAS[0].href).toBe(ROTA_CATALOGO);
    expect(ABAS[1].href).toBe(ROTA_HISTORICO);
  });

  it('o catálogo marca Instrumentos', () => {
    expect(abaAtiva('/app/corrigefacil')).toBe('instrumentos');
    expect(abaAtiva('/app/corrigefacil/')).toBe('instrumentos');
  });

  it('o histórico e o detalhe marcam Avaliações salvas', () => {
    expect(abaAtiva('/app/corrigefacil/avaliacoes')).toBe('avaliacoes');
    expect(abaAtiva('/app/corrigefacil/avaliacoes/abc-123')).toBe('avaliacoes');
  });

  it('a aplicação marca Instrumentos — e não Avaliações salvas', () => {
    // A armadilha: "/avaliar/..." começa com "avalia" igual a "/avaliacoes".
    // Um startsWith marcaria a aba errada durante o protocolo inteiro.
    expect(abaAtiva('/app/corrigefacil/avaliar/CES-D')).toBe('instrumentos');
    expect(abaAtiva('/app/corrigefacil/avaliar/C-TRF_1.5-5')).toBe('instrumentos');
    expect(abaAtiva('/app/corrigefacil/avaliar/SNAP-IV-18')).toBe('instrumentos');
  });

  it('fora do módulo nada fica marcado', () => {
    expect(abaAtiva('/app')).toBeNull();
    expect(abaAtiva('/app/doc-studio')).toBeNull();
    expect(abaAtiva('/app/corrigefacilzinho')).toBeNull();
    expect(abaAtiva('')).toBeNull();
  });

  it('exatamente uma aba fica ativa em cada tela do módulo', () => {
    for (const caminho of [
      '/app/corrigefacil',
      '/app/corrigefacil/avaliar/CES-D',
      '/app/corrigefacil/avaliacoes',
      '/app/corrigefacil/avaliacoes/abc-123',
    ]) {
      expect(montarAbas(caminho).filter((a) => a.ativa)).toHaveLength(1);
    }
  });

  it('fora do módulo nenhuma aba fica ativa, e nenhuma some', () => {
    const abas = montarAbas('/app/planilhas');
    expect(abas).toHaveLength(2);
    expect(abas.filter((a) => a.ativa)).toHaveLength(0);
  });
});
