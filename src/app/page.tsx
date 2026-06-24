import { redirect } from 'next/navigation';
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
    console.error('Error resolving root redirect:', err);
    target = '/login';
  }

  // redirect() lança NEXT_REDIRECT internamente — precisa ficar FORA do try/catch.
  redirect(target);
}
