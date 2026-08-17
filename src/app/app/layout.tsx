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
// O CorrigeFácil NÃO é resolvido aqui, e é de propósito. Ele aparece no menu
// para todo usuário autenticado, então não há mais nada a decidir — e manter
// uma consulta a has_corrigefacil_access em TODAS as páginas de /app apenas
// para pintar a sidebar era custo sem retorno. O direito continua sendo
// verificado onde importa: no Server Component de cada rota do módulo, com o
// mesmo helper único. Aparecer no menu nunca foi a autorização.
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
