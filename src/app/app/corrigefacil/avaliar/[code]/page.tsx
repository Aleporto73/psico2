import { createClient } from '@/utils/supabase/server';
import {
  temAcessoCorrigeFacil,
  temAcessoInstrumentoCorrigeFacil,
  type ClienteDeAcesso,
} from '../../access';
import { CorrigeFacilLocked } from '../../CorrigeFacilLocked';
import { AvaliarClient } from './AvaliarClient';

// Gate desta rota: DUAS perguntas, nesta ordem, e as duas moram no banco.
//
//   1. o direito completo do produto  -> temAcessoCorrigeFacil
//   2. o direito a ESTE instrumento   -> temAcessoInstrumentoCorrigeFacil
//
// A ordem é decisão de custo: o comprador — que é quem mais passa por aqui —
// responde na primeira e não paga a segunda consulta. A segunda só roda para
// quem não tem o produto.
//
// Por que as duas, e não só a segunda: a função por instrumento devolve true
// nos DOIS casos, e a tela precisa saber a diferença. `modoDemo` é o que
// separa quem comprou de quem entrou pela porta do instrumento gratuito, e
// ele nasce AQUI, no servidor, que é o único lugar que conhece os dois
// direitos. O Client Component não infere isso do código na URL.
//
// Fail-closed preservado em todos os caminhos: sem usuário, erro de RPC,
// função ausente no banco, null ou qualquer valor que não seja exatamente
// `true` cai em CorrigeFacilLocked. Não existe atalho por código de
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

  // Comprador: entra por onde sempre entrou, em qualquer instrumento, e sem
  // nenhuma copy de demonstração. Para ele o FDT é só mais um dos 21.
  if (await temAcessoCorrigeFacil(cliente)) {
    return <AvaliarClient code={instrumento} modoDemo={false} />;
  }

  // Sem o produto, a pergunta passa a ser sobre o instrumento pedido. Quem
  // responde é o banco; aqui só se obedece.
  if (!(await temAcessoInstrumentoCorrigeFacil(cliente, instrumento))) {
    return <CorrigeFacilLocked />;
  }

  return <AvaliarClient code={instrumento} modoDemo />;
}
