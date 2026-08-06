import { describe, expect, it } from 'vitest';
import type { InstrumentoResumo } from '@/lib/corrigefacil/api';
import {
  acaoSugerida,
  filtrarInstrumentos,
  montarCartao,
  resumoQuantidade,
  type EstadoCatalogo,
} from '../catalog-view';

const inst = (over: Partial<InstrumentoResumo> = {}): InstrumentoResumo => ({
  code: 'PHQ-9',
  name: 'PHQ-9 — Questionário de Saúde do Paciente',
  entry_mode: 'itens',
  score_type: 'escore_bruto',
  requires_birthdate: false,
  supports_prematurity: false,
  ...over,
});

const CATALOGO: InstrumentoResumo[] = [
  inst(),
  inst({ code: 'CES-D', name: 'CES-D — Escala de Rastreamento para Depressão' }),
  inst({
    code: 'BAYLEY-III',
    name: 'Bayley-III',
    entry_mode: 'bruto',
    requires_birthdate: true,
    supports_prematurity: true,
  }),
];

describe('catálogo do CorrigeFácil', () => {
  it('21) estado de carregamento é representável', () => {
    const estado: EstadoCatalogo = { fase: 'carregando' };
    expect(estado.fase).toBe('carregando');
  });

  it('22) sucesso: cartão usa só campos reais da API', () => {
    const cartao = montarCartao(CATALOGO[0]);

    expect(cartao.code).toBe('PHQ-9');
    expect(cartao.name).toContain('Questionário');
    expect(cartao.meta).toEqual(['resposta por item']);
    // GET /catalogo NÃO devolve faixa etária — nada de idade no cartão
    expect(JSON.stringify(cartao)).not.toMatch(/anos|idade/i);
  });

  it('22b) meta reflete os sinalizadores que existem de verdade', () => {
    const cartao = montarCartao(CATALOGO[2]);
    expect(cartao.meta).toEqual([
      'escore bruto digitado',
      'exige data de nascimento',
      'corrige prematuridade',
    ]);
  });

  it('22c) entry_mode desconhecido não inventa rótulo', () => {
    const cartao = montarCartao(inst({ entry_mode: 'formato_novo' }));
    expect(cartao.meta).toEqual([]);
  });

  it('23) busca por código, sem caixa', () => {
    expect(filtrarInstrumentos(CATALOGO, 'phq').map((i) => i.code)).toEqual(['PHQ-9']);
    expect(filtrarInstrumentos(CATALOGO, 'CES-D').map((i) => i.code)).toEqual(['CES-D']);
  });

  it('24) busca por nome, ignorando acento', () => {
    expect(filtrarInstrumentos(CATALOGO, 'questionario').map((i) => i.code)).toEqual([
      'PHQ-9',
    ]);
    expect(filtrarInstrumentos(CATALOGO, 'depressão').map((i) => i.code)).toEqual(['CES-D']);
  });

  it('24b) termo vazio devolve tudo; termo sem correspondência devolve nada', () => {
    expect(filtrarInstrumentos(CATALOGO, '   ')).toHaveLength(3);
    expect(filtrarInstrumentos(CATALOGO, 'zzz')).toHaveLength(0);
  });

  it('25) catálogo vazio tem texto próprio', () => {
    expect(resumoQuantidade(0)).toBe('Nenhum instrumento disponível');
    expect(resumoQuantidade(1)).toBe('1 instrumento disponível');
    expect(resumoQuantidade(4)).toBe('4 instrumentos disponíveis');
  });

  it('26) erro recuperável oferece retry; 403 não oferece', () => {
    expect(acaoSugerida('indisponivel')).toBe('tentar');
    expect(acaoSugerida('resposta_invalida')).toBe('tentar');
    expect(acaoSugerida('nao_encontrado')).toBe('tentar');
    // insistir não resolve falta de compra
    expect(acaoSugerida('sem_acesso')).toBe('nenhuma');
    expect(acaoSugerida('sem_sessao')).toBe('entrar');
    expect(acaoSugerida('sessao_invalida')).toBe('entrar');
  });

  it('27) nenhum cartão oferece ação: a tela de aplicação ainda não existe', () => {
    for (const instrumento of CATALOGO) {
      const cartao = montarCartao(instrumento);
      expect(cartao.acaoDisponivel).toBe(false);
      // e nada no cartão parece uma rota clicável
      expect(JSON.stringify(cartao)).not.toContain('/app/corrigefacil');
      expect(JSON.stringify(cartao)).not.toContain('href');
    }
  });
});
