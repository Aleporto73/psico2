import type { ReactNode } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { AppShell } from './AppShell';

// Server Component: resolve has_doc_studio_access no servidor e passa ao
// AppShell (client). Assim o trilho fino da sidebar só se aplica quando o
// usuário TEM acesso ao Doc Studio (ferramenta aberta); na tela de venda
// (sem acesso) e nas demais rotas a sidebar fica cheia. Sem query duplicada
// no cliente e sem flicker. Fail-closed: erro/sem usuário => sem colapso
// (sidebar cheia), espelhando o padrão de src/app/page.tsx e doc-studio/page.tsx.
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

      if (!error) {
        hasDocStudioAccess = Boolean(data?.has_doc_studio_access);
      }
    }
  } catch (err) {
    // Re-lança sinais internos do Next (cookies em prerender, NEXT_REDIRECT);
    // erros reais mantêm hasDocStudioAccess = false (sidebar cheia).
    unstable_rethrow(err);
    hasDocStudioAccess = false;
  }

  return <AppShell hasDocStudioAccess={hasDocStudioAccess}>{children}</AppShell>;
}
