// =====================================================================
// A DECISÃO DE QUAL OFERTA O PAINEL MOSTRA.
//
// Módulo puro, no mesmo espírito de `catalog-view.ts` e `nav-model.ts`: o
// painel é um client component com hooks e não tem como ser renderizado nos
// testes deste repositório (não há jsdom nem renderer). Manter a decisão
// aqui é o que permite prová-la de verdade, caso a caso, em vez de conferir
// strings no meio do JSX.
//
// O que este módulo NÃO faz: autorizar. Ele só escolhe o que desenhar. A
// autoridade sobre a demonstração continua sendo
// `reserve_corrigefacil_free_demo_report`, no servidor, no momento da
// tentativa real — e ela revalida tudo do zero.
// =====================================================================

/** O que a RPC READ-ONLY de status pode responder. */
export type FreeDemoStatus =
  | 'available'
  | 'already_used'
  | 'in_progress'
  | 'use_subscription'
  | 'ineligible';

/**
 * O estado da demonstração no painel. Além das respostas da RPC, dois
 * estados que só existem no cliente:
 *
 * `checking`      — a consulta está em voo.
 * `indeterminado` — a geração respondeu 503: o backend não conseguiu
 *                   confirmar se o relatório foi concluído. Não é sucesso
 *                   nem fracasso, e é o único estado em que a tela não pode
 *                   convidar a um novo POST.
 */
export type FreeDemoState =
  | 'idle'
  | 'checking'
  | 'indeterminado'
  | FreeDemoStatus
  | 'error';

/** O mesmo `AccessState` do painel: o gate do Relatório Pró pago. */
export type AccessState = 'idle' | 'checking' | 'active' | 'inactive' | 'error';

/** O bloco que a área de oferta renderiza. Mutuamente exclusivos. */
export type OfertaModo =
  | 'padrao'
  | 'composer'
  | 'checkout'
  | 'demo_disponivel'
  | 'demo_andamento'
  | 'demo_indeterminado'
  | 'demo_erro'
  | 'demo_verificando';

const STATUS_CONHECIDOS: ReadonlySet<string> = new Set<FreeDemoStatus>([
  'available',
  'already_used',
  'in_progress',
  'use_subscription',
  'ineligible',
]);

/**
 * Traduz a resposta da RPC para o estado da tela.
 *
 * FAIL CLOSED: qualquer coisa que não seja um dos cinco valores conhecidos
 * — null, número, um valor novo criado no futuro — vira `error`, e `error`
 * nunca promete demonstração. O contrário (assumir `available` no escuro)
 * seria anunciar um relatório grátis que a reserva depois recusa.
 */
export function freeDemoStateFromRpc(bruto: unknown): FreeDemoState {
  if (typeof bruto === 'string' && STATUS_CONHECIDOS.has(bruto)) {
    return bruto as FreeDemoStatus;
  }
  return 'error';
}

/**
 * Qual bloco desenhar.
 *
 * A regra que ordena tudo: **fora do contexto da avaliação salva, ou com
 * qualquer coisa diferente de `inactive` no gate pago, o painel se comporta
 * exatamente como antes deste PR.** A demonstração é um ramo novo que só
 * abre quando o gate já disse "sem Pró" e a tela é a do segundo contato.
 */
export function decidirOferta(args: {
  access: AccessState;
  composerOpen: boolean;
  freeDemoContext: boolean;
  demo: FreeDemoState;
}): OfertaModo {
  const { access, composerOpen, freeDemoContext, demo } = args;

  // O compositor é o MESMO nos dois caminhos: a demonstração mostra o
  // produto real, com os quatro destinos e as observações adicionais. Um
  // compositor reduzido demonstraria um produto que não existe.
  const podeComporDemo = freeDemoContext && demo === 'available';
  if (composerOpen && (access === 'active' || podeComporDemo)) {
    return 'composer';
  }

  // Assinante ativo, e também `idle`/`checking`/`error` do gate pago: nada
  // muda. Quem paga nunca vê copy de demonstração.
  if (access !== 'inactive') return 'padrao';

  // Sem Pró, mas fora da avaliação salva: a oferta paga de sempre.
  if (!freeDemoContext) return 'checkout';

  switch (demo) {
    case 'available':
      return 'demo_disponivel';
    case 'in_progress':
      return 'demo_andamento';
    case 'indeterminado':
      return 'demo_indeterminado';
    case 'checking':
      return 'demo_verificando';
    case 'error':
      return 'demo_erro';
    // `already_used` e `ineligible` caem juntos na oferta paga, e é
    // proposital: a tela não conta ao usuário POR QUE ele não pode. Dizer
    // "instrumento não elegível" ou "perfil bloqueado" transformaria a UX
    // num oráculo de autorização.
    //
    // `use_subscription` aqui é contradição (o gate disse 403 e a RPC diz
    // que há Pró): fail closed, sem promessa de demonstração.
    default:
      return 'checkout';
  }
}

/** Qual título o card mostra. O corpo é escolhido por `decidirOferta`. */
export type CabecalhoModo =
  | 'padrao'
  | 'demo_disponivel'
  | 'demo_ja_usada'
  | 'demo_andamento';

/**
 * O cabeçalho segue o mesmo princípio do corpo: só muda quando o gate pago
 * já disse "sem Pró" E esta é a tela do segundo contato. Em qualquer outro
 * caso — inclusive para quem tem Pró — o título é o de sempre.
 */
export function decidirCabecalho(args: {
  access: AccessState;
  freeDemoContext: boolean;
  demo: FreeDemoState;
}): CabecalhoModo {
  const { access, freeDemoContext, demo } = args;

  if (access !== 'inactive' || !freeDemoContext) return 'padrao';

  switch (demo) {
    case 'available':
      return 'demo_disponivel';
    case 'already_used':
      return 'demo_ja_usada';
    case 'in_progress':
      return 'demo_andamento';
    default:
      return 'padrao';
  }
}

/**
 * O que fazer depois de uma tentativa de geração que NÃO deu 200.
 *
 * `indeterminado` — só o 503. O backend chegou a chamar a IA e não
 * conseguiu confirmar se a linha ficou `completed`. Ele pode ter concluído
 * o relatório. Reconsultar o status aqui poderia devolver `available` e a
 * tela convidaria a um segundo POST — gerando de novo algo que talvez já
 * esteja no histórico. A saída é mostrar a mensagem do backend e deixar o
 * profissional verificar.
 *
 * `reconsultar` — todo o resto (403, 409, 500, 502...). Aí o estado
 * comercial é conhecível: perguntar ao banco resolve, e a resposta reposiciona
 * a tela sozinha (`already_used`, `in_progress` ou `available` de volta,
 * quando o release devolveu a chance).
 *
 * Em nenhum dos dois casos há novo POST automático.
 */
export function acaoAposFalhaDaDemo(status: number): 'indeterminado' | 'reconsultar' {
  return status === 503 ? 'indeterminado' : 'reconsultar';
}

/**
 * O status disse `use_subscription` DEPOIS de o gate ter respondido 403.
 *
 * É contradição, e tem uma explicação provável: a assinatura foi ativada
 * entre as duas consultas. Mostrar checkout a quem acabou de comprar seria
 * o pior desfecho possível, então vale perguntar ao gate de novo.
 *
 * UMA vez. Nenhum outro estado repergunta, e a segunda resposta é final —
 * é isso que impede o laço.
 */
export function precisaReconsultarGate(demo: FreeDemoState): boolean {
  return demo === 'use_subscription';
}

/**
 * O que a demonstração vira quando a reconsulta NÃO confirmou Pró.
 *
 * `sem_acesso` — a contradição se resolve a favor do gate. `use_subscription`
 * cai na oferta paga, e não se inventa um Pró que o gate nega.
 * `erro` — fail closed: sem resposta, sem promessa.
 */
export function estadoAposReconsultaSemPro(
  acesso: 'sem_acesso' | 'erro',
): FreeDemoState {
  return acesso === 'erro' ? 'error' : 'use_subscription';
}

/**
 * Depois de verificar o status, vale recarregar a lista de relatórios?
 *
 * Só com a chance já usada — e o caso que importa é o 503: o backend chamou
 * a IA e não conseguiu confirmar a conclusão. Se ela aconteceu, o relatório
 * existe e precisa aparecer em "Relatórios desta avaliação" sem exigir
 * reload da página.
 *
 * Recarregar a lista é a ação SEGURA. Navegar para o relatório não seria:
 * `already_used` é vitalício por CONTA, e a chance pode ter sido gasta em
 * outra avaliação — a lista desta mostra o que é desta, e só.
 */
export function precisaRecarregarRelatorios(demo: FreeDemoState): boolean {
  return demo === 'already_used';
}

/**
 * A tela pode disparar a geração?
 *
 * Só com a demonstração `available`. `in_progress` e `indeterminado` são
 * justamente os estados em que um segundo POST duplicaria trabalho já em
 * curso — e o backend, que é quem decide de verdade, devolveria
 * `in_progress` de qualquer modo.
 */
export function podeGerarDemo(demo: FreeDemoState): boolean {
  return demo === 'available';
}
