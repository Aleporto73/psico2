import type { ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { AppShell } from './AppShell';

// Server Component: resolve no servidor o acesso que a SIDEBAR precisa e
// passa ao AppShell (client).
//
// has_doc_studio_access decide o trilho fino: ele só se aplica quando o
// usuário TEM acesso ao Doc Studio (ferramenta aberta); na tela de venda (sem
// acesso) e nas demais rotas a sidebar fica cheia.
//
// O CorrigeFácil NÃO é resolvido aqui. Ele aparece no menu para todo usuário
// autenticado, como Relatório Pró e Psico Flow, porque /app/corrigefacil tem
// página interna de venda para quem ainda não comprou — não sobrou decisão
// para o layout tomar, e uma consulta por requisição em TODAS as rotas de
// /app só para pintar um item de menu seria custo sem contrapartida.
//
// A autorização não mudou de lugar: o gate real continua no Server Component
// de cada rota do módulo, em `temAcessoCorrigeFacil`, fail-closed.
export default async function AppLayout({ children }: { children: ReactNode }) {
  let hasDocStudioAccess = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('user_access_status')
        .select('has_doc_studio_access')
        .eq('user_id', user.id)
        .single();
      hasDocStudioAccess = error ? false : Boolean(data?.has_doc_studio_access);
    }
  } catch (err) {
    // Re-lança sinais internos do Next (cookies em prerender, NEXT_REDIRECT);
    // erro real mantém o acesso em false — sidebar cheia.
    unstable_rethrow(err);
    hasDocStudioAccess = false;
  }

  return <AppShell hasDocStudioAccess={hasDocStudioAccess}>{children}</AppShell>;
}
