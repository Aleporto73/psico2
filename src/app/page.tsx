import { redirect, unstable_rethrow } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Root da aplicação. Não renderiza UI — apenas redireciona:
 *   - não autenticado            → /login
 *   - autenticado admin (ativo)  → /admin
 *   - autenticado customer (ativo) → /app
 * Em qualquer erro ou estado inconsistente, cai em /login (fallback seguro).
 *
 * A distinção admin/customer espelha a convenção do middleware (updateSession).
 */
export default async function Home() {
  let target = '/login';

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profile && profile.status === 'active') {
        target = profile.role === 'admin' ? '/admin' : '/app';
      }
    }
  } catch (err) {
    // Re-lança sinais internos do Next (DYNAMIC_SERVER_USAGE de cookies no prerender,
    // NEXT_REDIRECT, etc) para não engolir o controle de fluxo. Só erros reais
    // (Supabase/network) seguem para o fallback abaixo.
    unstable_rethrow(err);
    console.error('Error resolving root redirect:', err);
    target = '/login';
  }

  // redirect() lança NEXT_REDIRECT internamente — precisa ficar FORA do try/catch.
  redirect(target);
}
