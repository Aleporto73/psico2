import 'server-only';
import type { createAdminClient } from '@/utils/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Dispara o e-mail de primeiro acesso / definição de senha reusando o fluxo
 * nativo do Supabase (recovery) com redirecionamento para /definir-senha.
 *
 * Lança em caso de erro para que cada chamador decida a política de retry:
 * - /api/auth/ativar-acesso loga e segue (mantém o 200 da rota);
 * - o webhook de entitlement propaga para o catch (status 'failed' + HTTP 500,
 *   permitindo reenvio pelo PaymentBeta).
 */
export async function sendActivationLink(
  supabase: AdminClient,
  email: string,
  origin: string,
): Promise<void> {
  const redirectTo = `${origin}/definir-senha`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    throw new Error(`Erro ao enviar link de ativação: ${error.message}`);
  }
}
