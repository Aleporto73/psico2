import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendActivationLink } from '@/utils/auth/activation';

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
      .select('email, status')
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

    // 4. Trigger the shared activation email flow.
    const origin = new URL(request.url).origin;
    try {
      await sendActivationLink(adminSupabase, normalizedEmail, origin);
    } catch (resetError) {
      console.error('Error triggering native reset password for activation:', resetError);

      return NextResponse.json(
        { message: 'Não foi possível enviar o link agora. Verifique a configuração de e-mail e tente novamente.' },
        { status: 502 }
      );
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
