import { createClient } from '@/utils/supabase/server';
import { temAcessoCorrigeFacil, type ClienteDeAcesso } from '../../access';
import { CorrigeFacilLocked } from '../../CorrigeFacilLocked';
import { AvaliarClient } from './AvaliarClient';

// Mesmo gate comercial do catálogo, reutilizado sem duplicação:
// `temAcessoCorrigeFacil` é o único lugar onde a decisão mora. Fail-closed,
// comparação estrita com true, unstable_rethrow dentro do helper, e nenhuma
// consulta a `purchases`.
//
// A verificação continua por rota, não no layout: uma consulta global
// cobraria de todas as páginas de /app para atender duas.
//
// Sem direito, o formulário NÃO é montado e nenhuma chamada à Edge sai — o
// AvaliarClient sequer entra na árvore.
export default async function AvaliarPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();
  const temAcesso = await temAcessoCorrigeFacil(
    supabase as unknown as ClienteDeAcesso,
  );

  if (!temAcesso) {
    return <CorrigeFacilLocked />;
  }

  return <AvaliarClient code={decodeURIComponent(code)} />;
}
