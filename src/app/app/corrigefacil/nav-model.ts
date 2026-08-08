// Navegação interna do CorrigeFácil. Puro, para ser testado sem DOM (o Vitest
// deste repositório roda em `node`).
//
// POR QUE ISTO EXISTE
//
// O módulo tem DOIS espaços funcionais — aplicar um instrumento e consultar o
// que já foi salvo — e até aqui o segundo era um link de texto pequeno abaixo
// do subtítulo do catálogo. Quem terminava uma avaliação e voltava ao catálogo
// não encontrava as salvas: elas existiam na rota e não existiam na percepção.
//
// A resposta é estrutural: as duas abas ficam no mesmo lugar em TODAS as telas
// do módulo, com a atual marcada. Assim, quem está no meio de um protocolo
// também sabe onde está e para onde pode ir.
import { ROTA_HISTORICO } from './catalog-view';

export const ROTA_CATALOGO = '/app/corrigefacil';

export type AbaId = 'instrumentos' | 'avaliacoes';

export type Aba = {
  id: AbaId;
  rotulo: string;
  href: string;
};

/** As duas abas, na ordem em que aparecem. É a ordem do fluxo: primeiro se
 *  aplica, depois se consulta. */
export const ABAS: readonly Aba[] = [
  { id: 'instrumentos', rotulo: 'Instrumentos', href: ROTA_CATALOGO },
  { id: 'avaliacoes', rotulo: 'Avaliações salvas', href: ROTA_HISTORICO },
] as const;

/** Segmentos do caminho, sem vazios. Tolera barra final e caminho com query
 *  já removida pelo `usePathname` do Next. */
function segmentos(pathname: string): string[] {
  return (pathname ?? '').split('/').filter(Boolean);
}

/** Qual aba está ativa para um caminho.
 *
 *  A comparação é por SEGMENTO, não por prefixo de string: `/app/corrigefacil/
 *  avaliar/CES-D` começa com "avalia" igual a `/app/corrigefacil/avaliacoes`, e
 *  um `startsWith` marcaria a aba errada durante a aplicação inteira.
 *
 *  Fora do módulo devolve null: nada fica marcado por engano. */
export function abaAtiva(pathname: string): AbaId | null {
  const partes = segmentos(pathname);
  if (partes[0] !== 'app' || partes[1] !== 'corrigefacil') return null;
  return partes[2] === 'avaliacoes' ? 'avaliacoes' : 'instrumentos';
}

/** Aba + estado, pronto para a lista da barra. */
export function montarAbas(pathname: string): (Aba & { ativa: boolean })[] {
  const atual = abaAtiva(pathname);
  return ABAS.map((aba) => ({ ...aba, ativa: aba.id === atual }));
}
