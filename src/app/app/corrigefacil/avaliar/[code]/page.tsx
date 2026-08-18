import { createClient } from '@/utils/supabase/server';
import {
  consultarAcessoCorrigeFacil,
  temAcessoInstrumentoCorrigeFacil,
  type ClienteDeAcesso,
} from '../../access';
import { CorrigeFacilLocked } from '../../CorrigeFacilLocked';
import { AvaliarClient } from './AvaliarClient';

// Gate desta rota: DUAS perguntas, nesta ordem, e as duas moram no banco.
//
//   1. o direito completo do produto  -> consultarAcessoCorrigeFacil
//   2. o direito a ESTE instrumento   -> temAcessoInstrumentoCorrigeFacil
//
// A ordem é decisão de custo: o comprador — que é quem mais passa por aqui —
// responde na primeira e não paga a segunda consulta. A segunda só roda para
// quem teve o produto NEGADO.
//
// Por que as duas, e não só a segunda: a função por instrumento devolve true
// nos DOIS casos, e a tela precisa saber a diferença. `modoDemo` é o que
// separa quem comprou de quem entrou pela porta do instrumento gratuito, e
// ele nasce AQUI, no servidor, que é o único lugar que conhece os dois
// direitos. O Client Component não infere isso do código na URL.
//
// POR QUE A PRIMEIRA PERGUNTA É TRI-STATE, e esta é a parte que não pode se
// perder: um booleano fail-closed colapsaria "não tem o produto" e "não deu
// para saber" no mesmo `false`. Como a função por instrumento TAMBÉM devolve
// true para quem tem o produto, um erro transitório na primeira pergunta
// mandaria o COMPRADOR para a segunda porta, que o deixaria passar — e ele
// entraria como demonstração: sem o painel de relatórios, e com uma oferta
// para comprar o que já comprou. 'erro' fecha a porta aqui, antes disso.
//
// Fail-closed preservado em todos os caminhos: sem usuário, erro de RPC,
// função ausente no banco, null ou qualquer valor que não seja exatamente
// `true` termina em CorrigeFacilLocked. Não existe atalho por código de
// instrumento — nenhum `code === 'FDT'` decide acesso aqui nem em lugar
// nenhum do frontend.
//
// Sem direito, o formulário NÃO é montado e nenhuma chamada à Edge sai — o
// AvaliarClient sequer entra na árvore.
//
// A verificação continua por rota, não no layout: uma consulta global
// cobraria de todas as páginas de /app para atender duas.
export default async function AvaliarPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const instrumento = decodeURIComponent(code);

  const supabase = await createClient();
  const cliente = supabase as unknown as ClienteDeAcesso;

  const produto = await consultarAcessoCorrigeFacil(cliente);

  // Comprador: entra por onde sempre entrou, em qualquer instrumento, e sem
  // nenhuma copy de demonstração. Para ele o FDT é só mais um dos 21.
  if (produto === 'permitido') {
    return <AvaliarClient code={instrumento} modoDemo={false} />;
  }

  // O banco não respondeu. Não se pergunta de novo por outro caminho: a
  // segunda porta admitiria o comprador como demonstração. Sem resposta, a
  // porta fecha.
  if (produto === 'erro') {
    return <CorrigeFacilLocked />;
  }

  // Produto NEGADO — resposta de verdade, e é dela que nasce a exceção. A
  // pergunta passa a ser sobre o instrumento pedido; quem responde é o
  // banco, e aqui só se obedece.
  if (!(await temAcessoInstrumentoCorrigeFacil(cliente, instrumento))) {
    return <CorrigeFacilLocked />;
  }

  return <AvaliarClient code={instrumento} modoDemo />;
}
