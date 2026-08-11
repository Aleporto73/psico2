// Modelo de exibição da tela bloqueada, separado do componente para poder ser
// testado sem renderizar (o Vitest deste repositório roda em `node`, sem DOM).

export const SLUG_CORRIGEFACIL = 'corrigefacil';

/** Colunas de `products_public` que a tela usa. A view é a sanitizada — não
 *  tem access_url — e é a única fonte consultada aqui. */
export type ProdutoBloqueado = {
  name: string | null;
  description: string | null;
  price: number | null;
  billing_type: string | null;
  checkout_url: string | null;
};

export const NOME_FALLBACK = 'CorrigeFácil';
export const DESCRICAO_FALLBACK =
  'Correção, registro e comparação de instrumentos psicométricos dentro do ' +
  'PsicoPlanilhas, no lugar das planilhas.';

export type ModoCta = 'checkout' | 'em_preparacao';

export type VisaoBloqueada = {
  nome: string;
  descricao: string;
  precoLabel: string | null;
  pagamentoUnico: boolean;
  modoCta: ModoCta;
  checkoutUrl: string | null;
};

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/** Produto (ou a ausência dele) -> o que a tela mostra.
 *
 *  Regra do CTA, diferente da do Doc Studio de propósito: **sem
 *  `checkout_url` real, não existe botão de compra.** O Doc Studio tem uma
 *  URL de fallback embutida; aqui isso seria inventar um checkout que
 *  ninguém confirmou, e mandar o profissional para uma página de pagamento
 *  errada é pior do que não ter botão. `access_url` também não serve de
 *  checkout — são coisas diferentes.
 *
 *  Produto ausente ou consulta com erro cai no fallback seguro para nome e
 *  descrição, mas NUNCA inventa preço. O valor exibido vem somente do catálogo.
 */
export function montarVisaoBloqueada(
  produto: ProdutoBloqueado | null,
): VisaoBloqueada {
  const checkoutUrl = produto?.checkout_url?.trim() || null;
  const precoLabel =
    typeof produto?.price === 'number' ? formatarPreco(produto.price) : null;

  return {
    nome: produto?.name?.trim() || NOME_FALLBACK,
    descricao: produto?.description?.trim() || DESCRICAO_FALLBACK,
    precoLabel,
    // `one_time` é o que o catálogo usa; na dúvida (produto ausente) o
    // produto É de pagamento único, então o rótulo vale.
    pagamentoUnico: (produto?.billing_type ?? 'one_time') === 'one_time',
    modoCta: checkoutUrl ? 'checkout' : 'em_preparacao',
    checkoutUrl,
  };
}
