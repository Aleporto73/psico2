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

/** Direito comercial de usar o CorrigeFácil.
 *
 *  FAIL-CLOSED em todos os caminhos: sem usuário, erro de RPC, função ausente
 *  no banco, `null`, ou qualquer coisa que não seja exatamente `true` devolve
 *  false. É deliberado que a comparação seja estrita — um `data` truthy
 *  inesperado (string, objeto) não pode virar acesso.
 *
 *  A REGRA não mora aqui: mora em has_corrigefacil_access, no banco, que sabe
 *  de compra, status de pagamento e perfil bloqueado. Este módulo pergunta e
 *  obedece. Nada de consultar `purchases` direto — duplicar a regra no
 *  frontend é como ela se perde. */
export async function temAcessoCorrigeFacil(
  supabase: ClienteDeAcesso,
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase.rpc(RPC_ACESSO, {
      user_uuid: user.id,
    });

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
