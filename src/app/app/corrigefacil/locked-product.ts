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
/** Duas coisas saíram daqui, nesta ordem:
 *
 *  1. A COMPARAÇÃO entre aplicações, que não está implementada — e este é
 *     justamente o texto exibido quando o catálogo está fora do ar, a hora
 *     em que menos se pode prometer tela inexistente.
 *  2. O "no lugar das planilhas". As planilhas continuam sendo produto do
 *     ecossistema; o CorrigeFácil não as substitui, soma a elas. Vender um
 *     produto da casa depreciando outro produto da casa não é
 *     posicionamento, é canibalização. */
export const DESCRICAO_FALLBACK =
  'Correção digital de instrumentos psicométricos dentro do ecossistema ' +
  'PsicoPlanilhas, com resultados organizados e avaliações salvas.';

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

// ── Vitrine de instrumentos ────────────────────────────────────────────
//
// A LISTA em si não mora aqui: ela vem de CODIGOS_DOS_21, no registro
// visual. Duplicar os códigos numa constante desta tela criaria uma
// segunda fonte, que envelheceria em silêncio no dia em que o vigésimo
// segundo instrumento entrasse. O que mora aqui é só a APRESENTAÇÃO —
// ordem e cor —, que é o que a tela de venda decide.

/** Tons pastéis da paleta do PsicoPlanilhas usados nos badges.
 *
 *  Ciclam por índice e são DECORATIVOS: não classificam o instrumento,
 *  não agrupam nada e não carregam informação. O código completo está
 *  sempre escrito dentro do badge — nada depende da cor para ser lido. */
export const TONS_VITRINE = [
  'bg-pp-block-lilac',
  'bg-pp-block-mint',
  'bg-pp-block-cream',
  'bg-pp-block-coral',
  'bg-pp-block-pink',
  'bg-pp-block-lime',
] as const;

export function tomDoInstrumento(indice: number): string {
  return TONS_VITRINE[indice % TONS_VITRINE.length];
}

/** Ordem alfabética para exibição, resolvida em tempo de renderização.
 *
 *  A ordem do registro visual é por FAMÍLIA de gráfico (score_band,
 *  standardized_profile…), que é a leitura certa lá e a errada aqui:
 *  quem procura "o meu instrumento está na lista?" varre alfabeticamente.
 *  Copiar a lista reordenada à mão criaria a segunda fonte que o bloco
 *  acima evita — por isso ordena-se a fonte soberana, não se reescreve. */
export function ordenarInstrumentos(codigos: readonly string[]): string[] {
  return [...codigos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ── Metadados de APRESENTAÇÃO da vitrine ───────────────────────────────
//
// Tudo abaixo é comercial e só existe para o comprador ler. Nada aqui
// alcança motor de cálculo, gráficos, normas, chaves do catálogo ou
// qualquer referência interna: os mapas são indexados PELO código
// técnico, e o código técnico continua sendo o do registro.
//
// Os mapas guardam só o DESVIO do padrão. Instrumento sem entrada é o
// caso comum — rótulo igual ao código, sem selo —, então a ausência de
// linha aqui não é esquecimento, é a regra.

/** Rótulo exibido quando ele difere do código técnico.
 *
 *  TRACO-ANSIEDADE continua sendo TRACO-ANSIEDADE em graph-config, no
 *  acervo, na Edge e em toda referência interna. O que muda é só o que
 *  aparece no badge: escrever o código cru numa página de venda faz o
 *  produto parecer inacabado. */
const ROTULOS: Record<string, string> = {
  'TRACO-ANSIEDADE': 'Traço - Ansiedade',
};

/** Selo comercial do badge.
 *
 *  `novo` NÃO diz que o instrumento é recente — vários são clássicos com
 *  décadas de uso. Diz que ele é novidade NO CATÁLOGO PsicoPlanilhas, e a
 *  legenda ao lado da vitrine explica isso em palavras, porque um selo
 *  sozinho seria lido como "instrumento novo".
 *
 *  `brasil` é o BPA-2: as planilhas trazem a referência São Paulo, e o
 *  CorrigeFácil acrescenta a referência Brasil. É ampliação, não troca —
 *  a versão São Paulo continua valendo onde já está. */
export type SeloVitrine = 'novo' | 'brasil';

const SELOS: Record<string, SeloVitrine> = {
  'BAYLEY-III': 'novo',
  'C-TRF_1.5-5': 'novo',
  CONFIAS: 'novo',
  'DASS-21': 'novo',
  'EPQ-J': 'novo',
  'ERA-A': 'novo',
  'ERA-F': 'novo',
  ETPC: 'novo',
  'SCARED-C': 'novo',
  TDF: 'novo',
  'BPA-2': 'brasil',
};

export const TEXTO_SELO: Record<SeloVitrine, string> = {
  novo: 'Novo',
  brasil: 'Brasil',
};

export type ItemVitrine = {
  /** Código técnico. É a chave, e é o que liga ao registro. */
  codigo: string;
  /** O que o comprador lê. Igual ao código, salvo exceção em ROTULOS. */
  rotulo: string;
  selo: SeloVitrine | null;
  tom: string;
};

/** Fonte soberana + apresentação -> o que a vitrine desenha.
 *
 *  Recebe os códigos em vez de importar CODIGOS_DOS_21 aqui para manter
 *  este módulo puro e testável sem arrastar o registro visual junto. */
export function montarVitrine(codigos: readonly string[]): ItemVitrine[] {
  return ordenarInstrumentos(codigos).map((codigo, i) => ({
    codigo,
    rotulo: ROTULOS[codigo] ?? codigo,
    selo: SELOS[codigo] ?? null,
    tom: tomDoInstrumento(i),
  }));
}

/** Expostos para o teste provar que a APRESENTAÇÃO não inventou
 *  instrumento: todo código com rótulo ou selo precisa existir na fonte
 *  soberana. Um erro de digitação aqui viraria, sem isto, um selo que
 *  simplesmente nunca aparece — falha silenciosa. */
export const CODIGOS_COM_ROTULO = Object.keys(ROTULOS);
export const CODIGOS_COM_SELO = Object.keys(SELOS);
