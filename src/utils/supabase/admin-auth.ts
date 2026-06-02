import { createClient } from '@/utils/supabase/server';

export async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Usuário não autenticado', status: 401, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active' || profile.role !== 'admin') {
    return { error: 'Acesso negado. Privilégios de administrador necessários.', status: 403, user, profile: null };
  }

  return { error: null, status: 200, user, profile };
}
