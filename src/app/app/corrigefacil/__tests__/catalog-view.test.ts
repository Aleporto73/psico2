import { describe, expect, it } from 'vitest';
import type { InstrumentoResumo } from '@/lib/corrigefacil/api';
import {
  acaoSugerida,
  BASE_APLICAR,
  filtrarInstrumentos,
  linkAplicar,
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

  it('31) cada instrumento ganha link de aplicação', () => {
    for (const instrumento of CATALOGO) {
      const cartao = montarCartao(instrumento);
      expect(cartao.acaoDisponivel).toBe(true);
      expect(cartao.href).toBe(`${BASE_APLICAR}/${encodeURIComponent(instrumento.code)}`);
    }
  });

  it('32) o código é codificado no link', () => {
    expect(linkAplicar('C-TRF_1.5-5')).toBe(
      '/app/corrigefacil/avaliar/C-TRF_1.5-5'.replace('C-TRF_1.5-5', encodeURIComponent('C-TRF_1.5-5')),
    );
    expect(linkAplicar('SNAP-IV-18')).toBe('/app/corrigefacil/avaliar/SNAP-IV-18');
    // caractere que mudaria de significado na URL
    expect(linkAplicar('A/B')).toBe('/app/corrigefacil/avaliar/A%2FB');
  });

  it('33) código vazio ou só espaço não gera link', () => {
    expect(linkAplicar('')).toBeNull();
    expect(linkAplicar('   ')).toBeNull();

    const cartao = montarCartao(inst({ code: '  ' }));
    expect(cartao.acaoDisponivel).toBe(false);
    expect(cartao.href).toBeNull();
  });

  it('34) o texto de "próxima etapa" saiu do cartão', () => {
    const cartao = montarCartao(CATALOGO[0]);
    expect(JSON.stringify(cartao)).not.toContain('próxima etapa');
  });

  it('35) a busca continua funcionando junto com o link', () => {
    const achados = filtrarInstrumentos(CATALOGO, 'bayley');
    expect(achados).toHaveLength(1);
    expect(montarCartao(achados[0]).href).toBe('/app/corrigefacil/avaliar/BAYLEY-III');
  });
});
