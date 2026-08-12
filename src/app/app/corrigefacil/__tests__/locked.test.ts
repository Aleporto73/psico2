import { describe, expect, it } from 'vitest';
import {
  DESCRICAO_FALLBACK,
  montarVisaoBloqueada,
  NOME_FALLBACK,
  ordenarInstrumentos,
  SLUG_CORRIGEFACIL,
  tomDoInstrumento,
  TONS_VITRINE,
  type ProdutoBloqueado,
} from '../locked-product';
import { CODIGOS_DOS_21 } from '../graphs/graph-config';

const completo: ProdutoBloqueado = {
  name: 'CorrigeFácil',
  description: 'Correção de instrumentos dentro do sistema.',
  price: 57,
  billing_type: 'one_time',
  checkout_url: 'https://www.payment.eng.br/checkout?product=XPTO&price=ABC',
};

describe('tela bloqueada do CorrigeFácil', () => {
  it('o slug consultado é corrigefacil', () => {
    expect(SLUG_CORRIGEFACIL).toBe('corrigefacil');
  });

  it('8) produto ausente: fallback seguro e NENHUM link de compra', () => {
    const visao = montarVisaoBloqueada(null);

    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
    expect(visao.nome).toBe(NOME_FALLBACK);
    expect(visao.descricao).toBe(DESCRICAO_FALLBACK);
    expect(visao.precoLabel).toBeNull();
  });

  it('9) checkout_url null: sem link de compra, mesmo com o produto cadastrado', () => {
    const visao = montarVisaoBloqueada({ ...completo, checkout_url: null });

    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
    // o produto existe, então nome e preço vêm dele
    expect(visao.nome).toBe('CorrigeFácil');
    expect(visao.precoLabel).toContain('57');
  });

  it('9b) checkout_url em branco conta como ausente', () => {
    const visao = montarVisaoBloqueada({ ...completo, checkout_url: '   ' });
    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
  });

  it('10) checkout_url presente: CTA aponta exatamente para ela', () => {
    const visao = montarVisaoBloqueada(completo);

    expect(visao.modoCta).toBe('checkout');
    expect(visao.checkoutUrl).toBe(completo.checkout_url);
  });

  it('11) preço exibido vem somente do catálogo', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 97 }).precoLabel).toContain('97');
    expect(montarVisaoBloqueada({ ...completo, price: null }).precoLabel).toBeNull();
    expect(montarVisaoBloqueada(null).precoLabel).toBeNull();
  });

  it('11b) preço zero é preço real, não ausência', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 0 }).precoLabel).toContain('0,00');
  });

  it('12) falha de consulta (produto nulo) NÃO libera conteúdo nem inventa checkout', () => {
    const visao = montarVisaoBloqueada(null);

    // nada que pareça um caminho de compra
    expect(visao.checkoutUrl).toBeNull();
    expect(visao.modoCta).not.toBe('checkout');
    expect(visao.precoLabel).toBeNull();
    // e nenhum campo carrega access_url disfarçada de checkout
    expect(JSON.stringify(visao)).not.toContain('/app/');
    expect(JSON.stringify(visao)).not.toContain('http');
  });

  it('billing_type diferente de one_time não promete pagamento único', () => {
    expect(montarVisaoBloqueada({ ...completo, billing_type: 'yearly' }).pagamentoUnico).toBe(
      false,
    );
    expect(montarVisaoBloqueada(null).pagamentoUnico).toBe(true);
  });

  // O fallback aparece justamente quando o catálogo está fora do ar — a hora
  // em que menos se pode prometer tela que não existe.
  it('o fallback de descrição não promete comparação entre aplicações', () => {
    const texto = DESCRICAO_FALLBACK.toLowerCase();
    expect(texto).not.toContain('comparação');
    expect(texto).not.toContain('comparar');
    expect(texto).not.toContain('evolução');
    // e continua descrevendo o que existe
    expect(texto).toContain('correção');
    expect(texto).toContain('histórico');
  });
});

describe('vitrine de instrumentos da tela de venda', () => {
  const exibidos = ordenarInstrumentos(CODIGOS_DOS_21);

  it('exibe exatamente os 21, sem faltar nem sobrar', () => {
    expect(CODIGOS_DOS_21).toHaveLength(21);
    expect(exibidos).toHaveLength(21);
    // conjunto idêntico ao da fonte soberana, nos dois sentidos
    expect([...exibidos].sort()).toEqual([...CODIGOS_DOS_21].sort());
    for (const codigo of CODIGOS_DOS_21) {
      expect(exibidos, codigo).toContain(codigo);
    }
    expect(new Set(exibidos).size).toBe(21);
  });

  it('a ordem exibida é alfabética, não a ordem do registro', () => {
    const alfabetica = [...CODIGOS_DOS_21].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(exibidos).toEqual(alfabetica);
    for (let i = 1; i < exibidos.length; i += 1) {
      expect(exibidos[i - 1].localeCompare(exibidos[i], 'pt-BR')).toBeLessThan(0);
    }
    // o registro é ordenado por FAMÍLIA de gráfico; se a exibição fosse igual
    // a ele, esta tela estaria mostrando a ordem errada
    expect(exibidos).not.toEqual([...CODIGOS_DOS_21]);
  });

  it('não muta a fonte soberana ao ordenar', () => {
    const antes = [...CODIGOS_DOS_21];
    ordenarInstrumentos(CODIGOS_DOS_21);
    expect([...CODIGOS_DOS_21]).toEqual(antes);
  });

  it('o tom cicla pela paleta e cobre os 21 sem estourar', () => {
    expect(TONS_VITRINE).toHaveLength(6);
    for (let i = 0; i < exibidos.length; i += 1) {
      expect(TONS_VITRINE).toContain(tomDoInstrumento(i));
    }
    expect(tomDoInstrumento(0)).toBe(tomDoInstrumento(TONS_VITRINE.length));
    // determinístico: mesma posição, mesmo tom
    expect(tomDoInstrumento(7)).toBe(tomDoInstrumento(7));
  });
});
