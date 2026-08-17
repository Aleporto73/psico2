import { unstable_rethrow } from 'next/navigation';

/** O mínimo que este módulo precisa de um client Supabase. Tipado por
 *  estrutura para o teste poder passar um dublê sem arrastar o tipo inteiro
 *  do SDK. */
export type ClienteDeAcesso = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
};

export const RPC_ACESSO = 'has_corrigefacil_access';

/** Direito de aplicar UM instrumento. Composta no banco: devolve o direito
 *  completo OU a exceção do instrumento liberado sem compra.
 *
 *  Com `instrument_code` nulo ela devolve exatamente `has_corrigefacil_access`
 *  — mas este módulo nunca a chama assim. Quem quer o direito do produto
 *  chama `temAcessoCorrigeFacil`, que é a pergunta com esse nome. */
export const RPC_ACESSO_INSTRUMENTO = 'can_access_corrigefacil_instrument';

/** O núcleo das duas perguntas: sessão, RPC e comparação estrita.
 *
 *  FAIL-CLOSED em todos os caminhos: sem usuário, erro de RPC, função ausente
 *  no banco, `null`, ou qualquer coisa que não seja exatamente `true` devolve
 *  false. É deliberado que a comparação seja estrita — um `data` truthy
 *  inesperado (string, objeto) não pode virar acesso.
 *
 *  Está separado porque as duas perguntas precisam do MESMO rigor. Duas
 *  cópias do bloco try/catch envelheceriam em ritmos diferentes, e a que
 *  ficasse para trás seria justamente a que abre o instrumento gratuito. */
async function perguntarAoBanco(
  supabase: ClienteDeAcesso,
  fn: string,
  argumentos: (userId: string) => Record<string, unknown>,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase.rpc(fn, argumentos(user.id));

    if (error) {
      return false;
    }

    return data === true;
  } catch (err) {
    // Sinais internos do Next (NEXT_REDIRECT, DYNAMIC_SERVER_USAGE de cookies
    // em prerender) precisam continuar subindo. Erro de verdade — Supabase
    // fora, rede caída — vira acesso negado.
    unstable_rethrow(err);
    return false;
  }
}

/** Direito comercial de usar o CorrigeFácil — o produto INTEIRO.
 *
 *  A REGRA não mora aqui: mora em has_corrigefacil_access, no banco, que sabe
 *  de compra, status de pagamento e perfil bloqueado. Este módulo pergunta e
 *  obedece. Nada de consultar `purchases` direto — duplicar a regra no
 *  frontend é como ela se perde. */
export async function temAcessoCorrigeFacil(
  supabase: ClienteDeAcesso,
): Promise<boolean> {
  return perguntarAoBanco(supabase, RPC_ACESSO, (userId) => ({
    user_uuid: userId,
  }));
}

/** Direito de aplicar UM instrumento, pelo código.
 *
 *  Este módulo NÃO sabe — e não pode saber — qual instrumento é gratuito.
 *  Isso é `instruments.is_free_demo`, no banco, e um literal aqui seria uma
 *  segunda política comercial vivendo longe da primeira. Nada de consultar
 *  `instruments`, `purchases` ou `products` daqui.
 *
 *  Código vazio devolve false sem consultar: sem instrumento não há o que
 *  autorizar, e mandar null ao banco faria a função responder pelo produto
 *  inteiro — que é a pergunta ERRADA para esta porta. */
export async function temAcessoInstrumentoCorrigeFacil(
  supabase: ClienteDeAcesso,
  code: string,
): Promise<boolean> {
  const limpo = (code ?? '').trim();
  if (!limpo) {
    return false;
  }

  return perguntarAoBanco(supabase, RPC_ACESSO_INSTRUMENTO, (userId) => ({
    user_uuid: userId,
    instrument_code: limpo,
  }));
}
