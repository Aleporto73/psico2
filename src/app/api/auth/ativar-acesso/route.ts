import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendActivationLink } from '@/utils/auth/activation';

const ACTIVATION_EMAIL_PURPOSE = 'activation_email_request';
const ACTIVATION_THROTTLE_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

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
      .select('id, email, status')
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

    const throttleSince = new Date(Date.now() - ACTIVATION_THROTTLE_MINUTES * 60 * 1000).toISOString();
    const { data: recentRequest, error: recentRequestError } = await adminSupabase
      .from('activation_tokens')
      .select('id, created_at')
      .eq('user_id', profile.id)
      .eq('purpose', ACTIVATION_EMAIL_PURPOSE)
      .gte('created_at', throttleSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRequestError) {
      console.error('Error checking activation email throttle:', recentRequestError);
    }

    if (recentRequest) {
      return NextResponse.json(
        {
          message: 'Se o e-mail estiver cadastrado, o link já foi solicitado. Aguarde alguns minutos e verifique spam ou promoções.',
          throttled: true,
        },
        { status: 200 }
      );
    }

    // 4. Trigger the shared activation email flow.
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
      expires_at: new Date(Date.now() + ACTIVATION_THROTTLE_MINUTES * 60 * 1000).toISOString(),
    });

    if (logError) {
      console.error('Error recording activation email request:', logError);
    }

    // 5. Return success only after Supabase accepts the email request.
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
