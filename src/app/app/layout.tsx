import type { ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  temAcessoCorrigeFacil,
  type ClienteDeAcesso,
} from './corrigefacil/access';
import { AppShell } from './AppShell';

// Server Component: resolve no servidor os acessos que a SIDEBAR precisa e
// passa ao AppShell (client).
//
// has_doc_studio_access decide o trilho fino: ele só se aplica quando o
// usuário TEM acesso ao Doc Studio (ferramenta aberta); na tela de venda (sem
// acesso) e nas demais rotas a sidebar fica cheia.
//
// has_corrigefacil_access decide se o CorrigeFácil APARECE no menu. O módulo
// está funcional — 21 instrumentos publicados e avaliações sendo salvas — e
// até aqui só se chegava a ele por URL direta. Quem tem direito passa a ter
// descoberta persistente; quem não tem não vê um item que levaria à tela de
// venda de um produto ainda sem checkout. A regra NÃO é reimplementada aqui:
// é a mesma `temAcessoCorrigeFacil` que as páginas usam, e a decisão continua
// morando em has_corrigefacil_access, no banco.
//
// Aparecer no menu NÃO é a autorização: o gate real segue no Server Component
// de cada rota do módulo. Esconder o item é cosmético, e é fail-closed.
//
// As duas resoluções vão em paralelo para não somar latência em série.
export default async function AppLayout({ children }: { children: ReactNode }) {
  let hasDocStudioAccess = false;
  let hasCorrigeFacilAccess = false;

  try {
    const supabase = await createClient();

    const docStudio = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_access_status')
        .select('has_doc_studio_access')
        .eq('user_id', user.id)
        .single();
      return error ? false : Boolean(data?.has_doc_studio_access);
    };

    [hasDocStudioAccess, hasCorrigeFacilAccess] = await Promise.all([
      docStudio(),
      temAcessoCorrigeFacil(supabase as unknown as ClienteDeAcesso),
    ]);
  } catch (err) {
    // Re-lança sinais internos do Next (cookies em prerender, NEXT_REDIRECT);
    // erros reais mantêm os dois em false — sidebar cheia e sem o item.
    unstable_rethrow(err);
    hasDocStudioAccess = false;
    hasCorrigeFacilAccess = false;
  }

  return (
    <AppShell
      hasDocStudioAccess={hasDocStudioAccess}
      hasCorrigeFacilAccess={hasCorrigeFacilAccess}
    >
      {children}
    </AppShell>
  );
}
