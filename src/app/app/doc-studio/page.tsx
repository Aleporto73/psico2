import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { DocStudioClient } from './DocStudioClient';
import { DocStudioLocked } from './DocStudioLocked';

// Server Component: trava REAL de acesso do Doc Studio. Fail-closed — qualquer
// erro na consulta OU acesso não confirmado bloqueia a ferramenta e mostra a
// tela de venda. Só acesso confirmado monta o DocStudioClient (e, portanto, o
// useDocStudioState). Espelha o padrão do root em src/app/page.tsx.
export default async function DocStudioPage() {
  let hasAccess = false;

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
        hasAccess = Boolean(data?.has_doc_studio_access);
      }
    }
  } catch (err) {
    // Re-lança sinais internos do Next (DYNAMIC_SERVER_USAGE de cookies em
    // prerender, NEXT_REDIRECT). Erros reais (Supabase/network) mantêm
    // hasAccess = false — fail-closed.
    unstable_rethrow(err);
    hasAccess = false;
  }

  if (!hasAccess) {
    return <DocStudioLocked />;
  }

  return <DocStudioClient />;
}
