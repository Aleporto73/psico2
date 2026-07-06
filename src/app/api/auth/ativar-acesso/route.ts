import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendActivationLink } from '@/utils/auth/activation';
import { setTemporaryPassword } from '@/utils/auth/temp-password';
import { MIGRATION_MODE, ACTIVATION_THROTTLE_MS } from '@/lib/migration';

type AdminClient = ReturnType<typeof createAdminClient>;

const ACTIVATION_EMAIL_PURPOSE = 'activation_email_request';
const ACTIVATION_DIRECT_PURPOSE = 'activation_direct';

// Throttle compartilhado: houve pedido do mesmo tipo dentro da janela atual?
async function hasRecentRequest(supabase: AdminClient, userId: string, purpose: string) {
  const since = new Date(Date.now() - ACTIVATION_THROTTLE_MS).toISOString();
  const { data, error } = await supabase
    .from('activation_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('purpose', purpose)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error checking activation throttle:', error);
  }
  return Boolean(data);
}

export async function POST(request: Request) {
  try {
    const { email, direct } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Informe o e-mail usado na compra.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminSupabase = createAdminClient();

    // 1. Check if email exists in public.profiles and is active
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('id, email, status, activation_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile during activation check:', error);
      return NextResponse.json(
        { message: 'Não foi possível verificar o e-mail. Tente novamente.' },
        { status: 500 }
      );
    }

    // 2. If profile does NOT exist, return clear error
    if (!profile) {
      return NextResponse.json(
        { message: 'Não encontramos esse e-mail. Verifique se digitou o mesmo e-mail usado na compra.' },
        { status: 404 }
      );
    }

    // 3. If profile exists but is blocked/inactive, do not pretend an email was sent.
    if (profile.status !== 'active') {
      return NextResponse.json(
        { message: 'Este acesso não está ativo. Entre em contato com o suporte.' },
        { status: 403 }
      );
    }

    // ── Caminho SEM e-mail (migração) ────────────────────────────────────
    // Durante a onda: gera senha temporária na hora e devolve na tela,
    // reusando a lógica do /admin/suporte. Não toca no /recover (fonte dos 429).
    if (direct) {
      if (!MIGRATION_MODE) {
        return NextResponse.json(
          { message: 'Ativação direta indisponível. Use o link por e-mail.' },
          { status: 403 }
        );
      }

      // Portão anti-takeover: só perfis ainda NÃO ativados. Depois que o cliente
      // ativa (activation_status='active'), este caminho recusa — impede que
      // quem saiba o e-mail sequestre uma conta já em uso.
      if (profile.activation_status === 'active') {
        return NextResponse.json(
          { message: 'Este acesso já foi ativado. Use "Esqueci minha senha" para entrar.' },
          { status: 409 }
        );
      }

      if (await hasRecentRequest(adminSupabase, profile.id, ACTIVATION_DIRECT_PURPOSE)) {
        return NextResponse.json(
          {
            message: 'Você acabou de gerar uma senha. Aguarde um instante antes de gerar outra.',
            throttled: true,
          },
          { status: 200 }
        );
      }

      let temporaryPassword: string;
      try {
        temporaryPassword = await setTemporaryPassword(adminSupabase, profile.id);
      } catch (directError) {
        console.error('Error setting direct temporary password:', directError);
        return NextResponse.json(
          { message: 'Não foi possível criar a senha agora. Tente o link por e-mail.' },
          { status: 502 }
        );
      }

      await adminSupabase.from('activation_tokens').insert({
        user_id: profile.id,
        email: normalizedEmail,
        token_hash: 'direct_temp_password_set',
        purpose: ACTIVATION_DIRECT_PURPOSE,
        expires_at: new Date(Date.now() + ACTIVATION_THROTTLE_MS).toISOString(),
      });

      await adminSupabase.from('admin_logs').insert({
        admin_id: null,
        action: 'senha temporária via migração (autoatendimento)',
        target_table: 'profiles',
        target_id: profile.id,
        metadata: {
          email: normalizedEmail,
          password_strategy: 'random_temporary',
          channel: 'ativar-acesso-direto',
        },
      });

      return NextResponse.json({
        message: 'Senha criada. Use-a para entrar agora.',
        email: normalizedEmail,
        temporaryPassword,
        loginUrl: `${new URL(request.url).origin}/login`,
      });
    }

    // ── Caminho por e-mail (original) ────────────────────────────────────
    if (await hasRecentRequest(adminSupabase, profile.id, ACTIVATION_EMAIL_PURPOSE)) {
      return NextResponse.json(
        {
          message: 'Se o e-mail estiver cadastrado, o link já foi solicitado. Aguarde alguns minutos e verifique spam ou promoções.',
          throttled: true,
        },
        { status: 200 }
      );
    }

    // Trigger the shared activation email flow.
    const origin = new URL(request.url).origin;
    try {
      await sendActivationLink(adminSupabase, normalizedEmail, origin);
    } catch (resetError: any) {
      console.error('Error triggering native reset password for activation:', resetError);

      const message = String(resetError?.message || '').toLowerCase();
      if (message.includes('rate') || message.includes('429') || message.includes('too many')) {
        return NextResponse.json(
          { message: 'Muitas solicitações de acesso em pouco tempo. Aguarde alguns minutos ou fale com o suporte para senha manual.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { message: 'Não foi possível enviar o link agora. Verifique a configuração de e-mail e tente novamente.' },
        { status: 502 }
      );
    }

    const { error: logError } = await adminSupabase.from('activation_tokens').insert({
      user_id: profile.id,
      email: normalizedEmail,
      token_hash: 'supabase_recovery_email_sent',
      purpose: ACTIVATION_EMAIL_PURPOSE,
      expires_at: new Date(Date.now() + ACTIVATION_THROTTLE_MS).toISOString(),
    });

    if (logError) {
      console.error('Error recording activation email request:', logError);
    }

    // Return success only after Supabase accepts the email request.
    return NextResponse.json(
      { message: 'Link enviado com sucesso.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Fatal error in ativar-acesso API:', err);
    return NextResponse.json(
      { message: 'Não foi possível enviar o link. Tente novamente.' },
      { status: 500 }
    );
  }
}
