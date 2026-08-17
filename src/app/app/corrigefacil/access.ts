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

/** O que o banco respondeu sobre um direito.
 *
 *    'permitido'  o banco respondeu, e a resposta é sim
 *    'negado'     o banco respondeu, e a resposta é não
 *    'erro'       o banco NÃO respondeu
 *
 *  A distinção entre 'negado' e 'erro' existe por um motivo caro. 'negado' é
 *  INFORMAÇÃO — o usuário não tem aquele direito, e o produto pode oferecer
 *  outro caminho a partir disso. 'erro' é AUSÊNCIA de informação, e tratá-lo
 *  como negativa faz o sistema decidir sobre um fato que ele não conhece.
 *
 *  O caso concreto que obrigou a separação está em `avaliar/[code]/page.tsx`:
 *  a função por instrumento também devolve true para quem tem o produto, então
 *  um erro transitório na pergunta do produto faria um COMPRADOR passar pela
 *  segunda porta e ser classificado como demonstração. Ele veria oferta para
 *  comprar o que já comprou, e perderia o painel de relatórios. */
export type RespostaDeAcesso = 'permitido' | 'negado' | 'erro';

/** O núcleo das duas perguntas: sessão, RPC e comparação estrita.
 *
 *  Só `true` é 'permitido'. `false`, `null` e qualquer truthy inesperado
 *  (string, objeto) são 'negado' — a comparação é estrita de propósito.
 *  Sessão ausente é 'negado', não 'erro': a pergunta foi respondida, e a
 *  resposta é que não há a quem conceder.
 *
 *  Está separado porque as duas perguntas precisam do MESMO rigor. Duas
 *  cópias do bloco try/catch envelheceriam em ritmos diferentes, e a que
 *  ficasse para trás seria justamente a que abre o instrumento gratuito. */
async function perguntarAoBanco(
  supabase: ClienteDeAcesso,
  fn: string,
  argumentos: (userId: string) => Record<string, unknown>,
): Promise<RespostaDeAcesso> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 'negado';
    }

    const { data, error } = await supabase.rpc(fn, argumentos(user.id));

    if (error) {
      return 'erro';
    }

    return data === true ? 'permitido' : 'negado';
  } catch (err) {
    // Sinais internos do Next (NEXT_REDIRECT, DYNAMIC_SERVER_USAGE de cookies
    // em prerender) precisam continuar subindo. Erro de verdade — Supabase
    // fora, rede caída — é ausência de resposta, e quem chamou decide o que
    // fazer com isso. Todo chamador de hoje fecha a porta.
    unstable_rethrow(err);
    return 'erro';
  }
}

/** Direito comercial de usar o CorrigeFácil — o produto INTEIRO, com a
 *  resposta INTEIRA: permitido, negado ou sem resposta.
 *
 *  A REGRA não mora aqui: mora em has_corrigefacil_access, no banco, que sabe
 *  de compra, status de pagamento e perfil bloqueado. Este módulo pergunta e
 *  obedece. Nada de consultar `purchases` direto — duplicar a regra no
 *  frontend é como ela se perde.
 *
 *  Quem só precisa de sim/não usa `temAcessoCorrigeFacil`, logo abaixo. Esta
 *  existe para o único lugar que precisa distinguir 'negado' de 'erro'. */
export async function consultarAcessoCorrigeFacil(
  supabase: ClienteDeAcesso,
): Promise<RespostaDeAcesso> {
  return perguntarAoBanco(supabase, RPC_ACESSO, (userId) => ({
    user_uuid: userId,
  }));
}

/** O mesmo direito, reduzido a sim/não e FAIL-CLOSED: só 'permitido' libera.
 *
 *  É o contrato que a página raiz e todo consumidor antigo sempre tiveram, e
 *  ele não muda. O tri-state fica contido em quem precisa dele — espalhá-lo
 *  pelo sistema faria toda tela ter de decidir o que fazer com 'erro', e a
 *  resposta certa para quase todas é a mesma: fechar a porta. */
export async function temAcessoCorrigeFacil(
  supabase: ClienteDeAcesso,
): Promise<boolean> {
  return (await consultarAcessoCorrigeFacil(supabase)) === 'permitido';
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
 *  inteiro — que é a pergunta ERRADA para esta porta.
 *
 *  Boolean e FAIL-CLOSED, sem tri-state: esta é a ÚLTIMA porta do caminho
 *  gratuito, e ali 'negado' e 'erro' levam ao mesmo lugar — a página de
 *  venda. Devolver três estados obrigaria o chamador a escrever dois ramos
 *  que fazem a mesma coisa. */
export async function temAcessoInstrumentoCorrigeFacil(
  supabase: ClienteDeAcesso,
  code: string,
): Promise<boolean> {
  const limpo = (code ?? '').trim();
  if (!limpo) {
    return false;
  }

  const resposta = await perguntarAoBanco(
    supabase,
    RPC_ACESSO_INSTRUMENTO,
    (userId) => ({ user_uuid: userId, instrument_code: limpo }),
  );

  return resposta === 'permitido';
}
