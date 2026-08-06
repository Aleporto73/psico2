import { describe, expect, it } from 'vitest';
import {
  DESCRICAO_FALLBACK,
  montarVisaoBloqueada,
  NOME_FALLBACK,
  PRECO_FALLBACK,
  SLUG_CORRIGEFACIL,
  type ProdutoBloqueado,
} from '../locked-product';

const completo: ProdutoBloqueado = {
  name: 'CorrigeFácil',
  description: 'Correção de instrumentos dentro do sistema.',
  price: 47,
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
  });

  it('9) checkout_url null: sem link de compra, mesmo com o produto cadastrado', () => {
    const visao = montarVisaoBloqueada({ ...completo, checkout_url: null });

    expect(visao.modoCta).toBe('em_preparacao');
    expect(visao.checkoutUrl).toBeNull();
    // o produto existe, então nome e preço vêm dele
    expect(visao.nome).toBe('CorrigeFácil');
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

  it('11) preço real substitui o fallback', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 97 }).precoLabel).toContain('97');
    expect(montarVisaoBloqueada({ ...completo, price: null }).precoLabel).toContain(
      String(PRECO_FALLBACK),
    );
    expect(montarVisaoBloqueada(null).precoLabel).toContain(String(PRECO_FALLBACK));
  });

  it('11b) preço zero é preço real, não ausência', () => {
    expect(montarVisaoBloqueada({ ...completo, price: 0 }).precoLabel).toContain('0,00');
  });

  it('12) falha de consulta (produto nulo) NÃO libera conteúdo nem inventa checkout', () => {
    const visao = montarVisaoBloqueada(null);

    // nada que pareça um caminho de compra
    expect(visao.checkoutUrl).toBeNull();
    expect(visao.modoCta).not.toBe('checkout');
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
});
