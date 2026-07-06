import 'server-only';
import { randomInt } from 'crypto';
import type { createAdminClient } from '@/utils/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

// Sem caracteres ambíguos (0/O, 1/l/I) — a senha é ditada por telefone/WhatsApp.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generateTemporaryPassword(length = 10) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

/**
 * Define uma senha temporária aleatória no Auth, ativa o perfil e devolve a
 * senha em claro para ser exibida ao cliente. NÃO faz autorização — cada
 * chamador aplica a sua: admin gate no /admin/suporte; flag de migração +
 * gate de activation_status no autoatendimento. Lança em caso de erro.
 */
export async function setTemporaryPassword(supabase: AdminClient, userId: string): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
  });
  if (authErr) {
    throw new Error(`Erro ao atualizar senha no Auth: ${authErr.message}`);
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      activation_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (profileErr) {
    throw new Error(`Senha alterada, mas houve erro ao ativar profile: ${profileErr.message}`);
  }

  return temporaryPassword;
}
